# Spec — Leitura de QR Code e código de barras

Código: `src/qr/reader.ts`, `src/qr/barcode.ts`, `src/qr/decode.ts`, `src/app.ts`
(`toggleCamera`, `scanLoop`, `decodeFile`, `renderDecoded`).

## Entradas

| Entrada | Como |
|---|---|
| Câmera | `getUserMedia({ facingMode: 'environment' })`; laço por `requestAnimationFrame` até a primeira leitura; a câmera para ao ler ou ao sair da aba Ler |
| Imagem | seletor de arquivo `image/*`, via `createImageBitmap` |
| Abrir com o app | `file_handlers` do PWA (ver [pwa-e-offline.md](pwa-e-offline.md)) |
| Compartilhar para o app | `share_target` do PWA |

## Modos

**Automático** (QR e barras), **QR Code** ou **Barras**. O modo muda a dica da tela
e filtra o resultado.

## Motores de decodificação (em ordem)

1. **`BarcodeDetector` nativo**, quando existe (Android, ChromeOS, macOS): cobre
   QR e barras numa chamada; o resultado é filtrado pelo modo. Em caso de erro,
   segue para o próximo motor.
2. **jsQR** (QR): a imagem é reduzida para no máximo 1000 px no maior lado, com
   `inversionAttempts: 'attemptBoth'` (lê QR claro sobre escuro).
3. **ZXing-C++ em WebAssembly** (barras, todos os formatos):
   - Imagem parada: `tryHarder: true`.
   - Câmera: modo leve (`tryHarder: false`, `tryDownscale: false`) para não travar o laço.
   - O `.wasm` é servido pela própria origem (`zxing_reader.wasm`) e fica no
     cache do service worker; nunca vem de CDN.

Formatos: QR Code, Micro QR, rMQR, Aztec, Aztec Rune, Data Matrix, PDF417,
Compact PDF417, MicroPDF417, MaxiCode, EAN-13, EAN-8, UPC-A, UPC-E, ISBN,
Code 39/93/128/32, Codabar, ITF, ITF-14, PZN, Telepen, GS1 DataBar
(Omni/Stacked/Limited/Expanded) e DX Film Edge.

## Interpretação do conteúdo (`parseDecoded`)

A função é pura e não usa DOM. As regras são avaliadas nesta ordem; a primeira
que casar define o tipo.

| Tipo | Reconhece | Exibe | Ações |
|---|---|---|---|
| Pix | começa com `000201` e contém `br.gov.bcb.pix` | tipo (estático/dinâmico), recebedor, chave, valor (BRL), descrição, cidade, CEP, MCC, documento, loja, terminal, finalidade, txid, validade do CRC | Copiar código Pix, Copiar chave |
| Contato | `BEGIN:VCARD` | empresa, cargo, telefone, e-mail, site | Salvar contato (`.vcf`), Ligar |
| Evento | `BEGIN:VCALENDAR` / `VEVENT` | local, início, fim (`DD/MM/AAAA HH:MM`) | Adicionar à agenda (`.ics`) |
| Wi-Fi | `WIFI:` | rede, segurança, senha, oculta | Copiar senha |
| Local | `geo:` | latitude, longitude | Abrir no mapa (Google Maps) |
| E-mail | `mailto:` | para, assunto, mensagem | Enviar e-mail |
| Telefone | `tel:` | número | Ligar |
| SMS | `SMSTO:` ou `sms:` | número, mensagem | Enviar SMS |
| WhatsApp | `wa.me`, `api.whatsapp.com`, `web.whatsapp.com` | número, mensagem | Abrir conversa |
| Link | `http(s)://` | URL | Abrir |
| Texto | qualquer outro | texto bruto | — |

Todos os tipos têm também a ação **Copiar** (conteúdo bruto).

### Regras do Pix

- O payload EMV (TLV) é lido localmente. A conta do recebedor é procurada nos
  ids 26 a 51 que contêm o GUI do Pix.
- É **dinâmico** se o campo 01 = `12` ou se houver URL (subcampo 25); caso
  contrário é estático.
- O **CRC16-CCITT** (`6304` + 4 hex) é validado; se falhar, aparece "CRC inválido
  — código possivelmente corrompido".
- O txid `***` é tratado como ausente.
- A URL do Pix dinâmico funciona como token de acesso à cobrança: **não é exibida
  nem acessada**. O app mostra um aviso para a pessoa não compartilhar o código
  nem capturas de tela.
- O app **não gera** Pix; ele só lê.

## Erros

- Sem código na imagem: "Nenhum <modo> encontrado na imagem.". O resultado
  anterior é ocultado, para não ficar um valor velho na tela.
- Falha de câmera ou de imagem: a mensagem do navegador aparece em `#readErr`.

## Testes

`tests/decode.test.ts` (tipos e Pix) e `tests/barcode.test.ts` (ZXing com o
binário injetado via `configureBarcodeReader`).
