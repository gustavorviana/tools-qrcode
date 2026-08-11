/*
 * Molduras — cada estilo é uma classe Frame que carrega sua própria legenda e
 * sabe quanto espaço reserva e como se desenhar sobre o QR. Adicionar uma
 * moldura = criar a classe e registrá-la em FRAME_CTORS; o QRDesigner apenas
 * renderiza a instância recebida, sem cadeias de `if`/`switch`.
 */
import type { FrameStyle } from './types';

/** Contexto geométrico/estético entregue a cada moldura para gerar seu markup. */
export interface FrameContext {
  /** Lado do QR (área quadrada), em unidades lógicas. */
  readonly size: number;
  /** Altura da faixa de legenda (0 se a moldura não tiver legenda). */
  readonly captionHeight: number;
  /** Unidade de escala (~1 módulo). */
  readonly unit: number;
  /** Cor dos módulos/traços. */
  readonly fg: string;
  /** Cor de fundo. */
  readonly bg: string;
}

const escXml = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]));

const rrect = (x: number, y: number, w: number, h: number, r: number, fill: string): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"/>`;

/** Legenda padrão quando nenhuma é informada. */
const DEFAULT_CAPTION = 'ESCANEIE';

/* Parâmetros da legenda (em unidades de módulo, salvo indicação). */
const CAPTION_PAD = 2;        // respiro vertical acima e abaixo do texto
const CAPTION_PAD_X = 2;      // respiro lateral em cada lado
const CAPTION_BASE_FONT = 3;  // fonte quando o texto cabe folgado
const CAPTION_MIN_FONT = 1.9; // menor fonte antes de aceitar overflow
const CAPTION_LINE_GAP = 1.2; // espaçamento entre linhas (múltiplo da fonte)
const CAPTION_LETTER = 0.3;   // letter-spacing
const CHAR_ADV = 0.62;        // avanço médio de glifo relativo à fonte (bold sans)

/** Legenda resolvida: linhas, tamanho de fonte e altura de faixa necessários. */
interface CaptionLayout {
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
const splitTwoLines = (s0: string): string[] => {
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

/** Uma moldura desenhável sobre o QR, portadora da própria legenda. */
export abstract class Frame {
  /** @param caption texto exibido nas molduras com legenda. */
  constructor(readonly caption: string = DEFAULT_CAPTION) {}

  /** Markup SVG da moldura, injetado sobre o QR da lib. */
  abstract render(ctx: FrameContext): string;

  /** Altura da faixa de legenda, adaptada ao texto (0 = sem legenda). */
  captionHeight(unit: number, size: number): number {
    return this.captionLayout(unit, size).height;
  }

  /**
   * Decide como a legenda cabe na largura disponível: mantém 1 linha na fonte
   * base se couber; senão quebra em 2 linhas (aumentando a faixa) e, se ainda
   * for larga, reduz a fonte. Uma palavra única que caiba reduzindo a fonte
   * fica em 1 linha; se nem assim couber, é partida no meio dos caracteres.
   */
  protected captionLayout(unit: number, size: number): CaptionLayout {
    const cap = (this.caption || '').trim() || DEFAULT_CAPTION;
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

  /** Fundo da faixa de legenda (área abaixo do QR). */
  protected captionBg(ctx: FrameContext): string {
    return rrect(0, ctx.size, ctx.size, ctx.captionHeight, 0, ctx.bg);
  }

  /** Texto da legenda (1 ou 2 linhas), centralizado, com a cor informada. */
  protected captionText(ctx: FrameContext, fill: string): string {
    const { size, captionHeight, unit } = ctx;
    const { lines, fontSize } = this.captionLayout(unit, size);
    const cx = size / 2;
    const gap = fontSize * CAPTION_LINE_GAP;
    // `y` absoluto por linha (dy relativo não é respeitado por todos os renderers).
    const firstY = size + captionHeight / 2 - ((lines.length - 1) / 2) * gap;
    const tspans = lines.map((ln, i) =>
      `<tspan x="${cx}" y="${firstY + i * gap}">${escXml(ln)}</tspan>`).join('');
    return `<text font-family="system-ui,Segoe UI,Arial,sans-serif"`
      + ` font-size="${fontSize}" font-weight="700" letter-spacing="${CAPTION_LETTER * unit}" text-anchor="middle"`
      + ` dominant-baseline="central" fill="${fill}">${tspans}</text>`;
  }
}

/** Sem moldura nem legenda. */
export class NoneFrame extends Frame {
  override captionHeight(): number { return 0; }
  render(): string { return ''; }
}

/** Colchetes nos quatro cantos + legenda. */
export class CornersFrame extends Frame {
  render(ctx: FrameContext): string {
    const { size: W, unit, fg } = ctx;
    const m = 0.9 * unit, B = W - m, L = 6 * unit;
    const br = (d: string): string =>
      `<path d="${d}" fill="none" stroke="${fg}" stroke-width="${1.3 * unit}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return this.captionBg(ctx)
      + br(`M ${m} ${m + L} L ${m} ${m} L ${m + L} ${m}`)
      + br(`M ${B - L} ${m} L ${B} ${m} L ${B} ${m + L}`)
      + br(`M ${m} ${B - L} L ${m} ${B} L ${m + L} ${B}`)
      + br(`M ${B - L} ${B} L ${B} ${B} L ${B} ${B - L}`)
      + this.captionText(ctx, fg);
  }
}

/** Borda arredondada envolvendo QR + legenda. */
export class BorderFrame extends Frame {
  render(ctx: FrameContext): string {
    const { size: W, captionHeight, unit, fg } = ctx;
    const H = W + captionHeight;
    return this.captionBg(ctx)
      + `<rect x="${0.6 * unit}" y="${0.6 * unit}" width="${W - 1.2 * unit}" height="${H - 1.2 * unit}"`
      + ` rx="${3 * unit}" fill="none" stroke="${fg}" stroke-width="${0.7 * unit}"/>`
      + this.captionText(ctx, fg);
  }
}

/** Faixa preenchida com a legenda em cor invertida. */
export class LabelFrame extends Frame {
  render(ctx: FrameContext): string {
    const { size: W, captionHeight: capH, unit, fg } = ctx;
    // A pílula tem altura `capH - 0.6u`; deslocá-la 0.3u para baixo a centraliza
    // na faixa, alinhando seu centro ao do texto (que é centrado na banda).
    return this.captionBg(ctx)
      + rrect(0.6 * unit, W + 0.3 * unit, W - 1.2 * unit, capH - 0.6 * unit, 2.5 * unit, fg)
      + this.captionText(ctx, ctx.bg);
  }
}

/** Construtores de moldura, indexados pela chave usada na UI/serialização. */
const FRAME_CTORS: Record<FrameStyle, new (caption?: string) => Frame> = {
  none: NoneFrame,
  corners: CornersFrame,
  border: BorderFrame,
  label: LabelFrame,
};

/** Cria a moldura de um estilo já inicializada com a legenda. */
export const createFrame = (style: FrameStyle, caption?: string): Frame =>
  new FRAME_CTORS[style](caption);
