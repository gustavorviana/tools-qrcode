/*
 * qrcode.js — Gerador de QR Code (ISO/IEC 18004), implementado do zero.
 * Modo byte/UTF-8, correção Reed-Solomon, seleção automática de versão (1-40) e máscara.
 * Sem dependências.
 */

const ECC = {
    LOW:      { ordinal: 0, formatBits: 1 },
    MEDIUM:   { ordinal: 1, formatBits: 0 },
    QUARTILE: { ordinal: 2, formatBits: 3 },
    HIGH:     { ordinal: 3, formatBits: 2 },
  };

  // Nº de codewords de correção por bloco  [nível][versão]
  const ECC_CODEWORDS_PER_BLOCK = [
    [-1, 7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
    [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  ];
  // Nº de blocos de correção de erro  [nível][versão]
  const NUM_EC_BLOCKS = [
    [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
    [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
    [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
    [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81],
  ];

  function getBit(x, i) { return ((x >>> i) & 1) !== 0; }

  function getNumRawDataModules(ver) {
    let result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  function getNumDataCodewords(ver, ecl) {
    return Math.floor(getNumRawDataModules(ver) / 8)
      - ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] * NUM_EC_BLOCKS[ecl.ordinal][ver];
  }

  function rsMultiply(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }

  function rsComputeDivisor(degree) {
    const result = [];
    for (let i = 0; i < degree - 1; i++) result.push(0);
    result.push(1);
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < result.length; j++) {
        result[j] = rsMultiply(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = rsMultiply(root, 0x02);
    }
    return result;
  }

  function rsComputeRemainder(data, divisor) {
    const result = divisor.map(() => 0);
    for (const b of data) {
      const factor = b ^ result.shift();
      result.push(0);
      divisor.forEach((coef, i) => { result[i] ^= rsMultiply(coef, factor); });
    }
    return result;
  }

  function appendBits(val, len, bb) {
    for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
  }

  // Constrói a matriz do QR
  function QrMatrix(version, ecl, dataCodewords) {
    this.version = version;
    this.ecl = ecl;
    this.size = version * 4 + 17;
    const size = this.size;
    this.modules = [];
    this.isFunction = [];
    for (let y = 0; y < size; y++) {
      this.modules.push(new Array(size).fill(false));
      this.isFunction.push(new Array(size).fill(false));
    }
    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(Array.from(dataCodewords));
    this.drawCodewords(allCodewords);

    // Escolhe a melhor máscara
    let minPenalty = Infinity, bestMask = 0;
    for (let m = 0; m < 8; m++) {
      this.applyMask(m);
      this.drawFormatBits(m);
      const p = this.getPenaltyScore();
      if (p < minPenalty) { minPenalty = p; bestMask = m; }
      this.applyMask(m); // desfaz (XOR duplo)
    }
    this.mask = bestMask;
    this.applyMask(bestMask);
    this.drawFormatBits(bestMask);
  }

  QrMatrix.prototype.setFunctionModule = function (x, y, isDark) {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  };

  QrMatrix.prototype.drawFunctionPatterns = function () {
    const size = this.size;
    for (let i = 0; i < size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(size - 4, 3);
    this.drawFinderPattern(3, size - 4);

    const pos = this.getAlignmentPatternPositions();
    const n = pos.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)))
          this.drawAlignmentPattern(pos[i], pos[j]);
      }
    }
    this.drawFormatBits(0);
    this.drawVersion();
  };

  QrMatrix.prototype.drawFinderPattern = function (x, y) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size)
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
      }
    }
  };

  QrMatrix.prototype.drawAlignmentPattern = function (x, y) {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  };

  QrMatrix.prototype.getAlignmentPatternPositions = function () {
    if (this.version === 1) return [];
    const numAlign = Math.floor(this.version / 7) + 2;
    const step = (this.version === 32) ? 26
      : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const result = [6];
    for (let p = this.size - 7; result.length < numAlign; p -= step)
      result.splice(1, 0, p);
    return result;
  };

  QrMatrix.prototype.drawFormatBits = function (mask) {
    const data = (this.ecl.formatBits << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const size = this.size;
    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, getBit(bits, i));
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i++) this.setFunctionModule(size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) this.setFunctionModule(8, size - 15 + i, getBit(bits, i));
    this.setFunctionModule(8, size - 8, true);
  };

  QrMatrix.prototype.drawVersion = function () {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = this.size - 11 + (i % 3), b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  };

  QrMatrix.prototype.addEccAndInterleave = function (data) {
    const ver = this.version, ecl = this.ecl;
    const numBlocks = NUM_EC_BLOCKS[ecl.ordinal][ver];
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
    const rawCodewords = Math.floor(getNumRawDataModules(ver) / 8);
    const numShortBlocks = numBlocks - rawCodewords % numBlocks;
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);

    const blocks = [];
    const rsDiv = rsComputeDivisor(blockEccLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
      k += dat.length;
      const ecc = rsComputeRemainder(dat, rsDiv);
      if (i < numShortBlocks) dat.push(0);
      blocks.push(dat.concat(ecc));
    }

    const result = [];
    for (let i = 0; i < blocks[0].length; i++) {
      blocks.forEach((block, j) => {
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks)
          result.push(block[i]);
      });
    }
    return result;
  };

  QrMatrix.prototype.drawCodewords = function (data) {
    const size = this.size;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  };

  QrMatrix.prototype.applyMask = function (mask) {
    const size = this.size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let invert;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = (x * y) % 2 + (x * y) % 3 === 0; break;
          case 6: invert = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
          case 7: invert = ((x + y) % 2 + (x * y) % 3) % 2 === 0; break;
        }
        if (!this.isFunction[y][x] && invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  };

  QrMatrix.prototype.getPenaltyScore = function () {
    const size = this.size, mod = this.modules;
    let result = 0;
    const N1 = 3, N2 = 3, N3 = 40, N4 = 10;

    // Linhas
    for (let y = 0; y < size; y++) {
      let runColor = false, runX = 0;
      const hist = [0, 0, 0, 0, 0, 0, 0];
      for (let x = 0; x < size; x++) {
        if (mod[y][x] === runColor) {
          runX++;
          if (runX === 5) result += N1;
          else if (runX > 5) result++;
        } else {
          this.finderAddHistory(runX, hist);
          if (!runColor) result += this.finderCount(hist) * N3;
          runColor = mod[y][x]; runX = 1;
        }
      }
      result += this.finderTerminate(runColor, runX, hist) * N3;
    }
    // Colunas
    for (let x = 0; x < size; x++) {
      let runColor = false, runY = 0;
      const hist = [0, 0, 0, 0, 0, 0, 0];
      for (let y = 0; y < size; y++) {
        if (mod[y][x] === runColor) {
          runY++;
          if (runY === 5) result += N1;
          else if (runY > 5) result++;
        } else {
          this.finderAddHistory(runY, hist);
          if (!runColor) result += this.finderCount(hist) * N3;
          runColor = mod[y][x]; runY = 1;
        }
      }
      result += this.finderTerminate(runColor, runY, hist) * N3;
    }
    // Blocos 2x2
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = mod[y][x];
        if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1])
          result += N2;
      }
    }
    // Balanceamento claro/escuro
    let dark = 0;
    for (const row of mod) for (const v of row) if (v) dark++;
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * N4;
    return result;
  };

  QrMatrix.prototype.finderAddHistory = function (currentRunLength, hist) {
    if (hist[0] === 0) currentRunLength += this.size;
    hist.pop();
    hist.unshift(currentRunLength);
  };
  QrMatrix.prototype.finderCount = function (h) {
    const n = h[1];
    const core = n > 0 && h[2] === n && h[3] === n * 3 && h[4] === n && h[5] === n;
    return (core && h[0] >= n * 4 && h[6] >= n ? 1 : 0)
      + (core && h[6] >= n * 4 && h[0] >= n ? 1 : 0);
  };
  QrMatrix.prototype.finderTerminate = function (curColor, curLen, hist) {
    if (curColor) { this.finderAddHistory(curLen, hist); curLen = 0; }
    curLen += this.size;
    this.finderAddHistory(curLen, hist);
    return this.finderCount(hist);
  };

  // API pública -------------------------------------------------------
  function encode(text, eclName) {
    const ecl0 = ECC[eclName] || ECC.MEDIUM;
    const dataBytes = Array.from(new TextEncoder().encode(text));

    let version, ecl = ecl0, usedBits, capacityBits;
    for (version = 1; ; version++) {
      capacityBits = getNumDataCodewords(version, ecl) * 8;
      const ccBits = version <= 9 ? 8 : 16;
      usedBits = 4 + ccBits + dataBytes.length * 8;
      if (usedBits <= capacityBits) break;
      if (version >= 40) throw new Error("Conteúdo grande demais para um QR Code.");
    }
    // Aumenta o nível de correção se couber sem trocar de versão
    for (const cand of [ECC.MEDIUM, ECC.QUARTILE, ECC.HIGH]) {
      if (usedBits <= getNumDataCodewords(version, cand) * 8 && cand.ordinal > ecl.ordinal)
        ecl = cand;
    }

    const bb = [];
    appendBits(4, 4, bb); // modo byte
    appendBits(dataBytes.length, version <= 9 ? 8 : 16, bb);
    for (const b of dataBytes) appendBits(b, 8, bb);

    const dataCap = getNumDataCodewords(version, ecl) * 8;
    appendBits(0, Math.min(4, dataCap - bb.length), bb);
    appendBits(0, (8 - bb.length % 8) % 8, bb);
    for (let pad = 0xEC; bb.length < dataCap; pad ^= 0xEC ^ 0x11)
      appendBits(pad, 8, bb);

    const dataCodewords = new Uint8Array(bb.length >>> 3);
    bb.forEach((bit, i) => { dataCodewords[i >>> 3] |= bit << (7 - (i & 7)); });

    const m = new QrMatrix(version, ecl, dataCodewords);
    return { size: m.size, modules: m.modules, version, ecl: eclNameFromOrdinal(ecl.ordinal) };
  }

  function eclNameFromOrdinal(o) { return ["L", "M", "Q", "H"][o]; }

export { encode };
