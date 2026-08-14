/*
 * Logos prontos para o centro do QR — registro simples (uma entrada por ícone).
 * Cada logo declara uma cor de fundo de marca e um `glyph(color)` que desenha o
 * ícone numa ÚNICA cor. Daí saem duas versões:
 *  - colorida: fundo da marca + glifo branco;
 *  - monocromática: glifo na cor do QR (fg) sobre um fundo (bg).
 * O SVG vira data URL para ser a imagem central do QR. Adicionar um logo novo =
 * mais uma entrada em LOGOS.
 *
 * A lista cobre os tipos da etapa 1 (link, Wi-Fi, e-mail, telefone, SMS,
 * WhatsApp, contato, local, evento) + redes sociais comuns.
 */

/** Desenha o glifo do logo numa única cor. */
export type Glyph = (color: string) => string;

/** Um logo pronto: id, rótulo, cor de marca e o glifo (viewBox 128×128). */
export interface LogoDef {
  name: string;
  label: string;
  /** Fundo da versão colorida. */
  bg: string;
  /** Fundo colorido alternativo (ex.: gradiente do Instagram), no lugar de `bg`. */
  bgSvg?: string;
  glyph: Glyph;
}

/** Estilo de render do logo. */
export interface LogoStyle {
  mono?: boolean;
  /** Cor do glifo no modo mono (default: escuro). */
  fg?: string;
  /** Cor do fundo no modo mono (default: branco). */
  bg?: string;
}

const svg = (inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${inner}</svg>`;
/** Fundo arredondado "estilo ícone de app". */
const roundBg = (color: string): string => `<rect width="128" height="128" rx="26" fill="${color}"/>`;
/** Glifo de viewBox 24×24 (ex.: simple-icons) centrado em 128×128, na cor `c`. */
const g24 = (path: string): Glyph => (c) =>
  `<g transform="translate(20 20) scale(3.667)" fill="${c}"><path d="${path}"/></g>`;

// Glifos monocromáticos (viewBox 24×24) de logos de marcas — silhuetas completas.
const WHATSAPP = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.454h.005c6.582 0 11.946-5.335 11.949-11.893a11.821 11.821 0 00-3.484-8.46';
const FACEBOOK = 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z';
const TELEGRAM = 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z';

// Fundo em gradiente do Instagram (versão colorida).
const IG_GRADIENT = `<defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">`
  + `<stop offset="0" stop-color="#FEDA75"/><stop offset=".25" stop-color="#FA7E1E"/>`
  + `<stop offset=".5" stop-color="#D62976"/><stop offset=".75" stop-color="#962FBF"/>`
  + `<stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs>`
  + `<rect width="128" height="128" rx="26" fill="url(#ig)"/>`;

/** Registro de logos, na ordem em que aparecem na UI. */
export const LOGOS: LogoDef[] = [
  { name: 'whatsapp', label: 'WhatsApp', bg: '#25D366', glyph: g24(WHATSAPP) },
  { name: 'facebook', label: 'Facebook', bg: '#1877F2', glyph: g24(FACEBOOK) },
  {
    name: 'instagram', label: 'Instagram', bg: '#D62976', bgSvg: IG_GRADIENT,
    glyph: (c) => `<rect x="40" y="40" width="48" height="48" rx="14" fill="none" stroke="${c}" stroke-width="7"/>`
      + `<circle cx="64" cy="64" r="13" fill="none" stroke="${c}" stroke-width="7"/>`
      + `<circle cx="82" cy="46" r="4.5" fill="${c}"/>`,
  },
  { name: 'telegram', label: 'Telegram', bg: '#229ED9', glyph: g24(TELEGRAM) },
  {
    name: 'tel', label: 'Telefone', bg: '#3B82F6',
    glyph: (c) => `<path fill="${c}" d="M47 41c-2-3-6-4-9-2l-8 5c-3 2-4 6-3 9 3 16 12 30 24 42s26 21 42 24c3 1 7-1 9-4l5-8c2-3 1-7-2-9l-16-9c-2-1-6-1-8 1l-6 5c-1 1-3 1-4 0-9-6-16-13-22-22-1-1-1-3 0-4l5-6c2-2 2-6 1-8z"/>`,
  },
  {
    name: 'email', label: 'E-mail', bg: '#6366F1',
    glyph: (c) => `<rect x="30" y="42" width="68" height="44" rx="9" fill="none" stroke="${c}" stroke-width="7"/>`
      + `<path d="M33 49l31 22 31-22" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    name: 'sms', label: 'SMS', bg: '#F59E0B',
    glyph: (c) => `<path d="M36 40h56c4 0 7 3 7 7v28c0 4-3 7-7 7H60L44 89V82h-8c-4 0-7-3-7-7V47c0-4 3-7 7-7z" fill="none" stroke="${c}" stroke-width="6"/>`
      + `<g fill="${c}"><circle cx="52" cy="61" r="4"/><circle cx="64" cy="61" r="4"/><circle cx="76" cy="61" r="4"/></g>`,
  },
  {
    name: 'wifi', label: 'Wi-Fi', bg: '#0EA5E9',
    glyph: (c) => `<path d="M38 56c15-13 37-13 52 0" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`
      + `<path d="M49 68c9-8 21-8 30 0" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`
      + `<circle cx="64" cy="80" r="5.5" fill="${c}"/>`,
  },
  {
    name: 'link', label: 'Link', bg: '#0284C7',
    glyph: (c) => `<circle cx="64" cy="64" r="26" fill="none" stroke="${c}" stroke-width="6"/>`
      + `<path d="M38 64h52" stroke="${c}" stroke-width="6"/>`
      + `<path d="M64 38c11 8 11 44 0 52M64 38c-11 8-11 44 0 52" fill="none" stroke="${c}" stroke-width="6"/>`,
  },
  {
    name: 'vcard', label: 'Contato', bg: '#14B8A6',
    glyph: (c) => `<circle cx="64" cy="52" r="15" fill="${c}"/><path fill="${c}" d="M36 94c0-14 12-23 28-23s28 9 28 23v3H36z"/>`,
  },
  {
    name: 'geo', label: 'Local', bg: '#EF4444',
    glyph: (c) => `<path fill="${c}" d="M64 30c-14 0-25 11-25 25 0 18 25 43 25 43s25-25 25-43c0-14-11-25-25-25zm0 34a9 9 0 110-18 9 9 0 010 18z"/>`,
  },
  {
    name: 'event', label: 'Evento', bg: '#8B5CF6',
    glyph: (c) => `<rect x="32" y="44" width="64" height="52" rx="10" fill="none" stroke="${c}" stroke-width="6"/>`
      + `<path d="M32 60h64" stroke="${c}" stroke-width="6"/>`
      + `<rect x="46" y="36" width="6" height="14" rx="3" fill="${c}"/><rect x="76" y="36" width="6" height="14" rx="3" fill="${c}"/>`
      + `<g fill="${c}"><circle cx="50" cy="76" r="3.5"/><circle cx="64" cy="76" r="3.5"/><circle cx="78" cy="76" r="3.5"/><circle cx="50" cy="87" r="3.5"/><circle cx="64" cy="87" r="3.5"/></g>`,
  },
];

/** Monta o SVG de um logo, colorido (padrão) ou monocromático (cores do QR). */
export function logoSvg(def: LogoDef, style: LogoStyle = {}): string {
  if (style.mono) {
    const fg = style.fg ?? '#0f172a';
    const bg = style.bg ?? '#ffffff';
    return svg(roundBg(bg) + def.glyph(fg));
  }
  return svg((def.bgSvg ?? roundBg(def.bg)) + def.glyph('#ffffff'));
}

/** Converte o SVG de um logo em data URL para usar como imagem central do QR. */
export const logoDataUrl = (s: string): string =>
  'data:image/svg+xml,' + encodeURIComponent(s);
