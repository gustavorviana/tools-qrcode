/*
 * Decodificação de código de barras (fallback do leitor, após o QR falhar).
 * Usa o ZXing-C++ compilado para WebAssembly (zxing-wasm) — o motor atual e
 * mantido, que lê muito mais simbologias que o antigo port JS (GS1 DataBar,
 * MaxiCode, Micro QR, rMQR, além dos usuais). Roda 100% no cliente; o .wasm é
 * servido pela própria origem (offline, sem CDN) e cacheado pelo service worker.
 */
import { readBarcodes, prepareZXingModule } from 'zxing-wasm/reader';
import type { ReaderOptions, ZXingModuleOverrides } from 'zxing-wasm/reader';

/** Pixels RGBA já rasterizados (formato do `ImageData`, mas sem exigir DOM). */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/*
 * Configuração do módulo WASM. Feita uma única vez; a instanciação em si é
 * preguiçosa (só no primeiro `readBarcodes`). `formats: []` = TODOS os formatos
 * que o ZXing-C++ suporta.
 */
let configured = false;

/**
 * Ajusta de onde o `.wasm` é carregado. Em produção aponta para a própria origem
 * (offline). Os testes injetam o binário direto via `wasmBinary` (o Node não tem
 * `fetch` de arquivo local). Chame antes do primeiro `decodeBarcode`.
 */
export function configureBarcodeReader(overrides: ZXingModuleOverrides): void {
  prepareZXingModule({ overrides });
  configured = true;
}

function ensureConfigured(): void {
  if (configured) return;
  configureBarcodeReader({
    // Por padrão a lib buscaria o .wasm num CDN (jsDelivr). Redirecionamos para o
    // arquivo servido pela própria origem — requisito offline do PWA.
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? 'zxing_reader.wasm' : prefix + path),
  });
}

/* Imagem parada (upload): esforço máximo. Câmera: leve, para não travar o loop. */
const OPTS_THOROUGH: ReaderOptions = { formats: [], tryHarder: true, maxNumberOfSymbols: 1 };
const OPTS_FAST: ReaderOptions = {
  formats: [], tryHarder: false, tryDownscale: false, maxNumberOfSymbols: 1,
};

/**
 * Tenta decodificar um código de barras dos pixels. Retorna o texto ou `null`.
 * `thorough` (imagens paradas, ex.: upload) liga o esforço extra — mais robusto,
 * porém mais lento; no loop da câmera fica leve.
 */
export async function decodeBarcode(img: Pixels, thorough = false): Promise<string | null> {
  ensureConfigured();
  try {
    const results = await readBarcodes(img as unknown as ImageData, thorough ? OPTS_THOROUGH : OPTS_FAST);
    const hit = results.find((r) => r.isValid && r.text);
    return hit ? hit.text : null;
  } catch {
    return null; // nenhum código no quadro / erro de leitura
  }
}
