/*
 * Link compartilhável — serializa/deserializa o texto e as opções de estilo num
 * fragmento de URL (`q=…&e=…&fg=…`). Só o que foge do padrão entra, para manter
 * a URL enxuta; o logo nunca entra (é imagem). Puro: não toca em `location`.
 */
import type { Ecl, ModuleShape, EyeFrameShape, EyeCenterShape, FrameStyle } from './types';
import type { ShapeType } from 'qr-code-styling';
import { BODY, EYE_FRAME } from './shapes';

/** Opções que um link compartilhado pode carregar (texto + o que fugir do padrão). */
export interface ShareParams {
  text: string;
  ecl?: Ecl;
  fg?: string;
  bg?: string;
  eyeFrameColor?: string;
  eyeCenterColor?: string;
  bgTransparent?: boolean;
  shape?: ModuleShape;
  eyeFrame?: EyeFrameShape;
  eyeCenter?: EyeCenterShape;
  qrShape?: ShapeType;
  frame?: FrameStyle;
  caption?: string;
  size?: number;
}

/** Estado completo da personalização atual, usado para montar o link. */
export interface ShareState {
  text: string;
  ecl: Ecl;
  fg: string;
  bg: string;
  eyeFrameColor?: string;
  eyeCenterColor?: string;
  bgTransparent: boolean;
  shape: ModuleShape;
  eyeFrame: EyeFrameShape;
  eyeCenter: EyeCenterShape;
  qrShape: ShapeType;
  frame: FrameStyle;
  caption: string;
  size: number;
}

/** Padrões da personalização — o que estiver assim é omitido do link. */
export const SHARE_DEFAULTS = {
  ecl: 'MEDIUM' as Ecl,
  fg: '#0f172a',
  bg: '#ffffff',
  bgTransparent: false,
  shape: 'solid' as ModuleShape,
  eyeFrame: 'auto' as EyeFrameShape,
  eyeCenter: 'auto' as EyeCenterShape,
  qrShape: 'square' as ShapeType,
  frame: 'none' as FrameStyle,
  caption: 'ESCANEIE',
  size: 1024,
};

/** Resoluções de PNG oferecidas (px); o link só aceita uma destas. */
export const PNG_SIZES = [512, 1024, 2048, 4096] as const;

/**
 * Monta o fragmento `q=<texto>&…` do link, omitindo o que está no padrão.
 * Retorna só a query (sem `#`), para o chamador prefixar origin/pathname.
 */
export function buildShareQuery(s: ShareState): string {
  const p = new URLSearchParams();
  p.set('q', s.text);
  if (s.ecl !== SHARE_DEFAULTS.ecl) p.set('e', s.ecl);
  if (s.fg.toLowerCase() !== SHARE_DEFAULTS.fg) p.set('fg', s.fg.replace(/^#/, ''));
  if (s.bg.toLowerCase() !== SHARE_DEFAULTS.bg) p.set('bg', s.bg.replace(/^#/, ''));
  if (s.eyeFrameColor) p.set('efc', s.eyeFrameColor.replace(/^#/, ''));
  if (s.eyeCenterColor) p.set('ecc', s.eyeCenterColor.replace(/^#/, ''));
  if (s.bgTransparent) p.set('bt', '1');
  if (s.shape !== SHARE_DEFAULTS.shape) p.set('s', s.shape);
  if (s.eyeFrame !== SHARE_DEFAULTS.eyeFrame) p.set('ef', s.eyeFrame);
  if (s.eyeCenter !== SHARE_DEFAULTS.eyeCenter) p.set('ec', s.eyeCenter);
  if (s.qrShape !== SHARE_DEFAULTS.qrShape) p.set('qs', s.qrShape);
  if (s.frame !== SHARE_DEFAULTS.frame) {
    p.set('fr', s.frame);
    if (s.caption && s.caption !== SHARE_DEFAULTS.caption) p.set('cap', s.caption);
  }
  if (s.size !== SHARE_DEFAULTS.size) p.set('sz', String(s.size));
  return p.toString();
}

/** Lê texto + opções de um fragmento de link, validando cada valor. */
export function parseShareQuery(raw: string): ShareParams | null {
  if (!raw) return null;
  const p = new URLSearchParams(raw);
  const text = p.get('q');
  if (text == null) return null;

  const hex = (v: string | null): string | undefined => {
    const h = (v ?? '').replace(/^#/, '');
    // Só comprimentos de hex CSS válidos (3/4/6/8); 5 e 7 dígitos não são cor.
    return /^([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(h)
      ? '#' + h.toLowerCase() : undefined;
  };
  const oneOf = <T extends string>(v: string | null, allowed: readonly T[]): T | undefined =>
    v != null && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
  const size = (v: string | null): number | undefined => {
    const n = Number(v);
    return (PNG_SIZES as readonly number[]).includes(n) ? n : undefined;
  };
  // Formas válidas vêm das chaves dos registries — registrar uma forma nova já a
  // torna aceita no link, sem lista literal duplicada aqui. O centro do olho
  // reaproveita o catálogo de corpo (BODY) + `auto`.
  const bodyKeys = [...BODY.keys()];
  const eyeFrameKeys = [...EYE_FRAME.keys()];
  const eyeCenterKeys: EyeCenterShape[] = ['auto', ...BODY.keys()];

  return {
    text,
    ecl: oneOf(p.get('e'), ['LOW', 'MEDIUM', 'QUARTILE', 'HIGH'] as const),
    fg: hex(p.get('fg')),
    bg: hex(p.get('bg')),
    eyeFrameColor: hex(p.get('efc')),
    eyeCenterColor: hex(p.get('ecc')),
    bgTransparent: p.get('bt') === '1' ? true : undefined,
    shape: oneOf(p.get('s'), bodyKeys),
    eyeFrame: oneOf(p.get('ef'), eyeFrameKeys),
    eyeCenter: oneOf(p.get('ec'), eyeCenterKeys),
    qrShape: oneOf(p.get('qs'), ['square', 'circle'] as const),
    frame: oneOf(p.get('fr'), ['none', 'corners', 'border', 'label'] as const),
    caption: p.get('cap') ?? undefined,
    size: size(p.get('sz')),
  };
}
