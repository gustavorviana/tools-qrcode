# DESIGN-006 — Privacidade e transparência

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-006](../spec/006-privacidade.md) |
| **Módulos** | `src/templates/partials/privacy.html`, `src/templates/partials/about.html`, `src/templates/layout.html`, `src/app.ts`, `build.mjs` |
| **Atualizado em** | 2026-09-29 |

## 1. Resumo
A privacidade é garantida pela arquitetura, não por política:
- não há back-end;
- JS e CSS são servidos pela própria origem;
- as dependências de runtime são servidas pela própria origem;
- a única chamada externa (OSM) só acontece após um clique explícito.

A página Privacidade descreve esses fluxos e deve ser atualizada junto com eles.

## 2. Módulos e dependências
- `src/templates/`: textos da página `/privacidade/`, da seção Sobre e do rodapé.
- `src/app.ts`: consentimento do mapa (`loadMap`), aviso do Pix (`renderDecoded`), aviso do logo no link (`#shareLinkNote`).
- `build.mjs`: garante o HTML autocontido (DESIGN-000).
- `src/qr/barcode.ts`: `locateFile` aponta o `.wasm` para a própria origem.

## 3. Modelo de dados
| Dado | Processamento | Sai do dispositivo? |
|---|---|---|
| Conteúdo digitado | navegador | Não |
| QR gerado | navegador | Só se a pessoa baixar ou compartilhar |
| Câmera / imagem lida | navegador | Não; nada é armazenado |
| Logo enviado | data URL em memória | Não |
| Localização atual | Geolocation API | Não |
| Tiles do mapa | `tile.openstreetmap.org` | Sim, após "Escolher no mapa" (região visualizada + IP) |
| Busca de endereço | `nominatim.openstreetmap.org` | Sim, o texto buscado |
| Link compartilhado | fragmento `#` | Não vai ao servidor; visível para quem recebe |
| `installDismissed` | `localStorage` | Não |
| Acesso ao site | Cloudflare | IP nos logs da hospedagem |

## 4. Componentes
Não há componente dedicado. As garantias vêm de:
- `build.mjs`: JS e CSS em arquivos da própria origem, sem CDN;
- `configureBarcodeReader` / `locateFile`: WASM local;
- `App.loadMap()`: único ponto que cria requisições ao OSM, chamado só pelo botão.

## 5. Fluxos
**Consentimento do mapa**
1. O tipo Local mostra `#mapConsent`, com o texto explicativo e o botão "Escolher no mapa".
2. Só `loadMap()` esconde o aviso, mostra o mapa e dispara `drawMap()` (tiles).
3. `searchAddress()` só existe depois disso (a busca fica oculta antes).

**Aviso do Pix:** `renderDecoded` sempre acrescenta a nota "Este código pode conter dados pessoais…", mencionando o link de cobrança quando dinâmico.

## 6. UI
- `#view-privacy` com cinco cartões: o que acontece no dispositivo, mapa opcional, links compartilhados, hospedagem e transparência (com link ao repositório) e "Voltar para Sobre".
- Rodapé: "Processamento local — nenhum dado é enviado a servidores. · Privacidade".
- `#view-about`: descrição, resumo de privacidade, instalar, créditos (jsQR, zxing-wasm/ZXing-C++, Project Nayuki), formatos suportados, repositório e autoria.

## 7. Permissões e manifest
Câmera e geolocalização são pedidas só no gesto do usuário (DESIGN-004, DESIGN-001). Não há cookies nem outras permissões.

## 8. Erros e casos de borda
| Situação | Comportamento |
|---|---|
| Nova dependência que busca recurso em CDN | proibido; embutir ou servir pela origem (PRV-N04) |
| Mudança em qualquer fluxo da tabela da seção 3 | atualizar `#view-privacy` no mesmo PR (PRV-N03) |
| Pessoa não abre o mapa | nenhuma requisição ao OSM |
| Link compartilhado com dados sensíveis | aviso na página Privacidade; nada vai ao servidor |

## 9. Testes
Não há teste automatizado de rede.

| Roteiro manual | Cobre |
|---|---|
| DevTools → Rede num ciclo completo | PRV-N01, PRV-N02 |
| abrir o tipo Local sem mapa | PRV-F03 |
| Application → Cookies / Local Storage | PRV-N02 |
| `site.test.ts` › nenhum script/estilo de outra origem | PRV-N02, PRV-N04 |

## 10. Plano de implementação
Concluído. Marcos: `e58efef` (processamento local e página Privacidade), `87b43c4` (créditos e formatos na aba Sobre), `b4f9c81` (aviso no Pix).

## 11. Decisões e alternativas descartadas
- **Privacidade pela arquitetura:** sem back-end, não há o que vazar; a página só explica.
- **Mapa opt-in** em vez de nenhum mapa: é útil para o tipo Local e fica isolado atrás de consentimento.
- **Sem analytics, nem os "respeitosos"** (Plausible etc.): qualquer script de medição contradiz a proposta; as métricas vêm de fontes externas agregadas.
- **Texto técnico em vez de política jurídica:** a pessoa entende exatamente o que acontece.
