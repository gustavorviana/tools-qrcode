# SPEC-004 — Leitura de QR Code e código de barras

| | |
|---|---|
| **Status** | Implementado |
| **Design** | [DESIGN-004](../design/004-leitura.md) |
| **Módulo** | `src/qr/reader.ts`, `src/qr/barcode.ts`, `src/qr/decode.ts`, `src/app.ts` |
| **Atualizado em** | 2026-09-30 |

## 1. Problema
- A câmera do celular lê QR, mas não lê um QR que está num **print ou numa imagem** já salva.
- No desktop não há leitor nativo.
- Muitos apps "leitores" enviam a imagem a um servidor e vêm cheios de anúncios.
- Mesmo quando lê, o celular costuma só mostrar o texto bruto. Um Pix ou um vCard viram uma sopa de caracteres, e a pessoa age sem saber o que o código contém.

## 2. Objetivos
- Ler QR Code e os principais códigos de barras pela câmera ou por imagem, em qualquer navegador moderno, inclusive desktop.
- Mostrar o conteúdo interpretado, com ações úteis para cada tipo.
- Permitir **conferir um Pix** (recebedor, valor, integridade) antes de pagar.
- Nada sai do dispositivo.

## 3. Cenários de uso
- Recebi um print de um QR de Pix no WhatsApp. Abro o app, escolho a imagem e confiro o nome do recebedor e o valor antes de pagar.
- Estou no computador e preciso ler um QR de um PDF. Tiro um print e leio pela imagem.
- Quero o código de barras de um produto (EAN-13). Aponto a câmera no modo Barras.
- Alguém me passou o QR do Wi-Fi, mas meu notebook não tem câmera. Leio o print e toco em "Copiar senha".

## 4. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| LER-F01 | Ler pela câmera traseira até a primeira leitura bem-sucedida | Must |
| LER-F02 | Ler a partir de uma imagem do dispositivo | Must |
| LER-F03 | Modos Automático, só QR e só Barras | Should |
| LER-F04 | Ler códigos de barras e 2D além do QR (30 simbologias do ZXing) | Should |
| LER-F05 | Interpretar Link, Telefone, SMS, E-mail, Wi-Fi, Local, Contato, Evento, WhatsApp, Pix e Texto | Must |
| LER-F06 | Ações por tipo: abrir, ligar, enviar SMS/e-mail, copiar senha, abrir no mapa, salvar contato (.vcf), adicionar à agenda (.ics), abrir conversa | Should |
| LER-F07 | Pix: exibir tipo, recebedor, chave, valor, cidade e demais campos, e validar o CRC | Must |
| LER-F08 | Copiar o conteúdo bruto em todos os tipos | Must |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| LER-N01 | Quadros da câmera e imagens são processados localmente e não são armazenados. |
| LER-N02 | Funciona sem `BarcodeDetector` nativo (Windows, Linux, Firefox, iOS). |
| LER-N03 | O decodificador de barras (WASM) é servido pela própria origem e funciona offline. |
| LER-N04 | O laço da câmera não trava a interface (modo leve na câmera, esforço máximo em imagem parada). |
| LER-N05 | A URL de cobrança de um Pix dinâmico nunca é exibida nem acessada. |
| LER-N06 | A câmera é desligada ao ler, ao parar ou ao sair da aba. |

## 6. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| Modo de leitura | Automático | Automático, QR Code, Barras |

## 7. Critérios de aceite
| ID | Requisito | Critério | Verificação |
|---|---|---|---|
| AC-LER-F01.1 | LER-F01, LER-N06 | Quando a câmera lê um código, o app deve mostrar o resultado e desligar a câmera. | manual |
| AC-LER-F01.2 | LER-F01, LER-N02 | No Chrome do Windows (sem `BarcodeDetector`), a câmera deve ler um QR. | manual |
| AC-LER-F02.1 | LER-F02, LER-N02 | No Chrome do Windows, um QR deve ser lido a partir de uma imagem. | manual |
| AC-LER-F02.2 | LER-F02 | Dada uma imagem sem código, o app deve mostrar "Nenhum … encontrado na imagem." e esconder o resultado anterior. | `barcode.test.ts` (imagem em branco) + manual (mensagem) |
| AC-LER-F02.3 | LER-F02 | Um QR claro sobre fundo escuro deve ser lido. | manual |
| AC-LER-F03.1 | LER-F03 | No modo "só QR", um código de barras não deve ser aceito; no modo "só Barras", um QR não deve ser aceito. | manual |
| AC-LER-F04.1 | LER-F04 | No modo Barras, um EAN-13 fotografado deve ser lido. | manual (`barcode.test.ts` cobre Code 39) |
| AC-LER-F05.1 | LER-F05 | Para cada tipo listado, `parseDecoded` deve classificar o texto e extrair os campos. | `decode.test.ts` |
| AC-LER-F06.1 | LER-F06 | Para cada tipo, o cartão de resultado deve mostrar as ações da tabela de UI do [DESIGN-004](../design/004-leitura.md). | manual |
| AC-LER-F07.1 | LER-F07 | Dado um Pix válido, o app deve mostrar tipo, recebedor, chave, valor e cidade. | `decode.test.ts` |
| AC-LER-F07.2 | LER-F07 | Dado um Pix adulterado, o app deve mostrar "CRC inválido". | `decode.test.ts` |
| AC-LER-F08.1 | LER-F08 | Para qualquer tipo, "Copiar" deve colocar o texto bruto na área de transferência. | manual |
| AC-LER-N03.1 | LER-N03 | Offline, após a primeira visita, um código de barras deve ser lido por imagem. | manual |
| AC-LER-N04.1 | LER-N04 | Com a câmera ligada, a interface deve continuar respondendo ao toque. | manual |
| AC-LER-N05.1 | LER-N05, PRV-F04 | Dado um Pix dinâmico, a URL não deve ser exibida nem acessada, e o aviso de privacidade deve aparecer. | `decode.test.ts` + manual (DevTools) |
| AC-LER-N06.1 | LER-N06 | Quando a pessoa para a câmera ou sai da aba, a câmera deve ser liberada (o indicador do sistema apaga). | manual |

## 8. Fora de escopo
- Ler vários códigos de uma mesma imagem (sempre o primeiro).
- Histórico de leituras.
- Pagar um Pix ou acessar a URL de cobrança.
- Análise de links suspeitos por serviço externo (ver Questões em aberto).
- Ler códigos a partir de PDF ou vídeo.

## 9. Questões em aberto
- **Alerta de link suspeito** (domínio parecido com banco, encurtador)? Provisório: não; só com regras locais, sem serviço externo.
- **Toast "QR Code lido!"** aparece também para código de barras. Provisório: manter.
