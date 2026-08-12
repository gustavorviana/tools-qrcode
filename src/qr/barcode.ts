/*
 * Decodificação de código de barras (fallback do leitor, após o QR falhar).
 * Usa o ZXing (JS puro, embutido) sobre os pixels já rasterizados — funciona
 * em qualquer navegador, inclusive nos desktops onde a BarcodeDetector nativa
 * não existe (Chrome/Edge no Windows/Linux, Firefox). Sem DOM: recebe os pixels.
 */
import {
  BinaryBitmap, HybridBinarizer, RGBLuminanceSource,
  MultiFormatReader, DecodeHintType, BarcodeFormat,
} from '@zxing/library';

/** Pixels RGBA já rasterizados (formato do `ImageData`, mas sem exigir DOM). */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/* Formatos tentados (o QR já foi tentado antes, então fica de fora). */
const FORMATS = [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
  BarcodeFormat.ITF, BarcodeFormat.CODABAR,
  BarcodeFormat.DATA_MATRIX, BarcodeFormat.PDF_417, BarcodeFormat.AZTEC,
];

const hints = (thorough: boolean): Map<DecodeHintType, unknown> => {
  const h = new Map<DecodeHintType, unknown>();
  h.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
  if (thorough) h.set(DecodeHintType.TRY_HARDER, true);
  return h;
};

/** Converte RGBA → luminância (média com peso no verde) → bitmap binarizado do ZXing. */
function toBitmap(img: Pixels): BinaryBitmap {
  const { data, width, height } = img;
  const lum = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; j < lum.length; i += 4, j++) {
    lum[j] = (data[i] + 2 * data[i + 1] + data[i + 2]) >> 2;
  }
  return new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, width, height)));
}

// Leitor reutilizado no loop da câmera (setHints uma vez → decodeWithState é rápido).
let fastReader: MultiFormatReader | null = null;

/**
 * Silencia `console.warn` durante `fn` (síncrona). O MultiFormatReader do ZXing
 * loga uma NotFoundException para cada leitor que não casa — um bug conhecido do
 * port JS (o `instanceof ReaderException` interno falha). Sem isto, cada quadro
 * da câmera sem código poluiria o console do navegador (e a saída dos testes).
 */
function quiet<T>(fn: () => T): T {
  const warn = console.warn;
  console.warn = () => { /* engole o ruído do ZXing */ };
  try { return fn(); } finally { console.warn = warn; }
}

/**
 * Tenta decodificar um código de barras dos pixels. Retorna o texto ou `null`.
 * `thorough` (imagens paradas, ex.: upload) liga o TRY_HARDER — mais robusto,
 * porém mais lento; no loop da câmera fica desligado para não travar.
 */
export function decodeBarcode(img: Pixels, thorough = false): string | null {
  const bitmap = toBitmap(img);
  try {
    return quiet(() => {
      if (thorough) {
        return new MultiFormatReader().decode(bitmap, hints(true)).getText() || null;
      }
      if (!fastReader) {
        fastReader = new MultiFormatReader();
        fastReader.setHints(hints(false));
      }
      return fastReader.decodeWithState(bitmap).getText() || null;
    });
  } catch {
    return null; // NotFoundException e afins → nenhum código no quadro
  }
}
