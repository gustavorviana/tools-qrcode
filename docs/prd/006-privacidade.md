# PRD-006 — Privacidade e transparência

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-006](../specs/006-privacidade.md) |
| **Módulo** | `src/index.html` (`#view-privacy`, `#view-about`), `src/app.ts` |
| **Atualizado em** | 2026-09-29 |

## 1. Problema
QR Codes carregam dados sensíveis: senha de Wi-Fi, contatos, dados de pagamento. Quase todos os geradores e leitores online processam esse conteúdo no servidor e usam rastreadores. A pessoa não tem como saber o que é enviado. "Confie em nós" não basta.

## 2. Objetivos
- Garantir que o conteúdo gerado ou lido nunca saia do dispositivo.
- Explicar em linguagem simples, dentro do app, exatamente o que acontece com cada dado.
- Tornar a promessa verificável: código aberto e build em um único arquivo.
- Pedir consentimento explícito para a única exceção (o mapa).

## 3. Fora de escopo
- Banner de cookies (não há cookies).
- Política de privacidade jurídica formal. A página explica o comportamento técnico.
- Contas ou exclusão de dados (não há dados guardados).

## 4. Cenários de uso
- Vou gerar o QR da senha do Wi-Fi da empresa e quero ter certeza de que ela não fica num servidor: abro a página Privacidade.
- Sou desenvolvedor e desconfio: abro o repositório e o `index.html` e confiro que não há chamadas externas.
- Vou usar o mapa para marcar um local: o app me avisa, antes, que isso usa o OpenStreetMap.

## 5. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| PRV-F01 | Página Privacidade explicando o processamento local, a câmera, o `localStorage`, a ausência de rastreadores, o mapa opcional, os links compartilhados e a hospedagem | Must |
| PRV-F02 | Rodapé com "Processamento local" e link para a página Privacidade | Should |
| PRV-F03 | Consentimento explícito ("Escolher no mapa") antes de qualquer requisição ao OSM | Must |
| PRV-F04 | Aviso ao ler Pix: pode conter dados pessoais; não compartilhe o código nem prints | Should |
| PRV-F05 | Aviso de que o link compartilhado fica visível para quem o recebe | Should |
| PRV-F06 | Aba Sobre com créditos das bibliotecas e link para o repositório | Should |

## 6. Requisitos não funcionais
| ID | Requisito |
|---|---|
| PRV-N01 | Nenhuma requisição fora da origem, exceto tiles e busca do OSM após consentimento. |
| PRV-N02 | Sem cookies, analytics, pixels ou scripts de terceiros. |
| PRV-N03 | O texto da página Privacidade corresponde ao comportamento real e é atualizado no mesmo PR de qualquer mudança nos fluxos de dados. |
| PRV-N04 | Dependências de runtime são embutidas ou servidas pela própria origem. |
| PRV-N05 | Medições futuras usam só fontes agregadas externas (Search Console, Cloudflare), sem instrumentar a página. |

## 7. Configurações
Nenhuma.

## 8. Critérios de aceite
- [ ] No DevTools, um ciclo completo (gerar, personalizar, baixar, ler, abrir a página Privacidade) não faz requisições fora da origem.
- [ ] Abrir o tipo Local sem tocar em "Escolher no mapa" não faz requisições ao OSM.
- [ ] Nenhum cookie é criado (Application → Cookies vazio).
- [ ] `localStorage` contém no máximo `installDismissed`.
- [ ] O HTML final não contém `<script src=` externo.

## 9. Questões em aberto
- **Trocar o Nominatim/OSM por uma alternativa auto-hospedada?** Provisório: não; a exceção é opt-in e está documentada.
- **Headers de segurança** (CSP, Referrer-Policy) na hospedagem, para reforçar PRV-N01 no navegador. Provisório: não configurados neste repositório.
