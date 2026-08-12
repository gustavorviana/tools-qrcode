/*
 * Link compartilhável — serializa/deserializa o texto e as opções de estilo num
 * fragmento de URL (`q=…&e=…&fg=…`). Só o que foge do padrão entra, para manter
 * a URL enxuta; o logo nunca entra (é imagem). Puro: não toca em `location`.
 */
import type { Ecl, ModuleShape, FrameStyle } from './types';
import type { ShapeType } from 'qr-code-styling';

/** Opções que um link compartilhado pode carregar (texto + o que fugir do padrão). */
export interface ShareParams {
  text: string;
  ecl?: Ecl;
  fg?: string;
  bg?: string;
  shape?: ModuleShape;
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
  shape: ModuleShape;
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
  shape: 'solid' as ModuleShape,
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
  if (s.shape !== SHARE_DEFAULTS.shape) p.set('s', s.shape);
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
    return /^[0-9a-fA-F]{3,8}$/.test(h) ? '#' + h.toLowerCase() : undefined;
  };
  const oneOf = <T extends string>(v: string | null, allowed: readonly T[]): T | undefined =>
    v != null && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
  const size = (v: string | null): number | undefined => {
    const n = Number(v);
    return (PNG_SIZES as readonly number[]).includes(n) ? n : undefined;
  };

  return {
    text,
    ecl: oneOf(p.get('e'), ['LOW', 'MEDIUM', 'QUARTILE', 'HIGH'] as const),
    fg: hex(p.get('fg')),
    bg: hex(p.get('bg')),
    shape: oneOf(p.get('s'), ['solid', 'rounded', 'dots', 'classy'] as const),
    qrShape: oneOf(p.get('qs'), ['square', 'circle'] as const),
    frame: oneOf(p.get('fr'), ['none', 'corners', 'border', 'label'] as const),
    caption: p.get('cap') ?? undefined,
    size: size(p.get('sz')),
  };
}
