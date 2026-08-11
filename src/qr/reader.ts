/*
 * QRReader — Leitura/decodificação de QR Code.
 * Usa a API nativa BarcodeDetector quando disponível (rápida, em Android/macOS)
 * e cai automaticamente para o jsQR (JS puro) em qualquer outro navegador.
 */
import jsQR from 'jsqr';

interface DetectedBarcode { rawValue: string; }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]>; }
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

/** Decodificador de QR Code a partir de vídeo/imagem. */
export class QRReader {
  private detector: BarcodeDetectorLike | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private get DetectorCtor(): BarcodeDetectorCtor | undefined {
    return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  }

  private getCanvas(): HTMLCanvasElement {
    if (!this.canvas) this.canvas = document.createElement('canvas');
    return this.canvas;
  }

  /** Decodifica de um `<video>` ou `ImageBitmap`. Retorna o texto do QR ou `null`. */
  async decode(source: CanvasImageSource, w?: number, h?: number): Promise<string | null> {
    const Ctor = this.DetectorCtor;
    if (Ctor) {
      try {
        this.detector = this.detector ?? new Ctor({ formats: ['qr_code'] });
        const codes = await this.detector.detect(source);
        if (codes && codes.length) return codes[0].rawValue;
      } catch { /* cai para o jsQR */ }
    }
    if (w && h) {
      const cv = this.getCanvas();
      const max = 1000, scale = Math.min(1, max / Math.max(w, h));
      cv.width = Math.max(1, Math.round(w * scale));
      cv.height = Math.max(1, Math.round(h * scale));
      const ctx = cv.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(source, 0, 0, cv.width, cv.height);
      const img = ctx.getImageData(0, 0, cv.width, cv.height);
      const res = jsQR(img.data, cv.width, cv.height, { inversionAttempts: 'attemptBoth' });
      if (res && res.data) return res.data;
    }
    return null;
  }
}
