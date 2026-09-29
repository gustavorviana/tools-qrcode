# PRD-007 — Site multipágina e SEO

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-007](../specs/007-site-multipagina.md) |
| **Módulo** | `src/site/`, `src/templates/`, `build.mjs`, `src/app.ts`, `src/styles.css` |
| **Atualizado em** | 2026-09-29 |

## 1. Problema
- O app era uma página única com abas. No celular parecia um "app" improvisado.
- Havia **uma URL só**, então o Google não tinha uma página específica para mostrar em buscas como "qr code wifi" ou "qr code whatsapp". O site só aparecia pela marca ("qrcode utils viana").
- A página inicial mostrava um formulário sem explicar o que o produto faz. O texto sobre o produto ficava escondido numa aba.

## 2. Objetivos
- Ter uma home clara, com um bloco (card) para cada tipo de QR e seções "Como funciona" e "Sobre".
- Ter uma página indexável por tipo principal, cada uma com título, descrição, H1 e texto próprios.
- Manter a promessa de privacidade: o conteúdo digitado nunca vai ao servidor, nem na URL nem num POST.
- Manter o app offline e instalável, agora com várias páginas.

## 3. Cenários de uso
- Busco "qr code wifi" no Google, caio direto em `/wifi/`, preencho a rede e baixo o QR sem passar pela home.
- Abro o site pela primeira vez, vejo os tipos em cards, escolho "WhatsApp" e entendo pela página o que vai acontecer.
- Quero um tipo menos comum (Zoom). Na home, toco no chip "Zoom" e caio em `/mais/?tipo=zoom` já com o tipo selecionado.
- Recebo um link compartilhado antigo (`/#q=…`) e ele continua abrindo o QR.

## 4. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| WEB-F01 | Home com H1, cards dos 8 tipos principais (ícone, nome, descrição, seta), chips dos demais tipos e card para o leitor | Must |
| WEB-F02 | Home com as seções "Como funciona" (3 passos) e "Sobre" (`#sobre`) | Must |
| WEB-F03 | Uma página por tipo principal: `/link/`, `/wifi/`, `/whatsapp/`, `/texto/`, `/contato/`, `/email/`, `/telefone/`, `/instagram/` | Must |
| WEB-F04 | Página `/mais/` com seletor para os outros 13 tipos; `?tipo=<id>` pré-seleciona o tipo | Should |
| WEB-F05 | Páginas `/ler/` (leitor) e `/privacidade/` | Must |
| WEB-F06 | Em cada página de tipo, a personalização e o download acontecem na própria página | Must |
| WEB-F07 | Cabeçalho fixo com Criar, Ler QR Code e Sobre; rodapé com links para todas as páginas de tipo | Should |
| WEB-F08 | Cada página tem "Como fazer", perguntas frequentes e links para os outros tipos | Should |
| WEB-F09 | `sitemap.xml` com todas as páginas | Must |
| WEB-F10 | Links e atalhos antigos continuam funcionando: `/#q=…` abre o QR compartilhado; `?view=read` leva a `/ler/` | Must |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| WEB-N01 | O conteúdo digitado não é enviado ao servidor nem colocado na URL. A única exceção é o link compartilhado, que a pessoa gera por escolha própria e que fica no fragmento `#`. |
| WEB-N02 | JS e CSS em arquivos únicos da própria origem (`/app.js`, `/app.css`), cacheados entre páginas; nenhum CDN. |
| WEB-N03 | Cada página tem `<title>` (≤ 75 caracteres), `meta description` (≤ 165), `canonical`, Open Graph e JSON-LD próprios. |
| WEB-N04 | O HTML de cada página vem pronto do build (conteúdo indexável sem executar JS). |
| WEB-N05 | Todas as páginas funcionam offline após a primeira visita. |
| WEB-N06 | Layout legível a partir de 360 px de largura, com cards em 1, 2 ou 3 colunas conforme a tela. |
| WEB-N07 | Cada trecho de HTML (campos, personalização, download) tem uma única fonte nos templates. |

## 6. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| Tipos com página própria (`MAIN_TYPES`) | link, wifi, whatsapp, text, vcard, email, tel, instagram | qualquer tipo de `TYPES` |
| Tipo inicial em `/mais/` | o primeiro de `MORE_TYPES` (SMS) | `?tipo=` com um tipo de `MORE_TYPES` |

## 7. Critérios de aceite
- [ ] `npm run build` gera `dist/index.html` e uma pasta por página do catálogo.
- [ ] Cada HTML tem título, canonical e exatamente um H1 próprios (`tests/site.test.ts`).
- [ ] Em `/wifi/`: preencher, gerar, personalizar e baixar o PNG, sem sair da página.
- [ ] Nenhuma requisição fora da origem no fluxo acima (Playwright).
- [ ] `/#q=https%3A%2F%2Fexemplo.com` mostra o QR compartilhado; `/?view=read` vai para `/ler/`.
- [ ] Offline, após visitar `/`, as páginas `/wifi/`, `/ler/` e `/mais/?tipo=sms` abrem e geram o QR.
- [ ] O Google Search Console aceita o novo `sitemap.xml`.

## 8. Questões em aberto
- **Quais tipos merecem página própria?** Provisório: os 8 de `MAIN_TYPES`. Reavaliar com os dados do Search Console; promover um tipo é só mover o id para `MAIN_TYPES` e escrever os textos no catálogo.
- **Página de Pix (gerar):** candidata forte a página própria. Depende de implementar a geração de BR Code.
- **Versão em inglês (`/en/`):** fora do escopo desta fase.
- **Domínio próprio:** manter `qr.tools.grviana.com.br` por enquanto.
