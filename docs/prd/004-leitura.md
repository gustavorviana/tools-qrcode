# PRD-004 — Leitura de QR Code e código de barras

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-004](../specs/004-leitura.md) |
| **Módulo** | `src/qr/reader.ts`, `src/qr/barcode.ts`, `src/qr/decode.ts`, `src/app.ts` |
| **Atualizado em** | 2026-09-29 |

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

## 3. Fora de escopo
- Ler vários códigos na mesma imagem.
- Histórico de leituras.
- Verificar se um link é malicioso (exigiria consultar serviço externo).
- Pagar o Pix ou consultar a cobrança dinâmica.

## 4. Cenários de uso
- Recebi um print de um QR de Pix no WhatsApp. Abro o app, escolho a imagem e confiro o nome do recebedor e o valor antes de pagar.
- Estou no computador e preciso ler um QR de um PDF. Tiro um print e leio pela imagem.
- Quero o código de barras de um produto (EAN-13). Aponto a câmera no modo Barras.
- Alguém me passou o QR do Wi-Fi, mas meu notebook não tem câmera. Leio o print e toco em "Copiar senha".

## 5. Requisitos funcionais
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

## 6. Requisitos não funcionais
| ID | Requisito |
|---|---|
| LER-N01 | Quadros da câmera e imagens são processados localmente e não são armazenados. |
| LER-N02 | Funciona sem `BarcodeDetector` nativo (Windows, Linux, Firefox, iOS). |
| LER-N03 | O decodificador de barras (WASM) é servido pela própria origem e funciona offline. |
| LER-N04 | O laço da câmera não trava a interface (modo leve na câmera, esforço máximo em imagem parada). |
| LER-N05 | A URL de cobrança de um Pix dinâmico nunca é exibida nem acessada. |
| LER-N06 | A câmera é desligada ao ler, ao parar ou ao sair da aba. |

## 7. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| Modo de leitura | Automático | Automático, QR Code, Barras |

## 8. Critérios de aceite
- [ ] Chrome no Windows (sem `BarcodeDetector`) lê QR pela câmera e por imagem.
- [ ] Um QR claro sobre fundo escuro é lido.
- [ ] Um EAN-13 fotografado é lido no modo Barras.
- [ ] Um Pix adulterado mostra "CRC inválido".
- [ ] Um Pix dinâmico não exibe a URL e mostra o aviso de privacidade.
- [ ] Imagem sem código mostra "Nenhum … encontrado na imagem." e esconde o resultado anterior.
- [ ] `tests/decode.test.ts` e `tests/barcode.test.ts` passam.

## 9. Questões em aberto
- **Alerta de link suspeito** (domínio parecido com banco, encurtador)? Provisório: não; só com regras locais, sem serviço externo.
- **Toast "QR Code lido!"** aparece também para código de barras. Provisório: manter.
