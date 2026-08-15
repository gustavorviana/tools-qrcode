/*
 * Molduras — cada estilo é uma classe Frame que sabe se dimensionar e embutir o
 * QR já gerado (QrRender) dentro do próprio SVG. A moldura trata o QR como
 * caixa-preta: só o posiciona (SVG aninhado) e desenha seu estilo em volta.
 * Adicionar uma moldura = criar a classe e registrá-la em FRAME_CTORS.
 */
import type { FrameStyle, QrRender, FramedSvg } from './types';
import { DEFAULT_CAPTION, captionHeight as bandHeight, captionBg, captionText, rrect } from './caption';

// Reexporta para quem importava daqui (ex.: testes) manter o caminho.
export { splitTwoLines } from './caption';

/** Cores herdadas do QR, entregues à moldura. */
export interface FrameColors {
  readonly fg: string;
  readonly bg: string;
}

/** Envolve os elementos num SVG externo já dimensionado. */
const wrap = (W: number, H: number, ...children: string[]): FramedSvg => ({
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`
    + children.join('') + '</svg>',
  width: W,
  height: H,
});

/**
 * Posiciona o QR dentro do SVG externo injetando `x`/`y` na sua raiz `<svg`.
 * O x/y entram no INÍCIO da tag para que o `width`/`height` do SVG externo
 * continuem sendo os primeiros do documento (o rasterizeSVG força a resolução
 * no primeiro `<svg>` — que deve ser o externo, não o QR aninhado).
 */
const placeQr = (svg: string, x: number, y: number): string =>
  svg.replace(/<svg\b/i, `<svg x="${x}" y="${y}"`);

/** Uma moldura que embute o QR (QrRender) no próprio SVG. */
export abstract class Frame {
  /** @param caption texto exibido nas molduras com legenda. */
  constructor(readonly caption: string = DEFAULT_CAPTION) {}

  /** Embute o QR e devolve o SVG final + dimensões externas. */
  abstract apply(qr: QrRender, colors: FrameColors): FramedSvg;

  /** Altura da faixa de legenda para um QR de lado `size` (0 = sem legenda). */
  captionHeight(size: number): number {
    return bandHeight(this.caption, size / 34, size);
  }
}

/** Sem moldura nem legenda: o QR é o próprio resultado. */
export class NoneFrame extends Frame {
  override captionHeight(): number { return 0; }
  apply(qr: QrRender): FramedSvg {
    return { svg: qr.svg, width: qr.size, height: qr.size };
  }
}

/** Colchetes nos quatro cantos + legenda. */
export class CornersFrame extends Frame {
  apply(qr: QrRender, { fg, bg }: FrameColors): FramedSvg {
    const size = qr.size, unit = size / 34;
    const capH = this.captionHeight(size);
    const m = 0.9 * unit, B = size - m, L = 6 * unit;
    const br = (d: string): string =>
      `<path d="${d}" fill="none" stroke="${fg}" stroke-width="${1.3 * unit}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return wrap(size, size + capH,
      placeQr(qr.svg, 0, 0),
      captionBg(size, capH, bg),
      br(`M ${m} ${m + L} L ${m} ${m} L ${m + L} ${m}`),
      br(`M ${B - L} ${m} L ${B} ${m} L ${B} ${m + L}`),
      br(`M ${m} ${B - L} L ${m} ${B} L ${m + L} ${B}`),
      br(`M ${B - L} ${B} L ${B} ${B} L ${B} ${B - L}`),
      captionText(this.caption, size, capH, unit, fg),
    );
  }
}

/** Borda arredondada envolvendo QR + legenda. */
export class BorderFrame extends Frame {
  apply(qr: QrRender, { fg, bg }: FrameColors): FramedSvg {
    const size = qr.size, unit = size / 34;
    const capH = this.captionHeight(size);
    const H = size + capH;
    const border = `<rect x="${0.6 * unit}" y="${0.6 * unit}" width="${size - 1.2 * unit}" height="${H - 1.2 * unit}"`
      + ` rx="${3 * unit}" fill="none" stroke="${fg}" stroke-width="${0.7 * unit}"/>`;
    return wrap(size, H,
      placeQr(qr.svg, 0, 0),
      captionBg(size, capH, bg),
      border,
      captionText(this.caption, size, capH, unit, fg),
    );
  }
}

/** Faixa preenchida com a legenda em cor invertida. */
export class LabelFrame extends Frame {
  apply(qr: QrRender, { fg, bg }: FrameColors): FramedSvg {
    const size = qr.size, unit = size / 34;
    const capH = this.captionHeight(size);
    // A pílula tem altura `capH - 0.6u`; deslocá-la 0.3u para baixo a centraliza
    // na faixa, alinhando seu centro ao do texto (que é centrado na banda).
    return wrap(size, size + capH,
      placeQr(qr.svg, 0, 0),
      captionBg(size, capH, bg),
      rrect(0.6 * unit, size + 0.3 * unit, size - 1.2 * unit, capH - 0.6 * unit, 2.5 * unit, fg),
      captionText(this.caption, size, capH, unit, bg),
    );
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
