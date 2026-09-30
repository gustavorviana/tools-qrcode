# SPEC-002 — Personalização do QR Code

| | |
|---|---|
| **Status** | Implementado |
| **Design** | [DESIGN-002](../design/002-personalizacao.md) |
| **Módulo** | `src/qr/designer.ts`, `src/qr/generator.ts`, `src/qr/shapes.ts`, `src/qr/customRenderer.ts`, `src/qr/logos.ts`, `src/qr/frames.ts`, `src/qr/caption.ts` |
| **Atualizado em** | 2026-09-30 |

## 1. Problema
Um QR preto e branco não combina com material de marca. As ferramentas que personalizam costumam cobrar por cor, logo e moldura, ou exigem cadastro. E quem personaliza sem entender de QR acaba com um código que não lê (pouco contraste, logo grande demais, correção de erro baixa).

## 2. Objetivos
- Permitir cores, formas, logo e moldura com legenda, grátis e no navegador.
- Mostrar o resultado ao vivo, sem precisar clicar em "gerar" de novo.
- Proteger a leitura: subir a correção de erro sozinho quando a personalização a prejudica.
- Manter a personalização opcional e recolhida para não atrapalhar o fluxo básico.

## 3. Cenários de uso
- Tenho uma cafeteria, quero o QR do cardápio na cor da marca com o logo no centro e uma faixa "ESCANEIE O CARDÁPIO".
- Vou imprimir o QR sobre um fundo colorido e preciso do PNG com fundo transparente.
- Quero um QR com módulos de coração para um convite de casamento e espero que continue lendo.

## 4. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| CUS-F01 | Cor dos módulos e do fundo por seletor ou hex (3 ou 6 dígitos) | Must |
| CUS-F02 | Paletas prontas (Clássico, Azul, Verde, Roxo, Rosa, Invertido) | Could |
| CUS-F03 | Fundo transparente | Should |
| CUS-F04 | Cores próprias para a moldura e o centro dos olhos, herdando a cor dos módulos até serem alteradas | Could |
| CUS-F05 | 13 formas de corpo: 6 conectadas (Contínuo, Arredondado, Pontos, Elegante, Elegante+, Extra) e 7 isoladas (Círculo, Losango, Coração, Estrela, Mais, Cruz, X) | Should |
| CUS-F06 | Moldura do olho: Automático, Quadrado, Arredondado, Círculo | Could |
| CUS-F07 | Centro do olho: Automático ou qualquer forma de corpo | Could |
| CUS-F08 | Contorno geral quadrado ou circular | Could |
| CUS-F09 | 12 logos prontos, com versão colorida ou monocromática (nas cores do QR) | Should |
| CUS-F10 | Logo a partir de uma imagem do dispositivo | Should |
| CUS-F11 | Molduras Nenhuma, Cantos, Borda e Faixa, com legenda editável | Should |
| CUS-F12 | Correção de erro Automática (padrão), Baixa, Média, Alta ou Máxima | Must |
| CUS-F13 | Prévia ao vivo após a primeira geração | Must |
| CUS-F14 | Com logo, a correção mínima é Alta (Q): um nível manual Baixa ou Média é elevado para Alta, e a pessoa é avisada disso | Must |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| CUS-N01 | O logo enviado é lido localmente e nunca sai do dispositivo. |
| CUS-N02 | A prévia se atualiza em até ~120 ms após a última mudança (debounce), sem travar a digitação. |
| CUS-N03 | No modo automático, o QR personalizado continua legível: M por padrão, Q com formas isoladas, H com logo. |
| CUS-N04 | O resultado é vetorial (SVG); a personalização não depende da resolução de exportação. |
| CUS-N05 | Adicionar uma forma, logo ou moldura é só registrá-la, sem mexer em UI ou em validação. |

## 6. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| Cor dos módulos | `#0f172a` | qualquer hex |
| Cor do fundo | `#ffffff` | qualquer hex |
| Fundo transparente | desligado | ligado/desligado |
| Forma do corpo | Contínuo | 13 formas |
| Moldura / centro do olho | Automático | 3 formas + auto / 13 formas + auto |
| Contorno | Quadrado | Quadrado, Círculo |
| Logo monocromático | ligado | ligado/desligado |
| Moldura | Nenhuma | Nenhuma, Cantos, Borda, Faixa |
| Legenda | `ESCANEIE` | até 45 caracteres |
| Correção de erro | Automático | Auto, L, M, Q, H |

## 7. Critérios de aceite
| ID | Requisito | Critério | Verificação |
|---|---|---|---|
| AC-CUS-F01.1 | CUS-F01 | Dado um hex de 3 ou 6 dígitos, a cor deve ser aplicada; um hex inválido não deve alterar a cor atual. | manual |
| AC-CUS-F02.1 | CUS-F02 | Quando a pessoa escolhe uma paleta, as cores dos módulos e do fundo devem mudar para as da paleta. | manual |
| AC-CUS-F03.1 | CUS-F03 | Com fundo transparente ligado, o SVG não deve ter o retângulo de fundo e o PNG exportado deve ter canal alfa. | `customRenderer.test.ts` (SVG) + manual (PNG) |
| AC-CUS-F04.1 | CUS-F04 | Enquanto a pessoa não alterar as cores dos olhos, elas devem acompanhar a cor dos módulos; depois de alteradas, devem se manter. | manual |
| AC-CUS-F05.1 | CUS-F05, CUS-N03 | Para cada uma das 13 formas de corpo, com correção automática, a câmera do celular deve ler o QR. | manual (`shapes.test.ts` só garante que cada forma desenha) |
| AC-CUS-F06.1 | CUS-F06 | Cada moldura de olho deve ser desenhada com a forma escolhida. | `shapes.test.ts` |
| AC-CUS-F07.1 | CUS-F07 | Dado o centro "coração" com o corpo "Contínuo", o centro do olho deve ser um coração, não um quadrado. | `libEye.integration.test.ts` |
| AC-CUS-F08.1 | CUS-F08 | Com contorno circular e forma conectada, o QR deve ser desenhado dentro de um círculo. | manual |
| AC-CUS-F09.1 | CUS-F09, CUS-N03 | Com um logo pronto e correção automática, a correção efetiva deve ser H e o QR deve continuar legível; no modo monocromático, o logo deve usar as cores do QR. | `logos.test.ts` + manual |
| AC-CUS-F10.1 | CUS-F10, CUS-N01 | Quando a pessoa escolhe uma imagem como logo, ela deve aparecer no QR sem nenhuma requisição de rede. | manual (DevTools) |
| AC-CUS-F11.1 | CUS-F11 | Uma legenda longa (até 45 caracteres) deve quebrar em duas linhas sem sair da moldura. | `frames.test.ts` |
| AC-CUS-F12.1 | CUS-F12, CUS-N03 | No modo automático, a correção deve ser M por padrão, Q com formas isoladas ou centro de olho em ícone, e H com logo. | `ecl.test.ts` |
| AC-CUS-F12.2 | CUS-F12 | Sem logo, um nível escolhido manualmente deve ser usado sem alteração. | `ecl.test.ts` |
| AC-CUS-F14.1 | CUS-F14 | Com logo e nível manual Baixa ou Média, a correção efetiva deve ser Alta (Q) e o aviso "Com logo, a correção mínima é Alta" deve aparecer; com Alta, Máxima ou Automático, o aviso não deve aparecer. | `ecl.test.ts` + manual (aviso) |
| AC-CUS-F13.1 | CUS-F13, CUS-N02 | Depois da primeira geração, quando a pessoa altera uma opção, a prévia deve se atualizar em até ~120 ms após a última mudança. | manual |
| AC-CUS-N04.1 | CUS-N04 | O SVG exportado deve conter toda a personalização (formas, logo, moldura). | `customRenderer.test.ts`, `frames.test.ts`, `libEye.integration.test.ts` |

## 8. Fora de escopo
- Gradientes, imagem de fundo e texturas.
- Aviso de contraste baixo (ver Questões em aberto).
- Editor livre de formas ou upload de formas próprias.
- Salvar ou compartilhar estilos como "modelos" nomeados.

## 9. Questões em aberto
- **Aviso de contraste baixo** (ex.: amarelo sobre branco)? Provisório: não há aviso.
- **Contorno circular com formas isoladas:** hoje é ignorado (vira quadrado) sem avisar a pessoa. Provisório: manter.
