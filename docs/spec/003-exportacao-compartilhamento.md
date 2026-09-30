# SPEC-003 — Exportação e compartilhamento

| | |
|---|---|
| **Status** | Implementado |
| **Design** | [DESIGN-003](../design/003-exportacao-compartilhamento.md) |
| **Módulo** | `src/qr/designer.ts`, `src/qr/raster.ts`, `src/qr/share.ts`, `src/app.ts` |
| **Atualizado em** | 2026-09-30 |

## 1. Problema
Depois de gerar, o QR precisa sair do app: em imagem para imprimir ou postar, em vetor para a gráfica, ou mandado direto para alguém. Muitas ferramentas liberam só um PNG pequeno de graça. E "mandar o QR" costuma significar mandar uma imagem pesada, quando um link bastaria.

## 2. Objetivos
- Baixar o QR em PNG de alta resolução e em SVG vetorial.
- Compartilhar a imagem pelo menu nativo do celular.
- Compartilhar um link que recria o mesmo QR, com o mesmo estilo, sem passar pelo servidor.

## 3. Cenários de uso
- Vou mandar o QR para a gráfica e preciso de um arquivo que não perca qualidade ao ampliar: baixo o SVG.
- Quero postar o QR no Instagram: toco em "Compartilhar imagem" e escolho o app.
- Quero que um colega gere o mesmo QR com o mesmo estilo: envio o link e ele abre o QR pronto.

## 4. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| EXP-F01 | Baixar PNG em 512, 1024, 2048 ou 4096 px | Must |
| EXP-F02 | Baixar SVG vetorial idêntico à prévia | Must |
| EXP-F03 | Compartilhar a imagem pela Web Share API, com download como alternativa | Should |
| EXP-F04 | Ampliar o QR num modal, com Baixar PNG e Compartilhar | Could |
| EXP-F05 | Compartilhar um link com o conteúdo e as opções de estilo que fogem do padrão, incluindo o logo quando for um dos logos prontos do site (pelo nome) | Should |
| EXP-F06 | Abrir o link mostra o QR e o conteúdo interpretado, com um botão "Criar o meu QR Code" | Should |
| EXP-F07 | Avisar que o logo não vai no link quando ele for uma imagem própria (os logos prontos vão) | Should |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| EXP-N01 | O PNG não tem linhas claras entre os módulos (artefato de rasterização). |
| EXP-N02 | O link guarda os dados no fragmento `#`, que não é enviado ao servidor. |
| EXP-N03 | Todo valor lido do link é validado; um valor inválido vira o padrão, nunca erro. |
| EXP-N04 | Abrir um link não "vaza" as opções dele para o próximo QR criado. |
| EXP-N05 | O link é o menor possível: só entram as opções diferentes do padrão. |

## 6. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| Tamanho do PNG | 1024 px | 512, 1024, 2048, 4096 |

## 7. Critérios de aceite
| ID | Requisito | Critério | Verificação |
|---|---|---|---|
| AC-EXP-F01.1 | EXP-F01, EXP-N01 | Para cada tamanho, o PNG baixado deve ter exatamente o lado escolhido; o de 4096 px não deve ter linhas claras entre os módulos. | `raster.test.ts` (dimensões, `geometricPrecision`) + manual (visual) |
| AC-EXP-F02.1 | EXP-F02 | O SVG baixado deve abrir num editor vetorial e ser igual à prévia. | manual |
| AC-EXP-F03.1 | EXP-F03 | Quando há Web Share API com arquivos, "Compartilhar imagem" deve abrir o menu nativo; quando não há, deve baixar o PNG. | manual |
| AC-EXP-F04.1 | EXP-F04 | Quando a pessoa toca no QR, o modal deve abrir com "Baixar PNG" e "Compartilhar". | manual |
| AC-EXP-F05.1 | EXP-F05, EXP-N05 | O link copiado, aberto em outra aba, deve mostrar o mesmo QR (cores, formas, moldura, legenda, logo pronto); só as opções diferentes do padrão devem estar no link. | `share.test.ts` |
| AC-EXP-F06.1 | EXP-F06 | Quando um link compartilhado é aberto, o app deve mostrar o QR, o conteúdo interpretado e o botão "Criar o meu QR Code". | manual |
| AC-EXP-F06.2 | EXP-F06, EXP-N04 | Quando a pessoa toca em "Criar o meu QR Code", a personalização deve voltar ao padrão. | manual |
| AC-EXP-F07.1 | EXP-F07 | Dado um logo enviado pela pessoa, quando ela compartilha o link, o app deve avisar que o logo não vai no link; com logo pronto, não deve avisar. | manual |
| AC-EXP-N02.1 | EXP-N02 | Os dados do link devem estar apenas no fragmento `#`. | manual (`share.test.ts` cobre só o conteúdo da query) |
| AC-EXP-N03.1 | EXP-N03 | Dado um link com `fg=zzz` ou outro valor inválido, o app deve usar o padrão daquele campo, sem erro. | `share.test.ts` |

## 8. Fora de escopo
- PDF, EPS e outros formatos além de PNG e SVG.
- Exportação em lote (vários QRs de uma vez).
- Compressão ou encurtamento do link compartilhado.
- Enviar o logo próprio dentro do link.
- Nome de arquivo personalizado.

## 9. Questões em aberto
- **Links muito longos** (vCard completo) podem ser cortados por alguns mensageiros. Provisório: sem compressão.
- **Nome do arquivo** é sempre `qrcode.png`/`qrcode.svg`. Provisório: manter.
