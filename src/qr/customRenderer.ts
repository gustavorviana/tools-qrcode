/*
 * Renderer próprio do QR (backend `custom`) — desenha o SVG a partir da matriz,
 * uma forma isolada por módulo, com olhos e cores independentes. É PURO: recebe
 * a `QrMatrix` (sem tocar na lib), então dá para testar com uma matriz fake.
 *
 * Sem ramificação por forma: cada módulo/olho é resolvido por lookup nos
 * registries de ./shapes. Layout espelha o do backend lib (mesma zona de
 * silêncio) para o preview não "pular" ao trocar de forma.
 */
import type { ModuleShape, EyeFrameShape, EyeCenterShape, QrColors } from './types';
import type { QrMatrix } from './matrix';
import { BODY, EYE_FRAME, drawEyeCenter } from './shapes';
import type { AutoEye } from './shapes';

/** Opções de render do backend custom (tudo o que o SVG precisa saber). */
export interface CustomRenderOptions {
  shape: ModuleShape;
  eyeFrame: EyeFrameShape;
  eyeCenter: EyeCenterShape;
  colors: QrColors;
  bgTransparent: boolean;
  logo: string | null;
  /** Lado do canvas lógico (BASE). */
  base: number;
  /** Zona de silêncio em cada lado, em px lógicos. */
  margin: number;
}

const DEFAULT_AUTO: AutoEye = { frame: 'square', center: 'solid' };
const n = (v: number): number => Math.round(v * 100) / 100;

/** Gera o SVG do QR (sem moldura) para o backend custom. */
export function renderCustomQr(matrix: QrMatrix, opt: CustomRenderOptions): string {
  const { size } = matrix;
  const drawable = opt.base - opt.margin * 2;
  const cell = drawable / size;
  const px = (i: number): number => opt.margin + i * cell; // canto do módulo i

  const body = BODY.get(opt.shape);
  const drawCell = body?.draw ?? (() => '');
  const autoEye = body?.autoEye ?? DEFAULT_AUTO;

  const fg = opt.colors.fg;
  const eyeFrameColor = opt.colors.eyeFrame ?? fg;
  const eyeCenterColor = opt.colors.eyeCenter ?? fg;

  // Área do logo (para pular os módulos por baixo), com margem de 2 módulos.
  const logoSide = opt.logo ? drawable * 0.4 : 0;
  const logoPad = cell * 2;
  const logoMin = (opt.base - logoSide) / 2 - logoPad;
  const logoMax = (opt.base + logoSide) / 2 + logoPad;
  const underLogo = (cx: number, cy: number): boolean =>
    !!opt.logo && cx >= logoMin && cx <= logoMax && cy >= logoMin && cy <= logoMax;

  const parts: string[] = [];
  if (!opt.bgTransparent) parts.push(`<rect x="0" y="0" width="${opt.base}" height="${opt.base}" fill="${opt.colors.bg}"/>`);

  // Corpo: cada módulo escuro que não é olho nem está sob o logo.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!matrix.modules[y][x] || matrix.isFinder(x, y)) continue;
      const cx = px(x) + cell / 2, cy = px(y) + cell / 2;
      if (underLogo(cx, cy)) continue;
      parts.push(drawCell(cx, cy, cell, fg));
    }
  }

  // Olhos: moldura + centro em cada finder, resolvendo `auto` pelo corpo.
  const frameShape: Exclude<EyeFrameShape, 'auto'> = opt.eyeFrame === 'auto' ? autoEye.frame : opt.eyeFrame;
  const centerShape: ModuleShape = opt.eyeCenter === 'auto' ? autoEye.center : opt.eyeCenter;
  const frameDef = EYE_FRAME.get(frameShape);
  for (const f of matrix.finders) {
    const ex = px(f.x), ey = px(f.y);
    if (frameDef) parts.push(frameDef.draw(ex, ey, cell, eyeFrameColor));
    parts.push(drawEyeCenter(centerShape, ex, ey, cell, eyeCenterColor));
  }

  // Logo: fundo (se não transparente) + imagem central.
  if (opt.logo) {
    const s = logoSide, lx = (opt.base - s) / 2;
    if (!opt.bgTransparent) {
      const bx = lx - cell, bs = s + cell * 2;
      parts.push(`<rect x="${n(bx)}" y="${n(bx)}" width="${n(bs)}" height="${n(bs)}" rx="${n(cell)}" ry="${n(cell)}" fill="${opt.colors.bg}"/>`);
    }
    parts.push(`<image x="${n(lx)}" y="${n(lx)}" width="${n(s)}" height="${n(s)}" preserveAspectRatio="xMidYMid meet" href="${opt.logo}" xlink:href="${opt.logo}"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`
    + ` viewBox="0 0 ${opt.base} ${opt.base}" width="${opt.base}" height="${opt.base}">`
    + parts.join('') + '</svg>';
}
