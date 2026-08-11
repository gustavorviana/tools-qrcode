/*
 * reader.js — Leitura/decodificação de QR Code.
 * Usa a API nativa BarcodeDetector quando disponível (rápida, em Android/macOS)
 * e cai automaticamente para o jsQR (JS puro) em qualquer outro navegador.
 */
import jsQR from 'jsqr';

let detector = null;
let scanCanvas = null;

function hasDetector() { return 'BarcodeDetector' in window; }

function getScanCanvas() {
  if (!scanCanvas) scanCanvas = document.createElement('canvas');
  return scanCanvas;
}

// Decodifica de um <video> ou ImageBitmap. Retorna o texto do QR ou null.
export async function decodeFrom(source, w, h) {
  if (hasDetector()) {
    try {
      detector = detector || new BarcodeDetector({ formats: ['qr_code'] });
      const codes = await detector.detect(source);
      if (codes && codes.length) return codes[0].rawValue;
    } catch (e) { /* cai para o jsQR */ }
  }
  if (w && h) {
    const cv = getScanCanvas();
    const max = 1000, scale = Math.min(1, max / Math.max(w, h));
    cv.width = Math.max(1, Math.round(w * scale));
    cv.height = Math.max(1, Math.round(h * scale));
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, cv.width, cv.height);
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const res = jsQR(img.data, cv.width, cv.height, { inversionAttempts: 'attemptBoth' });
    if (res && res.data) return res.data;
  }
  return null;
}
