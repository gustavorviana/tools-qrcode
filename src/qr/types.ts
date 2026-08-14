/** Tipos compartilhados do domínio de QR Code. */

/** Nível de correção de erro. */
export type Ecl = 'LOW' | 'MEDIUM' | 'QUARTILE' | 'HIGH';

/**
 * Forma dos módulos no render. Divide-se em dois grupos:
 * - lib: renderizadas pela qr-code-styling (módulos conectados);
 * - custom: renderizadas pelo nosso renderer (uma forma isolada por módulo).
 * O `backend` de cada uma vive no registro em ./shapes.
 */
export type ModuleShape =
  | 'solid' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
  | 'diamond' | 'heart' | 'star' | 'plus' | 'x' | 'cross' | 'circle';

/** Forma da moldura do olho (`auto` herda do corpo). */
export type EyeFrameShape = 'auto' | 'square' | 'rounded' | 'circle';

/**
 * Forma do centro do olho: `auto` (herda do corpo) ou qualquer forma do catálogo
 * de corpo (ver registro BODY em ./shapes). As formas de ícone só aparecem cheias
 * no backend custom; no backend lib caem para o tipo de canto mais próximo.
 */
export type EyeCenterShape = 'auto' | ModuleShape;

/** Estilo de moldura ao redor do QR. */
export type FrameStyle = 'none' | 'corners' | 'border' | 'label';

/**
 * Cores do QR: módulos (`fg`) e fundo (`bg`), mais as cores opcionais da moldura
 * (`eyeFrame`) e do centro (`eyeCenter`) do olho. Quando ausentes, os olhos
 * herdam `fg`.
 */
export interface QrColors {
  fg: string;
  bg: string;
  eyeFrame?: string;
  eyeCenter?: string;
}

/**
 * Saída da geração do QR, independente de moldura: o SVG do QR (sem moldura nem
 * legenda, sem prólogo XML) e seu tamanho lógico. É o que a moldura recebe para
 * embutir dentro do próprio SVG — a moldura não conhece o interior do QR.
 */
export interface QrRender {
  /** `<svg viewBox="0 0 size size" width=size height=size>…</svg>` do QR puro. */
  readonly svg: string;
  /** Lado do QR (área quadrada), em unidades lógicas. */
  readonly size: number;
  /** Lado da matriz em módulos (0 se desconhecido). */
  readonly moduleCount: number;
}

/** SVG final (QR + moldura) e suas dimensões externas. */
export interface FramedSvg {
  /** SVG autossuficiente, pronto para preview/exportação. */
  readonly svg: string;
  /** Largura externa (≥ `size`; hoje `= size`, sem padding lateral). */
  readonly width: number;
  /** Altura externa (`size` + faixa de legenda). */
  readonly height: number;
}

/** Resultado da codificação: a matriz de módulos e seus metadados. */
export interface QrCode {
  /** Lado da matriz em módulos. */
  readonly size: number;
  /** Matriz `[y][x]` — `true` = módulo escuro. */
  readonly modules: boolean[][];
  /** Versão do QR (1–40). */
  readonly version: number;
  /** Nível de correção efetivo, em letra (`L`|`M`|`Q`|`H`). */
  readonly ecl: string;
}
