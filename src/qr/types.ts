/** Tipos compartilhados do domínio de QR Code. */

/** Nível de correção de erro. */
export type Ecl = 'LOW' | 'MEDIUM' | 'QUARTILE' | 'HIGH';

/** Forma dos módulos no render (mapeadas para os estilos da qr-code-styling). */
export type ModuleShape = 'solid' | 'rounded' | 'dots' | 'classy';

/** Estilo de moldura ao redor do QR. */
export type FrameStyle = 'none' | 'corners' | 'border' | 'label';

/** Par de cores do QR: módulos (`fg`) e fundo (`bg`). */
export interface QrColors {
  fg: string;
  bg: string;
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
