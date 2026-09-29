# SPEC-007 — Site multipágina e SEO

| | |
|---|---|
| **Status** | Implementado |
| **PRD** | [PRD-007](../prd/007-site-multipagina.md) |
| **Módulos** | `src/site/catalog.ts`, `src/site/render.ts`, `src/site/icons.ts`, `src/templates/`, `build.mjs`, `src/app.ts`, `src/styles.css`, `public/sw.js`, `public/manifest.webmanifest` |
| **Atualizado em** | 2026-09-29 |

## 1. Resumo
O site continua 100% estático. Um catálogo em TypeScript (`catalog.ts`) descreve os tipos de QR e as páginas. No build, o `esbuild` compila `render.ts` para um módulo Node temporário, que monta cada página a partir de templates HTML com includes e marcadores. Cada página vira `dist/<caminho>/index.html`. Todas compartilham o mesmo `/app.js` e `/app.css`. No navegador, o `App` lê `<body data-page data-type>` e liga só o que existe na página. A personalização acontece na própria página, então nenhum dado trafega entre páginas.

## 2. Módulos e dependências
| Módulo | Papel | Depende de |
|---|---|---|
| `src/site/catalog.ts` | `TYPES`, `MAIN_TYPES`, `OTHER_TYPES`, `PAGES`, `typeHref`, `pageUrl` | — |
| `src/site/icons.ts` | `iconSvg(name, size)` (marcas, glifos dos logos, glifos próprios) | `src/qr/logos.ts` |
| `src/site/render.ts` | `fill`, `renderPage`, `renderSitemap`, `structuredData`, `escHtml` (puros) | `catalog`, `icons` |
| `src/templates/layout.html` | head (SEO), cabeçalho, `<main>`, rodapé, overlays, `<script src="/app.js">` | — |
| `src/templates/pages/*.html` | corpo por tipo de página: `home`, `generator`, `reader`, `privacy` | partials |
| `src/templates/partials/*.html` | `customize`, `download`, `reader`, `formats`, `about`, `privacy`, `share-view`, `overlays` | — |
| `src/templates/fields/<tipo>.html` | campos de cada um dos 21 tipos | — |
| `build.mjs` | bundle, render, sitemap, cópia de assets, SW | esbuild |

Não foi adicionada nenhuma dependência nova.

## 3. Modelo de dados
```ts
interface QrType { id: string; label: string; desc: string; icon: string }
interface Faq { q: string; a: string }
interface SitePage {
  path: string;                        // '/', '/wifi/', '/zoom/'…
  kind: 'home' | 'gen' | 'read' | 'privacy';
  type?: string;                       // página de tipo
  title: string; description: string; label: string;
  h1: string; intro: string; steps?: string[]; faq?: Faq[];
}
interface Templates { layout; pages: Record<kind, string>; partials: Record<string, string>; fields: Record<string, string> }
```

**Sintaxe dos templates**

| Marcador | Efeito |
|---|---|
| `{{x}}` | valor escapado |
| `{{{x}}}` | valor cru |
| `<!--@include nome-->` | partial (um partial inexistente é erro de build) |

**URLs**

| Caminho | Página |
|---|---|
| `/` | home |
| `/link/`, `/wifi/`, `/whatsapp/`, `/texto/`, `/contato/`, `/email/`, `/telefone/`, `/instagram/` | tipos em destaque |
| `/sms/`, `/local/`, `/evento/`, `/facebook/`, `/telegram/`, `/youtube/`, `/tiktok/`, `/x/`, `/linkedin/`, `/paypal/`, `/mecard/`, `/app/`, `/zoom/` | demais tipos (atrás de \"Mais tipos\" na home) |
| `/ler/` | leitor |
| `/privacidade/` | privacidade |

Link compartilhado: sempre `/#q=…` (ver SPEC-003).

## 4. Componentes
```ts
function renderPage(p: SitePage, t: Templates, version: string): string
function renderSitemap(lastmod: string): string
function structuredData(p: SitePage): string   // <script type="application/ld+json">
function fill(tpl: string, vars: Record<string,string>, partials?: Record<string,string>): string
function typeHref(id: string): string          // '/wifi/', '/zoom/'…
function iconSvg(name: string, size?: number): string
```
No `App` (`src/app.ts`):
- `page` vem de `data-page`;
- `scrollToEl(id)`;
- `toggleShareView(on)` (home);
- `exitShared()` → `location.assign('/')`;
- `handleLaunch()`: `?view=` → redirect; share target e `launchQueue` só em `/ler/`.

## 5. Fluxos
**Build**
1. `app.js` e `app.css` (minificados).
2. Compila `render.ts` para `dist/.site.mjs`, importa e apaga o arquivo.
3. Lê `layout`, `pages`, `partials` e `fields`; para cada `PAGES`, gera `renderPage` → `dist/<path>/index.html`.
4. Gera `sitemap.xml`.
5. Copia `public/` e o `.wasm`.
6. `sw.js` recebe a versão e a lista de páginas no lugar de `'__PAGES__'`.

**Montagem de uma página de tipo:** `generator.html` recebe os campos daquele tipo e os partials `customize` + `download`, mais o `guide` (Como fazer, FAQ e "← Voltar ao início").

**Navegador**
- `init()` → se `gen`: monta os controles de forma e logo e define `currentType` por `data-type`.
- Se `home`: `initShared()` e escuta `hashchange`.

**Compartilhar:** a URL gerada é sempre `origin + '/#' + query`, a partir de qualquer página.

## 6. UI
- **Cabeçalho** fixo (`.site-header`): marca + nav, com `aria-current` na seção atual.
- **Home:**
  - hero com selo "100% no seu navegador";
  - `.read-card` escuro ("Ler QR Code ou código de barras") logo abaixo do hero, antes dos tipos;
  - `.type-grid` (1/2/3 colunas em <640/≥640/≥960 px) com `.type-card` dos 8 tipos em destaque;
  - divisor `<details class="more-types">` ("——— Mais tipos ⌄ ———") que expande os cards dos demais tipos. Os links ficam no HTML mesmo com ele fechado, e ele funciona sem JS;
  - "Como funciona" (`.how-steps`);
  - "Sobre" (`.pillars` + cards de privacidade, instalar, créditos, projeto).
- **Leitor (`/ler/`):** mesma largura da home (`.page.page-wide`, a do `<main>`); as páginas de tipo usam a coluna de 760 px.
- **Página de tipo:** breadcrumb, `.page-head` (ícone + H1 + lead), etapas 1/2/3 como antes, "Como fazer", FAQ (`<details class="faq">`) e o link "← Voltar ao início". Não lista outros tipos.
- **Rodapé:** links para todas as páginas de tipo e para o leitor, privacidade e código aberto.

## 7. Permissões e manifest
- `start_url` e `scope` = `/`; ícones com caminho absoluto.
- Atalhos: "Ler" → `/ler/`, "Criar" → `/`.
- `file_handlers.action` = `/ler/`; `share_target.action` = `/share-target`. O SW redireciona para `/ler/?share-target=1`.

## 8. Erros e casos de borda
| Situação | Comportamento |
|---|---|
| Tipo sem `fields/<tipo>.html` | build falha (`campos inexistentes para o tipo`) |
| Partial inexistente | build falha |
| Marcador sem valor | vira string vazia |
| `/?view=read` / `?view=about` | redireciona para `/ler/` / `/#sobre` |
| `/#q=…` em outra página que não a home | ignorado (os links gerados sempre apontam para `/`) |
| Offline numa página nunca visitada | o precache cobre todas as páginas do catálogo; sem cache, cai na `/` |
| Texto do catálogo com `<`, `&`, `"` | escapado no HTML; `<` escapado no JSON-LD |

## 9. Testes
| Teste | Cobre |
|---|---|
| `site.test.ts` › catálogo (caminhos, campos por tipo, `typeHref`, limites de título/descrição) | WEB-F03, WEB-N03 |
| `site.test.ts` › `fill`, `escHtml` | WEB-N07 |
| `site.test.ts` › `renderPage` (título/canonical/H1 únicos, campos por página, home, sem script externo) | WEB-F01 a WEB-F05, WEB-N02, WEB-N04 |
| `site.test.ts` › JSON-LD e sitemap | WEB-F09, WEB-N03 |
| Playwright (roteiro): fluxo Wi-Fi, `/#q=`, `?view=read`, `/sms/`, offline em `/zoom/`, gerar → baixar → ler | WEB-F06, WEB-F10, WEB-N01, WEB-N05 |

## 10. Plano de implementação
Concluído em `1c46222`:
1. catálogo, ícones e renderizador;
2. divisão do `index.html` em templates e partials;
3. `App` orientado a página;
4. CSS do novo layout;
5. SW e manifest multipágina;
6. testes.

## 11. Decisões e alternativas descartadas
- **Personalizar na mesma página vs. página separada com dados no `#` ou num POST:** na mesma página nada trafega. Um POST enviaria o conteúdo ao servidor (e a hospedagem estática nem o aceita). O `#` deixaria o conteúdo (ex.: a senha do Wi-Fi) no histórico do navegador.
- **Partials no build vs. HTML repetido à mão:** uma fonte por trecho; a repetição fica só no `dist/`.
- **`app.js` compartilhado vs. JS inline por página:** o bundle tem cerca de 267 KB. Inline, ele seria baixado de novo a cada página; compartilhado, fica em cache. Isso troca o princípio "arquivo único" por "tudo na própria origem" (APP-N05).
- **Templating próprio (≈40 linhas) vs. biblioteca (Handlebars, Eta):** o necessário é pouco; não há dependência nova.
- **Uma página por tipo, sem `/mais/` nem "Outros tipos" nas páginas:** cada tipo é uma porta de entrada própria no Google, e as páginas ficam focadas (só o caminho de volta ao início). A lista de tipos vive só na home; o rodapé não repete os links (o `sitemap.xml` já os expõe ao Google).
- **URLs curtas (`/wifi/`):** escolha do produto; o termo de busca vai no título e no H1.
