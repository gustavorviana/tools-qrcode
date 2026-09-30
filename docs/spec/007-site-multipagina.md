# SPEC-007 — Site multipágina e SEO

| | |
|---|---|
| **Status** | Implementado |
| **Design** | [DESIGN-007](../design/007-site-multipagina.md) |
| **Módulo** | `src/site/`, `src/templates/`, `build.mjs`, `src/app.ts`, `src/styles.css` |
| **Atualizado em** | 2026-09-30 |

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
- Quero um tipo menos comum (Zoom). Na home, toco no divisor "Mais tipos", a lista se expande e toco em "Zoom", que abre `/zoom/`.
- Recebo um link compartilhado antigo (`/#q=…`) e ele continua abrindo o QR.

## 4. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| WEB-F01 | Home com H1, card para o leitor logo abaixo do título (antes das opções de geração), cards dos 8 tipos mais usados (ícone, nome, descrição, seta) e um divisor "Mais tipos" que expande os cards dos outros 13 tipos | Must |
| WEB-F02 | Home com as seções "Como funciona" (3 passos) e "Sobre" (`#sobre`) | Must |
| WEB-F03 | Uma página por tipo (21): `/link/`, `/wifi/`, `/whatsapp/`, `/texto/`, `/contato/`, `/email/`, `/telefone/`, `/instagram/`, `/sms/`, `/local/`, `/evento/`, `/facebook/`, `/telegram/`, `/youtube/`, `/tiktok/`, `/x/`, `/linkedin/`, `/paypal/`, `/mecard/`, `/app/`, `/zoom/` | Must |
| WEB-F05 | Páginas `/ler/` (leitor) e `/privacidade/` | Must |
| WEB-F06 | Em cada página de tipo, a personalização e o download acontecem na própria página | Must |
| WEB-F07 | Cabeçalho fixo com Criar, Ler QR Code e Sobre; rodapé só com Privacidade e Código aberto | Should |
| WEB-F08 | Cada página de tipo tem "Como fazer", perguntas frequentes e só um caminho de volta (breadcrumb e "Voltar ao início"); não lista outros tipos | Should |
| WEB-F09 | `sitemap.xml` com todas as páginas | Must |
| WEB-F10 | Links e atalhos antigos continuam funcionando: `/#q=…` abre o QR compartilhado; `?view=read` leva a `/ler/` | Must |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| WEB-N01 | O conteúdo digitado não é enviado ao servidor nem colocado na URL. A única exceção é o link compartilhado, que a pessoa gera por escolha própria e que fica no fragmento `#`. |
| WEB-N02 | JS e CSS em arquivos únicos da própria origem (`/app.js`, `/app.css`), cacheados entre páginas; nenhum CDN. A única exceção é o `/phone.js` (lib de telefones), carregado só nas páginas com campo de telefone. |
| WEB-N03 | Cada página tem `<title>` (≤ 75 caracteres), `meta description` (≤ 165), `canonical`, Open Graph e JSON-LD próprios. |
| WEB-N04 | O HTML de cada página vem pronto do build (conteúdo indexável sem executar JS). |
| WEB-N05 | Todas as páginas funcionam offline após a primeira visita. |
| WEB-N06 | Layout legível a partir de 360 px de largura, com cards em 1, 2 ou 3 colunas conforme a tela. |
| WEB-N07 | Cada trecho de HTML (campos, personalização, download) tem uma única fonte nos templates. |

## 6. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| Tipos em destaque na home (`MAIN_TYPES`) | link, wifi, whatsapp, text, vcard, email, tel, instagram | qualquer tipo de `TYPES` (os demais ficam atrás do divisor "Mais tipos") |

## 7. Critérios de aceite
| ID | Requisito | Critério | Verificação |
|---|---|---|---|
| AC-WEB-F01.1 | WEB-F01 | A home deve ter um card por tipo; os 8 de `MAIN_TYPES` visíveis e os demais atrás de "Mais tipos". | `site.test.ts` (card por tipo) + manual (divisor) |
| AC-WEB-F01.2 | WEB-F01 | O card do leitor deve aparecer logo abaixo do H1, antes dos cards de geração. | manual |
| AC-WEB-F02.1 | WEB-F02 | A home deve ter "Como funciona" com 3 passos e a seção `#sobre`. | `site.test.ts` (`#sobre`) + manual |
| AC-WEB-F03.1 | WEB-F03, WEB-F05 | `npm run build` deve gerar `dist/index.html` e uma pasta por página do catálogo. | `site.test.ts` |
| AC-WEB-F03.2 | WEB-F03 | Cada página de tipo deve trazer só os campos daquele tipo. | `site.test.ts` |
| AC-WEB-F06.1 | WEB-F06 | Em `/wifi/`, a pessoa deve preencher, gerar, personalizar e baixar o PNG sem sair da página. | manual |
| AC-WEB-F07.1 | WEB-F07 | Todas as páginas devem ter o cabeçalho com Criar, Ler QR Code e Sobre, e o rodapé só com Privacidade e Código aberto. | manual |
| AC-WEB-F08.1 | WEB-F08 | Uma página de tipo não deve listar outros tipos; deve ter breadcrumb e "Voltar ao início". | `site.test.ts` |
| AC-WEB-F09.1 | WEB-F09 | O `sitemap.xml` deve listar todas as páginas, e o Search Console deve aceitá-lo. | `site.test.ts` + manual |
| AC-WEB-F10.1 | WEB-F10 | `/#q=https%3A%2F%2Fexemplo.com` deve mostrar o QR compartilhado; `/?view=read` deve ir para `/ler/`. | manual |
| AC-WEB-N01.1 | WEB-N01 | No fluxo do AC-WEB-F06.1, nenhuma requisição deve sair da origem e a URL não deve conter o conteúdo digitado. | manual (DevTools) |
| AC-WEB-N02.1 | WEB-N02 | Nenhuma página deve carregar script ou estilo de outra origem. | `site.test.ts` |
| AC-WEB-N03.1 | WEB-N03 | Cada página deve ter título e descrição dentro dos limites, canonical, H1 único e JSON-LD válido. | `site.test.ts` |
| AC-WEB-N05.1 | WEB-N05 | Offline, após visitar `/`, as páginas `/wifi/`, `/zoom/` e `/ler/` devem abrir e gerar o QR. | manual |
| AC-WEB-N06.1 | WEB-N06 | Em 360 px, nenhuma página deve ter rolagem horizontal; os cards devem ficar em 1, 2 ou 3 colunas conforme a largura. | manual |

## 8. Fora de escopo
- Versão em inglês (`/en/`).
- Página de geração de Pix (depende da SPEC de geração de Pix).
- Domínio próprio diferente de `qr.tools.grviana.com.br`.
- Blog ou conteúdo editorial além do texto de cada página.
- Renderização no servidor; o HTML é estático, gerado no build.

## 9. Questões em aberto
- **Quais tipos ficam em destaque na home?** Provisório: os 8 de `MAIN_TYPES`. Reavaliar com os dados do Search Console; trocar é só mudar a lista.
- **Página de Pix (gerar):** candidata forte a página própria. Depende de implementar a geração de BR Code.
- **Versão em inglês (`/en/`):** fora do escopo desta fase.
- **Domínio próprio:** manter `qr.tools.grviana.com.br` por enquanto.
