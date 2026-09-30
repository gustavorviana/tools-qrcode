# SPEC-006 — Privacidade e transparência

| | |
|---|---|
| **Status** | Implementado |
| **Design** | [DESIGN-006](../design/006-privacidade.md) |
| **Módulo** | `src/templates/partials/privacy.html`, `src/templates/partials/about.html`, `src/templates/layout.html`, `src/app.ts` |
| **Atualizado em** | 2026-09-30 |

## 1. Problema
QR Codes carregam dados sensíveis: senha de Wi-Fi, contatos, dados de pagamento. Quase todos os geradores e leitores online processam esse conteúdo no servidor e usam rastreadores. A pessoa não tem como saber o que é enviado. "Confie em nós" não basta.

## 2. Objetivos
- Garantir que o conteúdo gerado ou lido nunca saia do dispositivo.
- Explicar em linguagem simples, dentro do app, exatamente o que acontece com cada dado.
- Tornar a promessa verificável: código aberto e tudo servido pela própria origem, sem scripts de terceiros.
- Pedir consentimento explícito para a única exceção (o mapa).

## 3. Cenários de uso
- Vou gerar o QR da senha do Wi-Fi da empresa e quero ter certeza de que ela não fica num servidor: abro a página Privacidade.
- Sou desenvolvedor e desconfio: abro o repositório e o HTML/JS publicados e confiro que não há chamadas externas.
- Vou usar o mapa para marcar um local: o app me avisa, antes, que isso usa o OpenStreetMap.

## 4. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| PRV-F01 | Página Privacidade explicando o processamento local, a câmera, o `localStorage`, a ausência de rastreadores, o mapa opcional, os links compartilhados e a hospedagem | Must |
| PRV-F02 | Rodapé com "Processamento local" e link para a página Privacidade | Should |
| PRV-F03 | Consentimento explícito ("Escolher no mapa") antes de qualquer requisição ao OSM | Must |
| PRV-F04 | Aviso ao ler Pix: pode conter dados pessoais; não compartilhe o código nem prints | Should |
| PRV-F05 | Aviso, na página Privacidade, de que o link compartilhado fica visível para quem o recebe | Should |
| PRV-F06 | Seção Sobre (home) com créditos das bibliotecas e link para o repositório | Should |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| PRV-N01 | Nenhuma requisição fora da origem, exceto tiles e busca do OSM após consentimento. |
| PRV-N02 | Sem cookies, analytics, pixels ou scripts de terceiros. |
| PRV-N03 | O texto da página Privacidade corresponde ao comportamento real e é atualizado no mesmo PR de qualquer mudança nos fluxos de dados. |
| PRV-N04 | Dependências de runtime são embutidas ou servidas pela própria origem. |
| PRV-N05 | Medições futuras usam só fontes agregadas externas (Search Console, Cloudflare), sem instrumentar a página. |

## 6. Configurações
Nenhuma.

## 7. Critérios de aceite
| ID | Requisito | Critério | Verificação |
|---|---|---|---|
| AC-PRV-F01.1 | PRV-F01 | A página `/privacidade/` deve cobrir cada item do PRV-F01 (processamento local, câmera, `localStorage`, rastreadores, mapa, links, hospedagem). | manual |
| AC-PRV-F02.1 | PRV-F02 | O rodapé de todas as páginas deve ter "Processamento local" com link para `/privacidade/`. | manual |
| AC-PRV-F03.1 | PRV-F03, PRV-N01 | Quando a pessoa abre o tipo Local sem tocar em "Escolher no mapa", nenhuma requisição ao OSM deve ocorrer. | manual (DevTools) |
| AC-PRV-F04.1 | PRV-F04 | Quando um Pix é lido, o aviso de dados pessoais deve aparecer. | manual |
| AC-PRV-F05.1 | PRV-F05 | A página `/privacidade/` deve avisar que o link compartilhado fica visível para quem o recebe. | manual |
| AC-PRV-F06.1 | PRV-F06 | Ver AC-APP-F07.1. | — |
| AC-PRV-N01.1 | PRV-N01 | Um ciclo completo (gerar, personalizar, baixar, ler, abrir a página Privacidade) não deve fazer requisições fora da origem. | manual (DevTools) |
| AC-PRV-N02.1 | PRV-N02 | Depois do ciclo completo, Application → Cookies deve estar vazio e o `localStorage` deve conter no máximo `installDismissed`. | manual (DevTools) |
| AC-PRV-N04.1 | PRV-N04 | O HTML final não deve conter `<script src=` externo. | `site.test.ts` |

## 8. Fora de escopo
- Banner de cookies ou gestão de consentimento (não há cookies).
- Headers de segurança na hospedagem (ver Questões em aberto).
- Mapa auto-hospedado no lugar do OSM.
- Criptografia do conteúdo do link compartilhado.

## 9. Questões em aberto
- **Trocar o Nominatim/OSM por uma alternativa auto-hospedada?** Provisório: não; a exceção é opt-in e está documentada.
- **Headers de segurança** (CSP, Referrer-Policy) na hospedagem, para reforçar PRV-N01 no navegador. Provisório: não configurados neste repositório.
