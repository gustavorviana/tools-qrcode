# PRD-002 — Personalização do QR Code

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-002](../specs/002-personalizacao.md) |
| **Módulo** | `src/qr/designer.ts`, `src/qr/generator.ts`, `src/qr/shapes.ts`, `src/qr/customRenderer.ts`, `src/qr/logos.ts`, `src/qr/frames.ts`, `src/qr/caption.ts` |
| **Atualizado em** | 2026-09-29 |

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
- [ ] Cada forma de corpo gera um QR que a câmera do celular lê (com correção automática).
- [ ] Com um logo pronto, a correção efetiva vira H e o QR continua legível.
- [ ] Centro de olho "coração" com corpo "Contínuo" desenha um coração, não um quadrado.
- [ ] O PNG com fundo transparente tem canal alfa.
- [ ] Uma legenda longa quebra em duas linhas sem sair da moldura.
- [ ] Os testes de formas, renderer, logos e molduras passam.

## 8. Questões em aberto
- **Aviso de contraste baixo** (ex.: amarelo sobre branco)? Provisório: não há aviso.
- **Contorno circular com formas isoladas:** hoje é ignorado (vira quadrado) sem avisar a pessoa. Provisório: manter.
