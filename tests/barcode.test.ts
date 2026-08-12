import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { configureBarcodeReader, decodeBarcode, type Pixels } from '../src/qr/barcode';

// No Node não há fetch de arquivo local, então injetamos o binário WASM direto.
beforeAll(() => {
  const wasm = readFileSync('node_modules/zxing-wasm/dist/reader/zxing_reader.wasm');
  configureBarcodeReader({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) });
});

/*
 * Geramos um Code 39 à mão (simbologia simples e determinística) para testar o
 * decode de verdade contra o zxing-wasm.
 * Cada caractere = 9 elementos (barra/espaço alternados, começando/terminando
 * em barra), com 3 elementos largos; entre caracteres, um espaço estreito.
 */
const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw', 'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw', 'E': 'wnnnwwnnn',
  'F': 'nnwnwwnnn', 'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn', 'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn',
  'K': 'wnnnnnnww', 'L': 'nnwnnnnww', 'M': 'wnwnnnnwn', 'N': 'nnnnwnnww', 'O': 'wnnnwnnwn',
  'P': 'nnwnwnnwn', 'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn', 'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn',
  'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw', 'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw', 'Y': 'wwnnwnnnn',
  'Z': 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn',
  '*': 'nwnnwnwnn',
};

/** Renderiza uma string em pixels RGBA de um Code 39 (barra = preto). */
function code39(text: string, modulePx = 3, height = 50, quiet = 10): Pixels {
  const narrow = 1, wide = 3;
  const modules: boolean[] = []; // true = escuro
  const pushEl = (pattern: string): void => {
    for (let i = 0; i < pattern.length; i++) {
      const width = pattern[i] === 'w' ? wide : narrow;
      const dark = i % 2 === 0; // posições pares são barras
      for (let k = 0; k < width; k++) modules.push(dark);
    }
  };
  for (const ch of '*' + text + '*') {
    pushEl(CODE39[ch]);
    modules.push(false); // espaço estreito entre caracteres
  }
  const cols = [
    ...Array(quiet).fill(false),
    ...modules,
    ...Array(quiet).fill(false),
  ];
  const width = cols.length * modulePx;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let x = 0; x < width; x++) {
    if (!cols[Math.floor(x / modulePx)]) continue; // claro → deixa branco
    for (let y = 0; y < height; y++) {
      const o = (y * width + x) * 4;
      data[o] = 0; data[o + 1] = 0; data[o + 2] = 0; // preto (alpha já 255)
    }
  }
  return { data, width, height };
}

describe('decodeBarcode', () => {
  it('lê um Code 39 gerado (round-trip)', async () => {
    expect(await decodeBarcode(code39('TEST-123'), true)).toBe('TEST-123');
  });

  it('lê outro Code 39 (letras e dígitos)', async () => {
    expect(await decodeBarcode(code39('QRUTILS42'), true)).toBe('QRUTILS42');
  });

  it('lê um código só com números', async () => {
    expect(await decodeBarcode(code39('1234567890'), true)).toBe('1234567890');
  });

  it('devolve null para uma imagem em branco (sem código)', async () => {
    const width = 200, height = 80;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    expect(await decodeBarcode({ data, width, height }, true)).toBeNull();
  });

  it('não confunde ruído leve com código (retorna null)', async () => {
    const width = 160, height = 60;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      const v = (i / 4) % 7 < 3 ? 210 : 245; // faixas claras, sem padrão de barras
      data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
    }
    expect(await decodeBarcode({ data, width, height }, true)).toBeNull();
  });
});
