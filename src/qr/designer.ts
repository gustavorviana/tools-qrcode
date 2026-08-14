/*
 * QRDesigner — fachada do domínio de QR usada pelo app. Coordena o QrGenerator
 * (gera só o QR) e a Frame (embute o QR e desenha a moldura), produzindo o SVG
 * final e suas rasterizações. Não fala com a lib de QR diretamente.
 */
import { QrGenerator, BASE } from './generator';
import type { QrInfo } from './generator';
import type { ModuleShape, EyeFrameShape, EyeCenterShape, Ecl, QrColors } from './types';
import type { ShapeType } from 'qr-code-styling';
import { Frame, NoneFrame } from './frames';
import { rasterizeSVG } from './raster';

export type { QrInfo };

/** Gera e personaliza um QR Code + moldura, delegando geração e composição. */
export class QRDesigner {
  private gen = new QrGenerator();
  private _frame: Frame = new NoneFrame();
  private lastSVG = '';
  private lastW = BASE;
  private lastH = BASE;

  /* ---- Estado do QR: repassado ao gerador ---- */
  get text(): string { return this.gen.text; }
  set text(v: string) { this.gen.text = v; }

  get ecl(): Ecl { return this.gen.ecl; }
  set ecl(v: Ecl) { this.gen.ecl = v; }

  get colors(): QrColors { return this.gen.colors; }
  set colors(c: Partial<QrColors>) { this.gen.colors = c; }

  get shape(): ModuleShape { return this.gen.shape; }
  set shape(v: ModuleShape) { this.gen.shape = v; }

  get eyeFrameShape(): EyeFrameShape { return this.gen.eyeFrameShape; }
  set eyeFrameShape(v: EyeFrameShape) { this.gen.eyeFrameShape = v; }

  get eyeCenterShape(): EyeCenterShape { return this.gen.eyeCenterShape; }
  set eyeCenterShape(v: EyeCenterShape) { this.gen.eyeCenterShape = v; }

  get bgTransparent(): boolean { return this.gen.bgTransparent; }
  set bgTransparent(v: boolean) { this.gen.bgTransparent = v; }

  get qrShape(): ShapeType { return this.gen.qrShape; }
  set qrShape(v: ShapeType) { this.gen.qrShape = v; }

  get logo(): string | null { return this.gen.logo; }
  set logo(v: string | null) { this.gen.logo = v; }

  get hasLogo(): boolean { return this.gen.hasLogo; }
  get ready(): boolean { return this.gen.ready; }
  get info(): QrInfo { return this.gen.info; }

  /* ---- Moldura ---- */
  get frame(): Frame { return this._frame; }
  set frame(v: Frame) { this._frame = v; }

  /** Constrói o SVG final: gera o QR e a moldura o embute no próprio SVG. */
  async toSVG(): Promise<string> {
    if (!this.gen.ready) return '';
    const qr = await this.gen.generate();
    const framed = this._frame.apply(qr, this.gen.colors);
    this.lastSVG = framed.svg;
    this.lastW = framed.width;
    this.lastH = framed.height;
    return this.lastSVG;
  }

  /** Fator de supersampling na exportação (rasteriza grande e reduz). */
  private static readonly SS = 4;

  /** Rasteriza o SVG final num `<canvas>` — `px` é a largura lógica do QR. */
  async toCanvas(px: number): Promise<HTMLCanvasElement> {
    const svg = await this.toSVG();
    const scale = px / BASE;
    const outW = Math.round(this.lastW * scale);
    const outH = Math.round(this.lastH * scale);
    // Fundo transparente → não preenche (PNG com alfa). Senão, pinta a cor de fundo.
    const bg = this.gen.bgTransparent ? null : this.gen.colors.bg;

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
        if (bg) { bctx.fillStyle = bg; bctx.fillRect(0, 0, big.width, big.height); }
        bctx.drawImage(img, 0, 0, big.width, big.height);

        const cv = document.createElement('canvas');
        cv.width = outW;
        cv.height = outH;
        const ctx = cv.getContext('2d')!;
        if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, outW, outH); }
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
