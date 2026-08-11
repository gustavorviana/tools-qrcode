/*
 * QRDesigner — Única classe do domínio de QR. Envelopa a qr-code-styling
 * (que codifica e desenha o código: formas, cores, logo) e compõe a MOLDURA
 * por conta própria (cantos/borda/faixa + legenda), produzindo o SVG final.
 */
import QRCodeStyling from 'qr-code-styling';
import type { Options, DotType, CornerSquareType, CornerDotType, ErrorCorrectionLevel, QRCode, ShapeType } from 'qr-code-styling';
import type { ModuleShape, Ecl, QrColors } from './types';
import { Frame, NoneFrame } from './frames';
import { rasterizeSVG } from './raster';

/** Espaço de coordenadas lógico do QR (o SVG é vetorial; isto é só a escala). */
const BASE = 1000;
/** Escala nominal da moldura/zona de silêncio (proporção fixa, ~1 módulo). */
const UNIT = BASE / 34;

const ECL_LETTER: Record<Ecl, ErrorCorrectionLevel> = {
  LOW: 'L', MEDIUM: 'M', QUARTILE: 'Q', HIGH: 'H',
};

/** Mapeia nossas formas para os estilos de módulo/cantos da lib. */
const SHAPES: Record<ModuleShape, { dot: DotType; cornerSquare: CornerSquareType; cornerDot: CornerDotType }> = {
  solid: { dot: 'square', cornerSquare: 'square', cornerDot: 'square' },
  rounded: { dot: 'rounded', cornerSquare: 'extra-rounded', cornerDot: 'dot' },
  dots: { dot: 'dots', cornerSquare: 'dot', cornerDot: 'dot' },
  classy: { dot: 'classy-rounded', cornerSquare: 'extra-rounded', cornerDot: 'dot' },
};

/** Metadados do último QR gerado, para exibição. */
export interface QrInfo {
  moduleCount: number;
  version: number;
  ecl: Ecl;
}

/** Gera e personaliza um QR Code, delegando a codificação/desenho à qr-code-styling. */
export class QRDesigner {
  private _fg = '#0f172a';
  private _bg = '#ffffff';
  private _shape: ModuleShape = 'solid';
  private _qrShape: ShapeType = 'square';
  private _frame: Frame = new NoneFrame();
  private _logo: string | null = null;
  private _text = '';
  private _ecl: Ecl = 'MEDIUM';
  private lastSVG = '';
  private lastH = BASE;
  private lastCount = 0;

  /** Conteúdo a codificar. */
  get text(): string { return this._text; }
  set text(v: string) { this._text = v; }

  /** Nível de correção de erro. */
  get ecl(): Ecl { return this._ecl; }
  set ecl(v: Ecl) { this._ecl = v; }

  /** Cores dos módulos (`fg`) e do fundo (`bg`). Atribua um ou ambos. */
  get colors(): QrColors { return { fg: this._fg, bg: this._bg }; }
  set colors(c: Partial<QrColors>) {
    if (c.fg !== undefined) this._fg = c.fg;
    if (c.bg !== undefined) this._bg = c.bg;
  }

  /** Forma dos módulos. */
  get shape(): ModuleShape { return this._shape; }
  set shape(v: ModuleShape) { this._shape = v; }

  /** Contorno geral do QR (quadrado ou círculo). */
  get qrShape(): ShapeType { return this._qrShape; }
  set qrShape(v: ShapeType) { this._qrShape = v; }

  /** Logotipo central (data URL) ou `null` para remover. */
  get logo(): string | null { return this._logo; }
  set logo(v: string | null) { this._logo = v; }

  /** Moldura ao redor do QR (instância que carrega a própria legenda). */
  get frame(): Frame { return this._frame; }
  set frame(v: Frame) { this._frame = v; }

  get hasLogo(): boolean { return this._logo !== null; }
  get ready(): boolean { return this._text.length > 0; }

  /** Metadados do último SVG gerado (contagem de módulos vem da própria lib). */
  get info(): QrInfo {
    return { moduleCount: this.lastCount, version: this.lastCount ? (this.lastCount - 17) / 4 : 0, ecl: this._ecl };
  }

  /** Markup da moldura (faixa/cantos/borda + legenda), injetado no SVG da lib. */
  private frameMarkup(capH: number): string {
    return this._frame.render({ size: BASE, captionHeight: capH, unit: UNIT, fg: this._fg, bg: this._bg });
  }

  /** Constrói o SVG final: a lib gera o código e injetamos a moldura via applyExtension. */
  async toSVG(): Promise<string> {
    if (!this._text) return '';
    const fg = this._fg, bg = this._bg;
    const capH = this._frame.captionHeight(UNIT, BASE);
    const H = BASE + capH;
    this.lastH = H;

    const map = SHAPES[this._shape];
    // No círculo a lib encaixa os módulos no quadrado inscrito (lado = área/√2)
    // e arredonda o tamanho do módulo para baixo, deixando o QR ~menor que no
    // modo quadrado. Reduzimos um pouco a zona de silêncio para compensar e as
    // bordas ficarem parecidas com as do quadrado.
    const margin = (this._qrShape === 'circle' ? 3.5 : 4) * UNIT;
    const cfg: Partial<Options> = {
      type: 'svg', shape: this._qrShape, width: BASE, height: BASE, margin, data: this._text,
      qrOptions: { errorCorrectionLevel: ECL_LETTER[this._ecl] ?? 'M' },
      // No contorno circular a lib arredonda índices de módulo para preencher o
      // círculo; sem roundSize os índices ficam fracionários e quebram o desenho.
      dotsOptions: { type: map.dot, color: fg, roundSize: this._qrShape === 'circle' },
      cornersSquareOptions: { type: map.cornerSquare, color: fg },
      cornersDotOptions: { type: map.cornerDot, color: fg },
      backgroundOptions: { color: bg },
      image: this._logo ?? undefined,
      imageOptions: { imageSize: 0.4, margin: 2, hideBackgroundDots: true },
    };

    let qc: QRCodeStyling;
    let blob: Blob | null;
    qc = new QRCodeStyling(cfg);
    const markup = this.frameMarkup(capH);
    qc.applyExtension((svg) => {
      // A lib nos entrega o SVGElement após desenhar; expandimos para a área
      // da legenda e injetamos a moldura — o getRawData já reflete a extensão.
      svg.setAttribute('viewBox', `0 0 ${BASE} ${H}`);
      svg.setAttribute('width', String(BASE));
      svg.setAttribute('height', String(H));
      if (markup) svg.insertAdjacentHTML('beforeend', markup);
    });
    blob = await qc.getRawData('svg') as Blob | null;

    this.lastCount = (qc._qr as QRCode | undefined)?.getModuleCount() ?? 0;
    const svgText = blob ? await blob.text() : '';
    this.lastSVG = svgText.replace(/^<\?xml[^>]*\?>\s*/i, ''); // remove eventual prólogo XML
    return this.lastSVG;
  }

  /** Fator de supersampling na exportação (rasteriza grande e reduz). */
  private static readonly SS = 4;

  /** Rasteriza o SVG final num `<canvas>` de `px` de largura. */
  async toCanvas(px: number): Promise<HTMLCanvasElement> {
    const svg = await this.toSVG();
    const scale = px / BASE;
    const outW = Math.round(BASE * scale);
    const outH = Math.round(this.lastH * scale);

    // Ajusta o SVG (desfaz o clip que causava as costuras + força a resolução).
    const hiRes = rasterizeSVG(svg, outW * QRDesigner.SS, outH * QRDesigner.SS);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(hiRes);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Rasteriza em alta resolução (o SVG já tem o tamanho grande) e reduz
        // para o alvo com filtragem de alta qualidade — resíduos de borda somem.
        const big = document.createElement('canvas');
        big.width = outW * QRDesigner.SS;
        big.height = outH * QRDesigner.SS;
        const bctx = big.getContext('2d')!;
        bctx.fillStyle = this._bg;
        bctx.fillRect(0, 0, big.width, big.height);
        bctx.drawImage(img, 0, 0, big.width, big.height);

        const cv = document.createElement('canvas');
        cv.width = outW;
        cv.height = outH;
        const ctx = cv.getContext('2d')!;
        ctx.fillStyle = this._bg;
        ctx.fillRect(0, 0, outW, outH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(big, 0, 0, outW, outH);
        resolve(cv);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /** Retorna o último SVG final como Blob vetorial. */
  toSVGBlob(): Blob {
    return new Blob([this.lastSVG], { type: 'image/svg+xml' });
  }
}
