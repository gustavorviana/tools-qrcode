/*
 * QRReader — Leitura de QR Code e código de barras.
 * Ordem: tenta QR primeiro; se não achar, tenta código de barras.
 * Onde há a API nativa BarcodeDetector (Android/ChromeOS/macOS), ela cobre
 * ambos de uma vez. Caso contrário (Windows/Linux desktop, Firefox, iOS), cai
 * para jsQR (QR) e, na sequência, ZXing (barras) — tudo em JS puro, embutido.
 */
import jsQR from 'jsqr';
import { decodeBarcode } from './barcode';

/** O que procurar: os dois (padrão), só QR, ou só código de barras. */
export type ReadMode = 'auto' | 'qr' | 'barcode';

interface DetectedBarcode { rawValue: string; format?: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]>; }
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

/** Decodificador de QR Code e código de barras a partir de vídeo/imagem. */
export class QRReader {
  private detector: BarcodeDetectorLike | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private get DetectorCtor(): BarcodeDetectorCtor | undefined {
    return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  }

  /** Rasteriza a fonte (vídeo/imagem) num canvas reduzido e devolve os pixels. */
  private toPixels(source: CanvasImageSource, w: number, h: number): ImageData {
    if (!this.canvas) this.canvas = document.createElement('canvas');
    const cv = this.canvas;
    const max = 1000, scale = Math.min(1, max / Math.max(w, h));
    cv.width = Math.max(1, Math.round(w * scale));
    cv.height = Math.max(1, Math.round(h * scale));
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, cv.width, cv.height);
    return ctx.getImageData(0, 0, cv.width, cv.height);
  }

  /**
   * Decodifica de um `<video>` ou `ImageBitmap`. Retorna o texto lido ou `null`.
   * `mode` restringe o que procurar; `thorough` (imagens paradas) deixa a leitura
   * de barras mais robusta e lenta.
   */
  async decode(
    source: CanvasImageSource,
    w?: number, h?: number,
    opts: { mode?: ReadMode; thorough?: boolean } = {},
  ): Promise<string | null> {
    const mode = opts.mode ?? 'auto';
    // Caminho nativo: a BarcodeDetector cobre QR + barras; filtramos o resultado
    // pelo modo escolhido (assim não precisamos recriar o detector ao trocar).
    const Ctor = this.DetectorCtor;
    if (Ctor) {
      try {
        this.detector = this.detector ?? new Ctor();
        const codes = await this.detector.detect(source);
        const hit = codes.find((c) =>
          mode === 'auto' ? true
            : mode === 'qr' ? c.format === 'qr_code'
              : !!c.format && c.format !== 'qr_code');
        if (hit) return hit.rawValue;
      } catch { /* cai para os decodificadores em JS */ }
    }
    if (!w || !h) return null;

    const img = this.toPixels(source, w, h);
    // QR primeiro (jsQR); depois código de barras (ZXing) — conforme o modo.
    if (mode !== 'barcode') {
      const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      if (qr && qr.data) return qr.data;
    }
    if (mode !== 'qr') return decodeBarcode(img, opts.thorough ?? false);
    return null;
  }
}
