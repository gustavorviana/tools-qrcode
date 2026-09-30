# SPEC-001 — Geração de QR Code

| | |
|---|---|
| **Status** | Implementado |
| **Design** | [DESIGN-001](../design/001-geracao.md) |
| **Módulo** | `src/app.ts`, `src/format.ts`, `src/qr/designer.ts`, `src/qr/generator.ts` |
| **Atualizado em** | 2026-09-30 |

## 1. Problema
Para cada tipo de QR (Wi-Fi, contato, evento, WhatsApp…) existe um formato de texto específico que quase ninguém conhece. Quem erra um escape ou esquece o prefixo gera um QR que o celular não reconhece. Por isso as pessoas recorrem a sites que recebem o conteúdo no servidor.

## 2. Objetivos
- Oferecer um formulário por tipo que monte o texto correto sem que a pessoa conheça o formato.
- Mostrar o texto exato que será codificado, para quem quiser conferir.
- Gerar o QR no navegador, em poucos toques, a partir do celular.

## 3. Cenários de uso
- Estou configurando o Wi-Fi de casa para visitas, preencho rede e senha e espero um QR que o celular conecte ao escanear.
- Vou imprimir um cartão de visita, preencho nome, telefone e e-mail e espero que o QR salve o contato na agenda de quem escanear.
- Divulgo um evento, preencho título, data e local e espero que o QR adicione o evento à agenda.
- Tenho um perfil no Instagram, digito só `@meuperfil` e espero o link completo.

## 4. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| GEN-F01 | Tipos Texto, Link, Wi-Fi, E-mail, Telefone, SMS, WhatsApp, Contato (vCard), Local e Evento | Must |
| GEN-F02 | Tipos Instagram, Facebook, Telegram, YouTube, TikTok, X e LinkedIn a partir do usuário ou do link | Should |
| GEN-F03 | Tipos PayPal.me (com valor opcional), MeCard, App/Loja e Zoom (com senha opcional) | Could |
| GEN-F04 | Cada tipo tem campos obrigatórios (incluindo a senha do Wi-Fi quando a rede não é aberta); sem eles o QR não é gerado e o erro aparece abaixo de cada campo | Must |
| GEN-F05 | "Ver texto formatado" mostra o payload exato antes de gerar e, depois de aberto, se atualiza a cada mudança em qualquer campo; o mesmo botão oculta o texto | Should |
| GEN-F06 | Link sem esquema recebe `https://` automaticamente | Must |
| GEN-F07 | Máscara de telefone no formato do país: sem `+`, formato BR; com `+DDI`, formato do país (ex.: `+1 213 373 4253`). No WhatsApp, o DDI pode vir sem `+` | Should |
| GEN-F08 | Local: preencher latitude e longitude pela localização atual do dispositivo | Should |
| GEN-F09 | Local: escolher o ponto num mapa e buscar por endereço, só após consentimento | Could |
| GEN-F10 | Fluxo em etapas: Conteúdo → Personalizar (opcional) → Baixar, com botão para voltar e editar | Must |
| GEN-F11 | Exibir versão, nível de correção e tamanho da matriz do QR gerado | Could |
| GEN-F12 | Validar o formato dos campos, obrigatórios ou opcionais preenchidos: senha Wi-Fi (WPA 8–63; WEP 5/13 caracteres ou 10/26 hex), URL (domínio com ponto, sem espaços), e-mail, telefone de qualquer país, validado pelas regras de tamanho e prefixo do país (sem `+` = Brasil; com `+` = país do DDI), WhatsApp (mesma regra; DDI com ou sem `+`), latitude (−90 a 90), longitude (−180 a 180), fim do evento não antes do início, valor do PayPal maior que 0, ID do Zoom (9–11 dígitos) e usuário de rede social sem espaços | Must |
| GEN-F13 | O erro aparece abaixo do campo, com destaque, ao sair dele ou ao tentar gerar; some assim que o valor é corrigido; o foco vai para o primeiro campo inválido | Must |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| GEN-N01 | Payload montado e QR gerado 100% no navegador. |
| GEN-N02 | Localização atual via Geolocation API, sem envio à rede. |
| GEN-N03 | Mapa e busca de endereço só após "Escolher no mapa" ([SPEC-006](006-privacidade.md)). |
| GEN-N04 | O payload segue os formatos de fato lidos pelas câmeras de Android e iOS (`WIFI:`, vCard 3.0, iCalendar, `geo:`, `mailto:`, `tel:`, `SMSTO:`). |
| GEN-N05 | Os valores digitados em cada tipo ficam preservados ao trocar de tipo. |

## 6. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| Tipo inicial | Texto | 21 tipos |
| Segurança do Wi-Fi | WPA/WPA2 | WPA, WEP, aberta |
| Rede oculta | desligado | ligado/desligado |
| Posição inicial do mapa | centro do Brasil, zoom 4 | zoom 2–19 |

## 7. Critérios de aceite
| ID | Requisito | Critério | Verificação |
|---|---|---|---|
| AC-GEN-F01.1 | GEN-F01, GEN-N04 | Dado um Wi-Fi com `;` e `:` na senha, quando o QR é gerado, a câmera do Android e a do iPhone devem conectar à rede. | `format.test.ts` (`escWifi`) + manual |
| AC-GEN-F01.2 | GEN-F01, GEN-N04 | Quando um contato é gerado, a câmera do iOS e a do Android devem salvá-lo com nome, telefone e e-mail corretos. | `format.test.ts` (`escVcard`) + manual |
| AC-GEN-F01.3 | GEN-F01, GEN-N04 | Quando um evento é gerado, o app de agenda deve abri-lo com título, data e local. | `format.test.ts` (`icalDate`) + manual |
| AC-GEN-F02.1 | GEN-F02 | Dado `@meuperfil` ou o link do perfil em uma rede social, o payload deve ser o link completo do perfil. | `format.test.ts` |
| AC-GEN-F03.1 | GEN-F03 | Dado PayPal.me com valor ou Zoom com senha, o payload deve incluir o valor ou a senha; sem eles, o payload não deve ter o parâmetro. | `format.test.ts` |
| AC-GEN-F04.1 | GEN-F04, GEN-F13 | Quando a pessoa gera sem os campos obrigatórios, cada um deve mostrar "Campo obrigatório." abaixo dele, o app deve mostrar "Corrija os campos destacados.", focar o primeiro e não gerar QR. | `validate.test.ts` + manual |
| AC-GEN-F04.2 | GEN-F04 | Dado um Wi-Fi WPA ou WEP sem senha, o QR não deve ser gerado; com "Nenhuma (aberta)", deve ser gerado sem senha. | `validate.test.ts` |
| AC-GEN-F12.1 | GEN-F12 | Para cada regra de formato, um valor fora dela deve impedir a geração e mostrar a mensagem específica; um opcional vazio não deve gerar erro. | `validate.test.ts` |
| AC-GEN-F13.1 | GEN-F13 | Quando a pessoa corrige um campo com erro, a mensagem e o destaque devem sumir sem novo clique. | manual |
| AC-GEN-F05.1 | GEN-F05 | Quando a pessoa abre "Ver texto formatado", o texto exibido deve ser idêntico ao payload codificado. | manual |
| AC-GEN-F05.2 | GEN-F05 | Com o texto formatado aberto, quando qualquer campo muda (digitação, seleção, checkbox, mapa ou localização atual), o texto deve se atualizar sem novo clique; se os campos ficarem vazios, a caixa deve sumir e voltar quando houver conteúdo. | manual |
| AC-GEN-F05.3 | GEN-F05, GEN-F04, GEN-F12 | Quando a pessoa toca em "Ver texto formatado" com algum campo inválido, devem aparecer só os erros; o texto não deve abrir, nem depois, ao corrigir os campos. Com o texto aberto, um campo que fique inválido esconde o texto até ser corrigido. | manual |
| AC-GEN-F05.4 | GEN-F05 | Com o texto aberto, o botão deve dizer "Ocultar texto formatado" e, ao ser tocado, esconder o texto e voltar a "Ver texto formatado". | manual |
| AC-GEN-F06.1 | GEN-F06 | Dado `exemplo.com` no tipo Link, o payload deve ser `https://exemplo.com`; um link com esquema não deve ser alterado. | manual (sem teste; lógica em `app.ts`) |
| AC-GEN-F07.1 | GEN-F07 | Quando a pessoa digita um telefone sem `+`, o campo deve aplicar o formato BR; com `+DDI`, o formato daquele país. | `phone.test.ts` (`maskPhone`, `maskPhoneWa`) |
| AC-GEN-F12.2 | GEN-F12 | Um telefone válido de outro país (ex.: `+1 213 373 4253`, `+44 20 7946 0958`) deve ser aceito; um de tamanho ou prefixo impossível para o país deve ser rejeitado. | `phone.test.ts`, `validate.test.ts` |
| AC-GEN-F12.3 | GEN-F12 | No WhatsApp, um número BR sem DDI deve gerar o link com `55` na frente. | `phone.test.ts` (`phoneE164`) |
| AC-GEN-F08.1 | GEN-F08, GEN-N02 | Quando a pessoa toca em "Usar localização atual" e autoriza, latitude e longitude devem ser preenchidas sem requisição de rede. | manual |
| AC-GEN-F09.1 | GEN-F09, GEN-N03 | Enquanto a pessoa não tocar em "Escolher no mapa", nenhuma requisição ao OpenStreetMap deve ocorrer. | manual (DevTools) |
| AC-GEN-F10.1 | GEN-F10 | Quando a pessoa gera o QR, a etapa Baixar deve aparecer; quando ela toca em editar, deve voltar ao Conteúdo com os campos preservados. | manual |
| AC-GEN-F11.1 | GEN-F11 | Quando um QR é gerado, devem aparecer a versão, o nível de correção e o tamanho da matriz. | manual |
| AC-GEN-N05.1 | GEN-N05 | Dado um valor digitado no tipo A, quando a pessoa troca para B e volta para A, o valor deve continuar lá. | manual |

## 8. Fora de escopo
- Gerar QR de Pix (BR Code). Ver Questões em aberto.
- Fuso horário explícito nos eventos (as datas saem em hora local).
- Validar se o link, o perfil ou o telefone existem de verdade.
- Tipos que dependam de serviço externo para montar o payload.
- Verificar se e-mail, telefone ou domínio existem de fato (a validação é só de formato).

## 9. Questões em aberto
- **Gerar Pix?** Provisório: não. É candidato forte (muita busca no Brasil e o app já sabe ler BR Code); deve ter spec própria.
- **Fuso do evento:** as datas saem em hora local, sem fuso. Provisório: manter.
- **Duplicidade vCard × MeCard:** manter os dois; o MeCard é mais compacto e gera QR menor.
