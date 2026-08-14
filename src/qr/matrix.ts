/*
 * Extração da matriz de módulos do QR. É a ÚNICA parte que toca o interior da
 * qr-code-styling (o objeto privado `_qr`, que expõe `isDark`/`getModuleCount`).
 * Devolve uma `QrMatrix` pura (booleanos + detecção dos olhos) que o renderer
 * próprio consome sem conhecer a lib — o que mantém o renderer testável.
 */
import type { QRCode } from 'qr-code-styling';

/** Matriz de módulos + utilitário para saber se (x,y) pertence a um olho (finder). */
export interface QrMatrix {
  /** Lado da matriz em módulos. */
  readonly size: number;
  /** `modules[y][x]` — `true` = módulo escuro. */
  readonly modules: boolean[][];
  /** (x,y) cai numa das 3 regiões 7×7 dos finders? */
  isFinder(x: number, y: number): boolean;
  /** Cantos (x,y em módulos) dos 3 finders 7×7. */
  readonly finders: ReadonlyArray<{ x: number; y: number }>;
}

/** Constrói uma `QrMatrix` a partir de uma matriz booleana já pronta (pura, testável). */
export function toMatrix(modules: boolean[][]): QrMatrix {
  const size = modules.length;
  // Cantos dos 3 finders: topo-esq, topo-dir, baixo-esq (cada um 7×7).
  const finders = [
    { x: 0, y: 0 },
    { x: size - 7, y: 0 },
    { x: 0, y: size - 7 },
  ];
  const isFinder = (x: number, y: number): boolean =>
    finders.some((f) => x >= f.x && x < f.x + 7 && y >= f.y && y < f.y + 7);
  return { size, modules, isFinder, finders };
}

/** Lê a matriz do `_qr` da instância da qr-code-styling. */
export function extractMatrix(qr: QRCode): QrMatrix {
  const size = qr.getModuleCount();
  const modules: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) row.push(qr.isDark(y, x)); // isDark(row, col) = (y, x)
    modules.push(row);
  }
  return toMatrix(modules);
}
