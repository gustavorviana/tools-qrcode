/*
 * Legenda das molduras — regras puras de layout e desenho do texto que fica na
 * faixa abaixo do QR. Extraído da antiga classe base `Frame` para que as
 * molduras fiquem finas: quem quer legenda compõe estas funções. Sem DOM.
 */

/** Legenda padrão quando nenhuma é informada. */
export const DEFAULT_CAPTION = 'ESCANEIE';

/* Parâmetros da legenda (em unidades de módulo, salvo indicação). */
const CAPTION_PAD = 2;        // respiro vertical acima e abaixo do texto
const CAPTION_PAD_X = 2;      // respiro lateral em cada lado
const CAPTION_BASE_FONT = 3;  // fonte quando o texto cabe folgado
const CAPTION_MIN_FONT = 1.9; // menor fonte antes de aceitar overflow
const CAPTION_LINE_GAP = 1.2; // espaçamento entre linhas (múltiplo da fonte)
const CAPTION_LETTER = 0.3;   // letter-spacing
const CHAR_ADV = 0.62;        // avanço médio de glifo relativo à fonte (bold sans)

export const escXml = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]));

/** Retângulo (arredondado) — helper de desenho compartilhado com as molduras. */
export const rrect = (x: number, y: number, w: number, h: number, r: number, fill: string): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"/>`;

/** Legenda resolvida: linhas, tamanho de fonte e altura de faixa necessários. */
export interface CaptionLayout {
  lines: string[];
  fontSize: number;
  height: number;
}

/**
 * Quebra o texto em 2 linhas o mais equilibradas possível, comparando a largura
 * real das linhas (aprox. pelo nº de caracteres) — não só a contagem de palavras.
 * Considera cortar em cada espaço e também uma quebra "dura" no meio; escolhe a
 * que deixa a linha mais larga menor. Cortar no meio de uma palavra leva uma
 * leve penalidade, então o espaço vence quando o equilíbrio é parecido — mas uma
 * palavra que domina (ex.: "OI TEXTOENORMEJUNTO") é partida em vez de estourar.
 */
export const splitTwoLines = (s0: string): string[] => {
  const s = s0.trim();
  if (s.length <= 1) return [s];
  const opts: Array<{ a: string; b: string; cut: boolean }> = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ' ') {
      const a = s.slice(0, i).trim(), b = s.slice(i + 1).trim();
      if (a && b) opts.push({ a, b, cut: false });
    }
  }
  const mid = Math.round(s.length / 2);
  const a = s.slice(0, mid).trim(), b = s.slice(mid).trim();
  if (a && b) opts.push({ a, b, cut: s[mid - 1] !== ' ' && s[mid] !== ' ' });
  if (!opts.length) return [s];
  const score = (o: { a: string; b: string; cut: boolean }): number =>
    Math.max(o.a.length, o.b.length) + (o.cut ? 2 : 0);
  const best = opts.reduce((m, o) => (score(o) < score(m) ? o : m));
  return [best.a, best.b];
};

/**
 * Decide como a legenda cabe na largura disponível: mantém 1 linha na fonte
 * base se couber; senão quebra em 2 linhas (aumentando a faixa) e, se ainda
 * for larga, reduz a fonte. Uma palavra única que caiba reduzindo a fonte
 * fica em 1 linha; se nem assim couber, é partida no meio dos caracteres.
 */
export function captionLayout(caption: string, unit: number, size: number): CaptionLayout {
  const cap = (caption || '').trim() || DEFAULT_CAPTION;
  const maxW = size - 2 * CAPTION_PAD_X * unit;
  const ls = CAPTION_LETTER * unit;
  const base = CAPTION_BASE_FONT * unit;
  const min = CAPTION_MIN_FONT * unit;
  const widthAt = (s: string, fs: number): number => s.length * (CHAR_ADV * fs + ls);
  // Maior fonte (entre `min` e `base`) que faz `s` caber em `maxW`.
  const fitFont = (s: string): number => {
    if (widthAt(s, base) <= maxW) return base;
    return Math.max(min, Math.min(base, (maxW / s.length - ls) / CHAR_ADV));
  };
  const heightOf = (lines: string[], fs: number): number =>
    2 * CAPTION_PAD * unit + fs + (lines.length - 1) * fs * CAPTION_LINE_GAP;

  if (widthAt(cap, base) <= maxW) return { lines: [cap], fontSize: base, height: heightOf([cap], base) };

  // Palavra única (sem espaços) que ainda caiba reduzindo a fonte fica em 1
  // linha — evita partir a palavra à toa. Só quebra se nem no menor tamanho couber.
  if (!/\s/.test(cap) && widthAt(cap, min) <= maxW) {
    const fs = fitFont(cap);
    return { lines: [cap], fontSize: fs, height: heightOf([cap], fs) };
  }

  const two = splitTwoLines(cap);
  if (two.length === 2) {
    const widest = two[0].length >= two[1].length ? two[0] : two[1];
    const fs = fitFont(widest);
    return { lines: two, fontSize: fs, height: heightOf(two, fs) };
  }
  const fs = fitFont(cap);
  return { lines: [cap], fontSize: fs, height: heightOf([cap], fs) };
}

/** Altura da faixa de legenda, adaptada ao texto. */
export function captionHeight(caption: string, unit: number, size: number): number {
  return captionLayout(caption, unit, size).height;
}

/** Fundo da faixa de legenda (área abaixo do QR, de `size` a `size + capH`). */
export function captionBg(size: number, capH: number, bg: string): string {
  return rrect(0, size, size, capH, 0, bg);
}

/** Texto da legenda (1 ou 2 linhas), centralizado na faixa, com a cor informada. */
export function captionText(caption: string, size: number, capH: number, unit: number, fill: string): string {
  const { lines, fontSize } = captionLayout(caption, unit, size);
  const cx = size / 2;
  const gap = fontSize * CAPTION_LINE_GAP;
  // `y` absoluto por linha (dy relativo não é respeitado por todos os renderers).
  const firstY = size + capH / 2 - ((lines.length - 1) / 2) * gap;
  const tspans = lines.map((ln, i) =>
    `<tspan x="${cx}" y="${firstY + i * gap}">${escXml(ln)}</tspan>`).join('');
  return `<text font-family="system-ui,Segoe UI,Arial,sans-serif"`
    + ` font-size="${fontSize}" font-weight="700" letter-spacing="${CAPTION_LETTER * unit}" text-anchor="middle"`
    + ` dominant-baseline="central" fill="${fill}">${tspans}</text>`;
}
