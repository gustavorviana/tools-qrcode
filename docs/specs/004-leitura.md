# SPEC-004 — Leitura de QR Code e código de barras

| | |
|---|---|
| **Status** | Implementado |
| **PRD** | [PRD-004](../prd/004-leitura.md) |
| **Módulos** | `src/qr/reader.ts`, `src/qr/barcode.ts`, `src/qr/decode.ts`, `src/app.ts` |
| **Atualizado em** | 2026-09-29 |

## 1. Resumo
O `QRReader.decode()` tenta três motores em cascata:
1. `BarcodeDetector` nativo;
2. jsQR, para QR;
3. ZXing-C++ em WASM, para barras e demais 2D.

O modo de leitura filtra o que é aceito. O texto lido passa por `parseDecoded()`, uma função pura que classifica o tipo e extrai os campos. `renderDecoded()` monta o cartão de detalhes com as ações do tipo.

## 2. Módulos e dependências
| Módulo | Depende de |
|---|---|
| `reader.ts` (`QRReader`) | `jsqr`, `barcode.ts`, `BarcodeDetector` (quando existe) |
| `barcode.ts` | `zxing-wasm/reader`; binário `zxing_reader.wasm` na raiz da origem |
| `decode.ts` | `format.ts` (`icalGet`) |
| `app.ts` | `toggleCamera`, `scanLoop`, `stopCamera`, `readFromFile`, `decodeFile`, `showResult`, `hideResult`, `setReadMode`, `renderDecoded` |

## 3. Modelo de dados
```ts
type ReadMode = 'auto' | 'qr' | 'barcode';
type DecodedType = 'text' | 'link' | 'tel' | 'sms' | 'email' | 'wifi' | 'geo' | 'vcard' | 'event' | 'whatsapp' | 'pix';
interface Decoded {
  type: DecodedType;
  url?; number?; msg?; to?; subject?; body?; ssid?; sec?; pass?; hidden?;
  lat?; lng?; name?; tel?; email?; org?; title?; loc?; start?; end?; text?;
  pixKey?; city?; amount?; txid?; desc?; dynamic?; cep?; currency?; mcc?;
  billNumber?; storeLabel?; terminalLabel?; purpose?; valid?;
}
interface Pixels { data: Uint8ClampedArray; width: number; height: number }
```
Campos EMV do Pix lidos: `01` (método), `26`–`51` (conta com o GUI `br.gov.bcb.pix`: `01` chave, `02` descrição, `25` URL), `52` MCC, `53` moeda, `54` valor, `59` nome, `60` cidade, `61` CEP, `62` (`01` documento, `03` loja, `05` txid, `07` terminal, `08` finalidade), `63` CRC.

## 4. Componentes
```ts
class QRReader {
  decode(source: CanvasImageSource, w?: number, h?: number,
         opts?: { mode?: ReadMode; thorough?: boolean }): Promise<string | null>
}
function configureBarcodeReader(overrides: ZXingModuleOverrides): void
function decodeBarcode(img: Pixels, thorough?: boolean): Promise<string | null>
function parseDecoded(raw: string): Decoded
```

## 5. Fluxos
**Decodificar (`QRReader.decode`)**
1. Se existe `BarcodeDetector`: cria uma vez, chama `detect` e filtra pelo modo (`qr_code` × demais). Se achou, retorna. Em caso de exceção, segue.
2. Sem `w`/`h`: retorna `null`.
3. Reduz para no máximo 1000 px no maior lado (canvas reutilizado, `willReadFrequently`).
4. Modo ≠ `barcode`: jsQR com `inversionAttempts: 'attemptBoth'`.
5. Modo ≠ `qr`: `decodeBarcode(img, thorough)` com `formats: []` (todos) e `maxNumberOfSymbols: 1`. `thorough` liga `tryHarder`; na câmera, também desliga `tryDownscale`.

**Câmera:** `getUserMedia({ video: { facingMode: 'environment' } })` → `video.play()` → `scanLoop` por `requestAnimationFrame` → na primeira leitura, `showResult` e `stopCamera`.

**Imagem:** `createImageBitmap(file)` → `decode(…, { thorough: true })`.

**Interpretação (`parseDecoded`)**, nesta ordem: Pix → vCard → VCALENDAR/VEVENT → `WIFI:` → `geo:` → `mailto:` → `tel:` → `SMSTO:` → `sms:` → WhatsApp (`wa.me`, `api.`/`web.whatsapp.com`) → `http(s)://` → texto.

**Pix:** `dynamic = campo01 === '12' || URL presente`. O CRC16-CCITT-FALSE (poly `0x1021`, init `0xFFFF`) é calculado sobre tudo antes dos 4 hex finais, exigindo `6304` antes deles. O txid `***` vira vazio.

## 6. UI
- `#readModeTabs` (Automático, QR Code, Barras), `#scanBox` com `<video>` e retícula, "Escanear com a câmera" / "Parar câmera", "Ler de uma imagem", `#readErr` e `#readHint`.
- `#resultCard` → `.detail`: ícone, tipo, título, linhas de campo e barra de ações.

| Tipo | Ações |
|---|---|
| link | Abrir |
| tel | Ligar |
| sms | Enviar SMS |
| email | Enviar e-mail |
| wifi | Copiar senha |
| geo | Abrir no mapa (Google Maps) |
| vcard | Salvar contato (`contato.vcf`), Ligar |
| event | Adicionar à agenda (`evento.ics`) |
| whatsapp | Abrir conversa |
| pix | Copiar código Pix, Copiar chave |
| todos | Copiar |

## 7. Permissões e manifest
- **Câmera:** pedida pelo navegador ao tocar em "Escanear com a câmera"; exige HTTPS.
- Leitura por imagem sem permissão (seletor de arquivo). `file_handlers` e `share_target`: ver SPEC-005.

## 8. Erros e casos de borda
| Situação | Comportamento |
|---|---|
| Câmera negada ou inexistente | "Não foi possível acessar a câmera: <msg>" e câmera parada |
| Nenhum código na imagem | "Nenhum <modo> encontrado na imagem."; resultado anterior ocultado |
| Imagem ilegível | "Falha ao ler a imagem: <msg>"; resultado anterior ocultado |
| Frame da câmera com erro | ignorado; o laço continua |
| `BarcodeDetector` lança erro | cai para jsQR/ZXing |
| QR invertido (claro sobre escuro) | lido (`attemptBoth`) |
| Pix com CRC inválido | linha "CRC inválido — código possivelmente corrompido" |
| Pix dinâmico | URL não exibida nem acessada; aviso de dados pessoais |
| Moeda do Pix ≠ 986 | valor sem formatação BRL e linha "Moeda" |
| Sair da aba Ler | `stopCamera()` |

## 9. Testes
| Teste | Cobre |
|---|---|
| `decode.test.ts` (link, texto, tel, sms, mailto, Wi-Fi, geo, vCard, evento, WhatsApp) | LER-F05 |
| `decode.test.ts` (6 casos de Pix, incluindo CRC inválido) | LER-F07, LER-N05 |
| `barcode.test.ts` (Code 39 round-trip, numérico, imagem vazia, ruído) | LER-F04, LER-N03 |
| roteiro manual (câmera, Windows sem `BarcodeDetector`) | LER-F01 a LER-F03, LER-N02, LER-N04, LER-N06 |

## 10. Plano de implementação
Concluído. Marcos: `e58efef` (leitor QR), `bc75150` (barras e seletor de modo), `a44e7f6` (migração para `zxing-wasm`), `b4f9c81` (Pix).

## 11. Decisões e alternativas descartadas
- **Nativo primeiro:** mais rápido onde existe; cobre QR e barras numa chamada.
- **jsQR antes do ZXing** para QR: leve e confiável; o ZXing fica para o que o jsQR não lê.
- **`zxing-wasm` em vez do port JS antigo do ZXing:** mantido, lê mais simbologias (GS1 DataBar, MaxiCode, rMQR).
- **`.wasm` na própria origem** em vez do CDN padrão da lib: offline e sem terceiros.
- **Não acessar a URL do Pix dinâmico:** ela funciona como token da cobrança; acessá-la vazaria dados e contradiz a proposta local.
