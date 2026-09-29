# Spec — Arquitetura, build e entrega

## Stack

- TypeScript, sem framework. A UI é HTML estático com handlers `onclick`
  expostos em `window` (`App.exposeHandlers`).
- Dependências de runtime: `qr-code-styling` (codificação + formas "lib"),
  `jsqr` (leitura de QR), `zxing-wasm` (leitura de barras).
- Ferramentas: `esbuild` (bundle), `typescript` (typecheck), `vitest` + `jsdom` (testes).
- Node: versão em `.node-version`; o CI usa Node 24.

## Módulos

| Módulo | Responsabilidade |
|---|---|
| `src/main.ts` | ponto de entrada: `new App().init()` |
| `src/app.ts` | controlador da UI: abas, formulários, personalização, exportação, leitor, mapa, PWA |
| `src/format.ts` | funções puras: escapes, máscaras, datas iCal, URLs de redes sociais, PayPal, MeCard, Zoom |
| `src/qr/designer.ts` | fachada `QRDesigner`: coordena gerador + moldura; exporta SVG e canvas |
| `src/qr/generator.ts` | `QrGenerator`: codifica pela lib e escolhe o backend (`lib` ou `custom`) |
| `src/qr/shapes.ts` | registro de formas (corpo, moldura e centro do olho) |
| `src/qr/customRenderer.ts` | renderer próprio e puro a partir da matriz |
| `src/qr/matrix.ts` | único ponto que acessa o interior da lib (`_qr`) para extrair a matriz |
| `src/qr/frames.ts`, `caption.ts` | molduras e layout da legenda |
| `src/qr/logos.ts` | registro de logos prontos |
| `src/qr/raster.ts` | prepara o SVG para rasterizar sem as linhas entre módulos |
| `src/qr/share.ts` | serialização e validação do link compartilhável |
| `src/qr/reader.ts`, `barcode.ts` | leitura (nativo → jsQR → ZXing) |
| `src/qr/decode.ts` | interpretação pura do conteúdo lido |

Padrão de extensão: formas, logos e molduras são **registros**. Adicionar um item
não exige `switch` nem alteração de UI ou de validação.

## Build (`build.mjs`)

1. Faz o bundle e minifica `src/main.ts` num IIFE ES2019 (sem comentários legais).
2. Minifica `src/styles.css`.
3. Injeta CSS e JS no template `src/index.html` (`/*__CSS__*/`, `/*__JS__*/`),
   escapa `</script>` e substitui `__VERSION__`.
4. Copia `public/*` para `dist/`.
5. Copia `zxing_reader.wasm` de `node_modules` para `dist/`.
6. Gera `dist/sw.js` com a versão no nome do cache.

Resultado: um `dist/index.html` autocontido, mais os arquivos que a plataforma exige.

## Scripts

`build`, `typecheck`, `test`, `test:watch`, `preview` (porta 5000) e
`preview:online` (túnel HTTPS para testar no celular).

## Qualidade

- **CI** (`.github/workflows/ci.yml`), em todo PR para `main`: typecheck, testes
  e build. Serve de gate de merge.
- Testes em `tests/` cobrem as partes puras (formatação, decode, share, formas,
  renderer, molduras, logos, raster, barcode) e a integração com a lib.

## Versionamento e deploy (`.github/workflows/pipeline.yml`)

- Dispara quando um PR é **mesclado** em `main`, ou manualmente.
- **Bump** por Conventional Commits desde a última tag `vX.Y.Z`: `BREAKING
  CHANGE`/`!` gera major, `feat` gera minor e qualquer outro commit gera patch.
- **Deploy:** `npm run build` com `NEW_VERSION` e publicação via
  `wrangler deploy --assets=dist` (Cloudflare Worker com static assets; nome em
  `vars.CF_PROJECT`).
- Cria e envia a tag `v<NEW_VERSION>` marcando a versão publicada.

## SEO (estado atual)

- `<title>`, `meta description`, `canonical`, Open Graph/Twitter com
  `og-image.png` (1200×630) e JSON-LD `WebApplication`.
- `robots.txt` libera tudo e aponta para o sitemap; `sitemap.xml` lista só a raiz.
- O app é uma página única: as abas (`?view=`) usam a mesma URL canônica.
