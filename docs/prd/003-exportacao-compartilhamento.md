# PRD-003 — Exportação e compartilhamento

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-003](../specs/003-exportacao-compartilhamento.md) |
| **Módulo** | `src/qr/designer.ts`, `src/qr/raster.ts`, `src/qr/share.ts`, `src/app.ts` |
| **Atualizado em** | 2026-09-29 |

## 1. Problema
Depois de gerar, o QR precisa sair do app: em imagem para imprimir ou postar, em vetor para a gráfica, ou mandado direto para alguém. Muitas ferramentas liberam só um PNG pequeno de graça. E "mandar o QR" costuma significar mandar uma imagem pesada, quando um link bastaria.

## 2. Objetivos
- Baixar o QR em PNG de alta resolução e em SVG vetorial.
- Compartilhar a imagem pelo menu nativo do celular.
- Compartilhar um link que recria o mesmo QR, com o mesmo estilo, sem passar pelo servidor.

## 3. Fora de escopo
- Exportar em PDF, EPS ou JPG.
- Encurtar o link compartilhado.
- Incluir o logo no link (ficaria enorme).
- Exportar vários tamanhos de uma vez.

## 4. Cenários de uso
- Vou mandar o QR para a gráfica e preciso de um arquivo que não perca qualidade ao ampliar: baixo o SVG.
- Quero postar o QR no Instagram: toco em "Compartilhar imagem" e escolho o app.
- Quero que um colega gere o mesmo QR com o mesmo estilo: envio o link e ele abre o QR pronto.

## 5. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| EXP-F01 | Baixar PNG em 512, 1024, 2048 ou 4096 px | Must |
| EXP-F02 | Baixar SVG vetorial idêntico à prévia | Must |
| EXP-F03 | Compartilhar a imagem pela Web Share API, com download como alternativa | Should |
| EXP-F04 | Ampliar o QR num modal, com Baixar PNG e Compartilhar | Could |
| EXP-F05 | Compartilhar um link com o conteúdo e as opções de estilo que fogem do padrão | Should |
| EXP-F06 | Abrir o link mostra o QR e o conteúdo interpretado, com um botão "Criar o meu QR Code" | Should |
| EXP-F07 | Avisar que o logo não vai no link quando houver logo | Should |

## 6. Requisitos não funcionais
| ID | Requisito |
|---|---|
| EXP-N01 | O PNG não tem linhas claras entre os módulos (artefato de rasterização). |
| EXP-N02 | O link guarda os dados no fragmento `#`, que não é enviado ao servidor. |
| EXP-N03 | Todo valor lido do link é validado; um valor inválido vira o padrão, nunca erro. |
| EXP-N04 | Abrir um link não "vaza" as opções dele para o próximo QR criado. |
| EXP-N05 | O link é o menor possível: só entram as opções diferentes do padrão. |

## 7. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| Tamanho do PNG | 1024 px | 512, 1024, 2048, 4096 |

## 8. Critérios de aceite
- [ ] O PNG de 4096 px abre sem linhas claras entre os módulos.
- [ ] O SVG baixado abre num editor vetorial e é igual à prévia.
- [ ] No celular, "Compartilhar imagem" abre o menu nativo; no desktop sem suporte, baixa o PNG.
- [ ] O link copiado, aberto em outra aba, mostra o mesmo QR (cores, formas, moldura, legenda, tamanho).
- [ ] Um link com `fg=zzz` abre com a cor padrão, sem erro.
- [ ] Após "Criar o meu QR Code", a personalização volta ao padrão.
- [ ] `tests/share.test.ts` e `tests/raster.test.ts` passam.

## 9. Questões em aberto
- **Links muito longos** (vCard completo) podem ser cortados por alguns mensageiros. Provisório: sem compressão.
- **Nome do arquivo** é sempre `qrcode.png`/`qrcode.svg`. Provisório: manter.
