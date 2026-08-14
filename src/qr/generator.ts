/*
 * QrGenerator — gera SOMENTE o QR (sem moldura). Codifica o conteúdo com a
 * qr-code-styling e então despacha o desenho por um lookup no registro de formas
 * (./shapes): corpo `backend:'lib'` é desenhado pela própria lib; corpo
 * `backend:'custom'` é desenhado pelo nosso renderer a partir da matriz. A saída
 * é sempre um QrRender { svg, size, moduleCount } que a moldura embute.
 */
import QRCodeStyling from 'qr-code-styling';
import type { Options, ErrorCorrectionLevel, QRCode, ShapeType, CornerSquareType, CornerDotType } from 'qr-code-styling';
import type { ModuleShape, EyeFrameShape, EyeCenterShape, Ecl, QrColors, QrRender } from './types';
import { BODY, LIB_EYE_FRAME, LIB_EYE_CENTER, centerNeedsCustom } from './shapes';
import { extractMatrix } from './matrix';
import { renderCustomQr } from './customRenderer';

/** Espaço de coordenadas lógico do QR (o SVG é vetorial; isto é só a escala). */
export const BASE = 1000;
/** Escala nominal da moldura/zona de silêncio (proporção fixa, ~1 módulo). */
export const UNIT = BASE / 34;

const ECL_LETTER: Record<Ecl, ErrorCorrectionLevel> = {
  LOW: 'L', MEDIUM: 'M', QUARTILE: 'Q', HIGH: 'H',
};

/** Estilo mínimo p/ codificar quando o corpo é custom (o SVG da lib é ignorado). */
const ENCODE_STYLE = { dot: 'square', cornerSquare: 'square', cornerDot: 'square' } as const;

/** Metadados do último QR gerado, para exibição. */
export interface QrInfo {
  moduleCount: number;
  version: number;
  ecl: Ecl;
}

/** Guarda o estado do QR e gera o SVG do código (sem moldura). */
export class QrGenerator {
  private _fg = '#0f172a';
  private _bg = '#ffffff';
  private _eyeFrame: string | undefined;
  private _eyeCenter: string | undefined;
  private _shape: ModuleShape = 'solid';
  private _eyeFrameShape: EyeFrameShape = 'auto';
  private _eyeCenterShape: EyeCenterShape = 'auto';
  private _bgTransparent = false;
  private _qrShape: ShapeType = 'square';
  private _logo: string | null = null;
  private _text = '';
  private _ecl: Ecl = 'MEDIUM';
  private _moduleCount = 0;

  /** Conteúdo a codificar. */
  get text(): string { return this._text; }
  set text(v: string) { this._text = v; }

  /** Nível de correção de erro. */
  get ecl(): Ecl { return this._ecl; }
  set ecl(v: Ecl) { this._ecl = v; }

  /** Cores do QR. Atribua qualquer subconjunto; `eyeFrame`/`eyeCenter` aceitam `undefined` (herda `fg`). */
  get colors(): QrColors {
    return { fg: this._fg, bg: this._bg, eyeFrame: this._eyeFrame, eyeCenter: this._eyeCenter };
  }
  set colors(c: Partial<QrColors>) {
    if (c.fg !== undefined) this._fg = c.fg;
    if (c.bg !== undefined) this._bg = c.bg;
    if ('eyeFrame' in c) this._eyeFrame = c.eyeFrame;
    if ('eyeCenter' in c) this._eyeCenter = c.eyeCenter;
  }

  /** Forma dos módulos. */
  get shape(): ModuleShape { return this._shape; }
  set shape(v: ModuleShape) { this._shape = v; }

  /** Forma da moldura do olho (`auto` herda do corpo). */
  get eyeFrameShape(): EyeFrameShape { return this._eyeFrameShape; }
  set eyeFrameShape(v: EyeFrameShape) { this._eyeFrameShape = v; }

  /** Forma do centro do olho (`auto` herda do corpo). */
  get eyeCenterShape(): EyeCenterShape { return this._eyeCenterShape; }
  set eyeCenterShape(v: EyeCenterShape) { this._eyeCenterShape = v; }

  /** Fundo transparente (sem retângulo de fundo; PNG com alfa). */
  get bgTransparent(): boolean { return this._bgTransparent; }
  set bgTransparent(v: boolean) { this._bgTransparent = v; }

  /** Contorno geral do QR (quadrado ou círculo) — só vale no backend lib. */
  get qrShape(): ShapeType { return this._qrShape; }
  set qrShape(v: ShapeType) { this._qrShape = v; }

  /** Logotipo central (data URL) ou `null` para remover. */
  get logo(): string | null { return this._logo; }
  set logo(v: string | null) { this._logo = v; }

  get hasLogo(): boolean { return this._logo !== null; }
  get ready(): boolean { return this._text.length > 0; }

  /** Metadados do último QR gerado (contagem de módulos vem da própria lib). */
  get info(): QrInfo {
    return { moduleCount: this._moduleCount, version: this._moduleCount ? (this._moduleCount - 17) / 4 : 0, ecl: this._ecl };
  }

  /** Gera o SVG do QR (sem moldura) e devolve o markup + tamanho + nº de módulos. */
  async generate(): Promise<QrRender> {
    const fg = this._fg, bg = this._bg;
    const def = BODY.get(this._shape);
    // Backend custom se o corpo já é custom OU se o centro do olho é uma forma
    // de ícone que a lib não desenha (senão viraria quadrado).
    const custom = def?.backend === 'custom' || centerNeedsCustom(this._eyeCenterShape);
    const libStyle = def?.lib ?? ENCODE_STYLE;
    const eyeFrameColor = this._eyeFrame ?? fg;
    const eyeCenterColor = this._eyeCenter ?? fg;

    // No corpo custom codificamos em quadrado (sem `roundSize`) para a matriz sair
    // padrão; o contorno circular só faz sentido no desenho da própria lib.
    const qrShape: ShapeType = custom ? 'square' : this._qrShape;
    const margin = (qrShape === 'circle' ? 3.5 : 4) * UNIT;

    // Olhos → tipos da lib (só usados no backend lib). `auto` herda do corpo.
    const cornerSquare: CornerSquareType = this._eyeFrameShape === 'auto' ? libStyle.cornerSquare : LIB_EYE_FRAME[this._eyeFrameShape];
    const cornerDot: CornerDotType = this._eyeCenterShape === 'auto' ? libStyle.cornerDot : LIB_EYE_CENTER[this._eyeCenterShape];

    const cfg: Partial<Options> = {
      type: 'svg', shape: qrShape, width: BASE, height: BASE, margin, data: this._text,
      qrOptions: { errorCorrectionLevel: ECL_LETTER[this._ecl] ?? 'M' },
      dotsOptions: { type: libStyle.dot, color: fg, roundSize: qrShape === 'circle' },
      cornersSquareOptions: { type: cornerSquare, color: eyeFrameColor },
      cornersDotOptions: { type: cornerDot, color: eyeCenterColor },
      backgroundOptions: { color: this._bgTransparent ? 'transparent' : bg },
      image: this._logo ?? undefined,
      imageOptions: { imageSize: 0.4, margin: 2, hideBackgroundDots: true },
    };

    const qc = new QRCodeStyling(cfg);
    qc.applyExtension((svg) => {
      // Normaliza o viewBox/tamanho para BASE×BASE (sem moldura): a moldura é
      // que compõe o SVG externo. Garante o contorno em quadrado e círculo.
      svg.setAttribute('viewBox', `0 0 ${BASE} ${BASE}`);
      svg.setAttribute('width', String(BASE));
      svg.setAttribute('height', String(BASE));
    });
    const blob = await qc.getRawData('svg') as Blob | null;
    const qr = qc._qr as QRCode | undefined;
    this._moduleCount = qr?.getModuleCount() ?? 0;

    // Backend custom: desenhamos a partir da matriz (o SVG da lib é descartado).
    if (custom && qr) {
      const svg = renderCustomQr(extractMatrix(qr), {
        shape: this._shape,
        eyeFrame: this._eyeFrameShape,
        eyeCenter: this._eyeCenterShape,
        colors: { fg, bg, eyeFrame: this._eyeFrame, eyeCenter: this._eyeCenter },
        bgTransparent: this._bgTransparent,
        logo: this._logo,
        base: BASE,
        margin,
      });
      return { svg, size: BASE, moduleCount: this._moduleCount };
    }

    const svgText = blob ? await blob.text() : '';
    // Remove o prólogo XML: um `<?xml?>` dentro de um <svg> aninhado é inválido.
    const svg = svgText.replace(/^<\?xml[^>]*\?>\s*/i, '');
    return { svg, size: BASE, moduleCount: this._moduleCount };
  }
}
