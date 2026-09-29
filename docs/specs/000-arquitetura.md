# SPEC-000 — Arquitetura, build e entrega

| | |
|---|---|
| **Status** | Implementado |
| **PRD** | [PRD-000](../prd/000-qr-utils.md) |
| **Módulos** | `src/`, `build.mjs`, `public/`, `.github/workflows/ci.yml`, `.github/workflows/pipeline.yml` |
| **Atualizado em** | 2026-09-29 |

## 1. Resumo
SPA em TypeScript, sem framework. O `esbuild` faz o bundle e injeta JS e CSS inline num único `dist/index.html`. Ficam à parte só os arquivos que a plataforma exige: service worker, manifesto, ícones, imagens e o `.wasm` do ZXing. A publicação é estática, num Cloudflare Worker com static assets. Cada PR mesclado em `main` gera uma versão semântica, faz o deploy e cria a tag.

## 2. Módulos e dependências
| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `src/main.ts` | entrada: `new App().init()` | `app` |
| `src/app.ts` | controlador da UI (todas as views) | `format`, `qr/*` |
| `src/format.ts` | funções puras de formato | — |
| `src/qr/designer.ts` | fachada de geração/exportação | `generator`, `frames`, `raster` |
| `src/qr/generator.ts` | codificação e escolha do backend | `qr-code-styling`, `shapes`, `matrix`, `customRenderer` |
| `src/qr/shapes.ts`, `customRenderer.ts`, `matrix.ts` | formas e renderer próprio | `qr-code-styling` (tipos) |
| `src/qr/frames.ts`, `caption.ts`, `logos.ts` | molduras, legenda, logos | — |
| `src/qr/share.ts` | link compartilhável | `shapes` |
| `src/qr/reader.ts`, `barcode.ts`, `decode.ts` | leitura e interpretação | `jsqr`, `zxing-wasm`, `format` |

Dependências de runtime: `qr-code-styling` ^1.9.2, `jsqr` 1.4.0, `zxing-wasm` ^3.1.2.
Dependências de desenvolvimento: `esbuild`, `typescript`, `vitest`, `jsdom`. Node 24.

## 3. Modelo de dados
Não há banco nem back-end. O estado vive em memória na instância `App`. O que persiste:

| Onde | Chave | Conteúdo |
|---|---|---|
| `localStorage` | `installDismissed` | `'1'` |
| Cache Storage | `qr-utils-<versão>` | precache do app |
| Cache Storage | `qr-utils-share` / `shared-image` | imagem recebida via share target (transitória) |
| URL | `#q=…`, `?view=`, `?share-target=1` | ver SPEC-003 e SPEC-005 |

## 4. Componentes
- **`App`** (`src/app.ts`): uma classe com o estado da UI. Os métodos públicos são expostos em `window` por `exposeHandlers()` para os `onclick` do HTML.
- **Registros extensíveis:** `BODY` e `EYE_FRAME` (`shapes.ts`), `LOGOS` (`logos.ts`), `FRAME_CTORS` (`frames.ts`). Adicionar uma entrada basta para aparecer na UI e ser aceita no link.
- **`build.mjs`:** `swVersion()` resolve a versão na ordem `NEW_VERSION` → última tag `v*` → `1.0`.

## 5. Fluxos
**Build** (`npm run build`)
1. Bundle e minificação de `src/main.ts` (IIFE, ES2019, sem comentários legais).
2. Minificação de `src/styles.css`.
3. Injeção em `src/index.html` (`/*__CSS__*/`, `/*__JS__*/`), escapando `</script>` e trocando `__VERSION__`.
4. Cópia de `public/*` (exceto `sw.js`) para `dist/`.
5. Cópia de `node_modules/zxing-wasm/dist/reader/zxing_reader.wasm` para `dist/`.
6. Geração de `dist/sw.js` com `__BUILD_HASH__` trocado pela versão.

**CI** (PR para `main`): `npm ci` → `typecheck` → `test` → `build`.

**Release** (PR mesclado em `main` ou disparo manual)
1. Job `bump`: lê a última tag `vX.Y.Z` e os commits desde ela. `BREAKING CHANGE` ou `!` gera major, `feat` gera minor e o resto gera patch. Sem tag, usa a versão do `package.json`.
2. Job `deploy`: `npm run build` com `NEW_VERSION`, depois `wrangler deploy --name=$CF_PROJECT --assets=dist`.
3. Cria e envia a tag `v<NEW_VERSION>`.

## 6. UI
Views em `src/index.html`, alternadas por `showView()`:

| View | Conteúdo |
|---|---|
| `gen` | geração (SPEC-001, 002, 003) |
| `read` | leitura (SPEC-004) |
| `about` | créditos, formatos, instalar, repositório |
| `privacy` | privacidade (SPEC-006) |
| `share` | QR compartilhado (SPEC-003) |

Há também a barra de instalação, o modal do QR ampliado e o toast.

## 7. Permissões e manifest
Ver SPEC-004 (câmera), SPEC-001 (geolocalização) e SPEC-005 (manifesto).

## 8. Erros e casos de borda
| Situação | Comportamento |
|---|---|
| Build sem git nem `NEW_VERSION` | versão `1.0` |
| Commit só de `docs`/`chore` | ainda gera um bump de patch |
| Bundle contém `</script>` | escapado para `<\/script>` |
| Dois merges seguidos | a pipeline roda em fila (`concurrency: pipeline-main`, sem cancelar) |

## 9. Testes
| Arquivo | Cobre |
|---|---|
| todo o `tests/` | APP-N08 (gate de CI) |
| verificação manual de rede (DevTools) | APP-N01, APP-N02, APP-N05 |

## 10. Plano de implementação
Concluído. Marcos:
1. `e58efef` gerador e leitor iniciais (PWA offline).
2. `7b337e5` migração para TypeScript.
3. `0bd1c2a` Vitest e extração da lógica pura.
4. `64d7c33` versionamento do `sw.js` pela pipeline.
5. `70501e9`, `1e1a058` pipeline de release e deploy via wrangler.
6. `506c1df` CI nos PRs.

## 11. Decisões e alternativas descartadas
- **Arquivo único vs. assets separados:** único, para ser auditável e simples de cachear. Custo: o HTML inteiro é baixado de novo a cada release.
- **Sem framework (React/Vue):** a UI é pequena e o bundle fica menor e sem dependência de runtime.
- **Worker com static assets vs. Pages com build na Cloudflare:** a pipeline do GitHub controla a versão e a tag antes do deploy.
- **Versão por Conventional Commits:** automática, sem editar o `package.json` a cada release.
