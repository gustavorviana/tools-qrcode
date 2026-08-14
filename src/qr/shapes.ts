/*
 * Catálogo de formas do QR — o coração da personalização. Cada forma (corpo,
 * moldura de olho) é UMA entrada registrada num Map; adicionar uma forma nova é
 * escrever seu desenho e chamar o `register*` uma vez. Nem o renderer nem o
 * gerador têm `switch`/`if` por forma: ambos fazem lookup no Map.
 *
 * O CENTRO do olho reaproveita o mesmo catálogo do corpo (registro BODY): quem
 * registra uma forma de corpo ganha, de graça, a forma de centro correspondente.
 *
 * - Corpo `backend:'lib'`: `lib` mapeia para os tipos da qr-code-styling (módulos
 *   conectados, desenhados pela lib). O `draw` é usado só para preview e para o
 *   centro do olho (nunca para desenhar o corpo).
 * - Corpo `backend:'custom'`: `draw(cx,cy,s,color)` desenha UMA célula isolada;
 *   nosso renderer chama isso por módulo (e no centro do olho, em escala 3×).
 */
import type { DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';
import type { ModuleShape, EyeFrameShape, EyeCenterShape } from './types';

/** Arredonda para 2 casas — mantém o SVG enxuto. */
const n = (v: number): number => Math.round(v * 100) / 100;

/** Desenha UMA forma centrada em (cx,cy), lado `s`, na cor `color`. */
export type DrawFn = (cx: number, cy: number, s: number, color: string) => string;

/** Olho `auto` resolvido para formas concretas do backend custom. */
export interface AutoEye {
  frame: Exclude<EyeFrameShape, 'auto'>;
  /** Forma do centro (do próprio catálogo de corpo). */
  center: ModuleShape;
}

/** Definição de uma forma de corpo. `lib` (backend lib) e/ou `draw` (custom/preview/centro). */
export interface BodyShapeDef {
  name: ModuleShape;
  label: string;
  backend: 'lib' | 'custom';
  /** Mapeamento para a lib (só backend `lib`). */
  lib?: { dot: DotType; cornerSquare: CornerSquareType; cornerDot: CornerDotType };
  /** Desenha uma célula/glifo (todo corpo tem; no lib é só preview/centro). */
  draw: DrawFn;
  /** Olho `auto` para este corpo (backend custom). Default: quadrado. */
  autoEye?: AutoEye;
}

/** Desenha uma parte do olho a partir do canto (x,y) do finder 7×7 e do `cell`. */
export type EyeDrawFn = (x: number, y: number, cell: number, color: string) => string;

export interface EyeFrameDef { name: EyeFrameShape; label: string; draw: EyeDrawFn }

/** Opção de centro do olho para a UI: `auto` + cada forma de corpo. */
export interface CenterOption { name: EyeCenterShape; label: string; draw: DrawFn }

/* ------------------------------------------------------------------ */
/* Registries                                                          */
/* ------------------------------------------------------------------ */

export const BODY = new Map<ModuleShape, BodyShapeDef>();
export const EYE_FRAME = new Map<EyeFrameShape, EyeFrameDef>();

export const registerBody = (d: BodyShapeDef): void => { BODY.set(d.name, d); };
export const registerEyeFrame = (d: EyeFrameDef): void => { EYE_FRAME.set(d.name, d); };

/** Um corpo é do backend custom? (usado pelo gerador para escolher o renderer). */
export const isCustomBody = (s: ModuleShape): boolean => BODY.get(s)?.backend === 'custom';

/* ------------------------------------------------------------------ */
/* Helpers de desenho                                                  */
/* ------------------------------------------------------------------ */

/** Quadrado (com raio opcional) centrado em (cx,cy), lado `s`. */
const rectGlyph = (cx: number, cy: number, s: number, color: string, rx: number): string =>
  `<rect x="${n(cx - s / 2)}" y="${n(cy - s / 2)}" width="${n(s)}" height="${n(s)}"`
  + (rx ? ` rx="${n(rx)}" ry="${n(rx)}"` : '') + ` fill="${color}"/>`;

/**
 * Desenha um path definido numa caixa 24×24 (viewBox de ícone), centralizado em
 * (cx,cy) e escalado para caber num quadrado de lado `s*f`. Simplifica declarar
 * coração/estrela/losango com paths legíveis.
 */
const boxed = (cx: number, cy: number, s: number, f: number, d: string, color: string): string => {
  const sc = (s * f) / 24;
  return `<path transform="translate(${n(cx)},${n(cy)}) scale(${n(sc)}) translate(-12,-12)" d="${d}" fill="${color}"/>`;
};

/** Polígono de "mais" (+) centrado em (cx,cy): meia-extensão `e`, meia-espessura `t`. */
const plusPath = (cx: number, cy: number, e: number, t: number): string => {
  const p = (a: number, b: number) => `${n(a)},${n(b)}`;
  return `M${p(cx - t, cy - e)} L${p(cx + t, cy - e)} L${p(cx + t, cy - t)} L${p(cx + e, cy - t)} `
    + `L${p(cx + e, cy + t)} L${p(cx + t, cy + t)} L${p(cx + t, cy + e)} L${p(cx - t, cy + e)} `
    + `L${p(cx - t, cy + t)} L${p(cx - e, cy + t)} L${p(cx - e, cy - t)} L${p(cx - t, cy - t)} Z`;
};

// Paths em caixa 24×24, centro ~ (12,12).
const HEART = 'M12 21C12 21 3 14.5 3 8.7C3 5.6 5.4 3.2 8.5 3.2C10.2 3.2 11.4 4 12 5C12.6 4 13.8 3.2 15.5 3.2C18.6 3.2 21 5.6 21 8.7C21 14.5 12 21 12 21Z';
const STAR = 'M12 2L14.94 8.63L22 9.24L16.5 13.97L18.18 21L12 17.27L5.82 21L7.5 13.97L2 9.24L9.06 8.63Z';
const DIAMOND = 'M12 1L23 12L12 23L1 12Z';

/* ------------------------------------------------------------------ */
/* Corpos — backend lib (as 6 formas da qr-code-styling)               */
/* O `draw` aqui só alimenta preview e centro do olho.                 */
/* ------------------------------------------------------------------ */

// `autoEye` só é lido quando o render cai no backend custom (corpo custom ou
// centro-ícone forçando o renderer próprio) — dá aos corpos da lib um olho
// coerente nesse caso.
registerBody({ name: 'solid', label: 'Contínuo', backend: 'lib', lib: { dot: 'square', cornerSquare: 'square', cornerDot: 'square' }, autoEye: { frame: 'square', center: 'solid' }, draw: (cx, cy, s, c) => rectGlyph(cx, cy, s, c, 0) });
registerBody({ name: 'rounded', label: 'Arredondado', backend: 'lib', lib: { dot: 'rounded', cornerSquare: 'extra-rounded', cornerDot: 'dot' }, autoEye: { frame: 'rounded', center: 'rounded' }, draw: (cx, cy, s, c) => rectGlyph(cx, cy, s, c, s * 0.25) });
registerBody({ name: 'dots', label: 'Pontos', backend: 'lib', lib: { dot: 'dots', cornerSquare: 'dot', cornerDot: 'dot' }, autoEye: { frame: 'circle', center: 'circle' }, draw: (cx, cy, s, c) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(s * 0.5)}" fill="${c}"/>` });
registerBody({ name: 'classy', label: 'Elegante', backend: 'lib', lib: { dot: 'classy', cornerSquare: 'extra-rounded', cornerDot: 'dot' }, autoEye: { frame: 'rounded', center: 'rounded' }, draw: (cx, cy, s, c) => rectGlyph(cx, cy, s, c, s * 0.3) });
registerBody({ name: 'classy-rounded', label: 'Elegante+', backend: 'lib', lib: { dot: 'classy-rounded', cornerSquare: 'extra-rounded', cornerDot: 'dot' }, autoEye: { frame: 'rounded', center: 'rounded' }, draw: (cx, cy, s, c) => rectGlyph(cx, cy, s, c, s * 0.42) });
registerBody({ name: 'extra-rounded', label: 'Extra', backend: 'lib', lib: { dot: 'extra-rounded', cornerSquare: 'extra-rounded', cornerDot: 'dot' }, autoEye: { frame: 'rounded', center: 'rounded' }, draw: (cx, cy, s, c) => rectGlyph(cx, cy, s, c, s * 0.48) });

/* ------------------------------------------------------------------ */
/* Corpos — backend custom (uma forma isolada por módulo)              */
/* ------------------------------------------------------------------ */

registerBody({
  name: 'circle', label: 'Círculo', backend: 'custom',
  autoEye: { frame: 'circle', center: 'circle' },
  draw: (cx, cy, s, c) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(s * 0.46)}" fill="${c}"/>`,
});
registerBody({
  name: 'diamond', label: 'Losango', backend: 'custom',
  autoEye: { frame: 'square', center: 'diamond' },
  draw: (cx, cy, s, c) => boxed(cx, cy, s, 1.06, DIAMOND, c),
});
registerBody({
  name: 'heart', label: 'Coração', backend: 'custom',
  autoEye: { frame: 'rounded', center: 'solid' },
  draw: (cx, cy, s, c) => boxed(cx, cy, s, 1.02, HEART, c),
});
registerBody({
  name: 'star', label: 'Estrela', backend: 'custom',
  autoEye: { frame: 'square', center: 'solid' },
  draw: (cx, cy, s, c) => boxed(cx, cy, s, 1.08, STAR, c),
});
registerBody({
  name: 'plus', label: 'Mais', backend: 'custom',
  autoEye: { frame: 'square', center: 'solid' },
  draw: (cx, cy, s, c) => `<path d="${plusPath(cx, cy, s * 0.5, s * 0.2)}" fill="${c}"/>`,
});
registerBody({
  name: 'cross', label: 'Cruz', backend: 'custom',
  autoEye: { frame: 'square', center: 'solid' },
  draw: (cx, cy, s, c) => `<path d="${plusPath(cx, cy, s * 0.5, s * 0.31)}" fill="${c}"/>`,
});
registerBody({
  name: 'x', label: 'X', backend: 'custom',
  autoEye: { frame: 'square', center: 'solid' },
  draw: (cx, cy, s, c) =>
    `<path transform="rotate(45 ${n(cx)} ${n(cy)})" d="${plusPath(cx, cy, s * 0.52, s * 0.18)}" fill="${c}"/>`,
});

/* ------------------------------------------------------------------ */
/* Olhos — moldura (anel externo do finder 7×7)                        */
/* ------------------------------------------------------------------ */

// A moldura ocupa o anel de 1 módulo: linha de centro em 0.5 e 6.5 módulos
// (rect 6×6 com stroke de 1 módulo), sem furo — funciona com fundo transparente.
const frameRect = (x: number, y: number, cell: number, color: string, rx: number): string =>
  `<rect x="${n(x + cell * 0.5)}" y="${n(y + cell * 0.5)}" width="${n(cell * 6)}" height="${n(cell * 6)}"`
  + ` rx="${n(rx)}" ry="${n(rx)}" fill="none" stroke="${color}" stroke-width="${n(cell)}"/>`;

registerEyeFrame({ name: 'square', label: 'Quadrado', draw: (x, y, cell, c) => frameRect(x, y, cell, c, 0) });
registerEyeFrame({ name: 'rounded', label: 'Arredondado', draw: (x, y, cell, c) => frameRect(x, y, cell, c, cell * 2) });
registerEyeFrame({
  name: 'circle', label: 'Círculo',
  draw: (x, y, cell, c) => {
    const cx = x + cell * 3.5, cy = y + cell * 3.5;
    return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(cell * 3)}" fill="none" stroke="${c}" stroke-width="${n(cell)}"/>`;
  },
});
// `auto` nunca é desenhado direto (é resolvido antes), mas registra p/ a UI.
registerEyeFrame({ name: 'auto', label: 'Automático', draw: (x, y, cell, c) => frameRect(x, y, cell, c, 0) });

/* ------------------------------------------------------------------ */
/* Centro do olho — reaproveita o catálogo de corpo (+ `auto`)         */
/* ------------------------------------------------------------------ */

/** Opções de centro do olho para a UI/validação: `auto` seguido de cada corpo. */
export function eyeCenterOptions(): CenterOption[] {
  const auto: CenterOption = { name: 'auto', label: 'Automático', draw: (cx, cy, s, c) => rectGlyph(cx, cy, s, c, 0) };
  const bodies: CenterOption[] = [...BODY.values()].map((d) => ({ name: d.name, label: d.label, draw: d.draw }));
  return [auto, ...bodies];
}

/** Desenha o centro do olho `shape` (uma forma de corpo) no bloco 3×3 do finder. */
export function drawEyeCenter(shape: ModuleShape, x: number, y: number, cell: number, color: string): string {
  const def = BODY.get(shape);
  return def ? def.draw(x + cell * 3.5, y + cell * 3.5, cell * 3, color) : '';
}

/* ------------------------------------------------------------------ */
/* Mapeamento dos olhos para a lib (backend lib)                       */
/* ------------------------------------------------------------------ */

/** Forma da moldura do olho → tipo da lib. `auto` é tratado à parte. */
export const LIB_EYE_FRAME: Record<Exclude<EyeFrameShape, 'auto'>, CornerSquareType> = {
  square: 'square', rounded: 'extra-rounded', circle: 'dot',
};
/** Forma do centro (corpo) → tipo da lib. Formas de ícone caem p/ o mais próximo. */
export const LIB_EYE_CENTER: Record<ModuleShape, CornerDotType> = {
  solid: 'square', rounded: 'rounded', dots: 'dots', classy: 'classy',
  'classy-rounded': 'classy-rounded', 'extra-rounded': 'extra-rounded',
  circle: 'dot', diamond: 'square', heart: 'square', star: 'square',
  plus: 'square', x: 'square', cross: 'square',
};

/**
 * Centros que a lib NÃO desenha (formas de ícone). Escolher um destes força o
 * renderer próprio mesmo com um corpo da lib — senão a lib os aproximaria para
 * quadrado (era o bug: "ícone vira quadrado quando o corpo é da lib").
 */
export const CUSTOM_ONLY_CENTER = new Set<ModuleShape>(['diamond', 'heart', 'star', 'plus', 'x', 'cross']);

/** O centro escolhido exige o renderer próprio? (`auto` nunca exige.) */
export const centerNeedsCustom = (s: EyeCenterShape): boolean =>
  s !== 'auto' && CUSTOM_ONLY_CENTER.has(s);
