# PRD-001 — Geração de QR Code

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-001](../specs/001-geracao.md) |
| **Módulo** | `src/app.ts`, `src/format.ts`, `src/qr/designer.ts`, `src/qr/generator.ts` |
| **Atualizado em** | 2026-09-29 |

## 1. Problema
Para cada tipo de QR (Wi-Fi, contato, evento, WhatsApp…) existe um formato de texto específico que quase ninguém conhece. Quem erra um escape ou esquece o prefixo gera um QR que o celular não reconhece. Por isso as pessoas recorrem a sites que recebem o conteúdo no servidor.

## 2. Objetivos
- Oferecer um formulário por tipo que monte o texto correto sem que a pessoa conheça o formato.
- Mostrar o texto exato que será codificado, para quem quiser conferir.
- Gerar o QR no navegador, em poucos toques, a partir do celular.

## 3. Fora de escopo
- Gerar Pix (BR Code). Hoje o app só lê Pix ([PRD-004](004-leitura.md)).
- Geração em lote (vários QR de uma planilha).
- Encurtar ou rastrear links.
- Gerar código de barras 1D.

## 4. Cenários de uso
- Estou configurando o Wi-Fi de casa para visitas, preencho rede e senha e espero um QR que o celular conecte ao escanear.
- Vou imprimir um cartão de visita, preencho nome, telefone e e-mail e espero que o QR salve o contato na agenda de quem escanear.
- Divulgo um evento, preencho título, data e local e espero que o QR adicione o evento à agenda.
- Tenho um perfil no Instagram, digito só `@meuperfil` e espero o link completo.

## 5. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| GEN-F01 | Tipos Texto, Link, Wi-Fi, E-mail, Telefone, SMS, WhatsApp, Contato (vCard), Local e Evento | Must |
| GEN-F02 | Tipos Instagram, Facebook, Telegram, YouTube, TikTok, X e LinkedIn a partir do usuário ou do link | Should |
| GEN-F03 | Tipos PayPal.me (com valor opcional), MeCard, App/Loja e Zoom (com senha opcional) | Could |
| GEN-F04 | Cada tipo tem campos obrigatórios; sem eles o QR não é gerado e aparece uma mensagem | Must |
| GEN-F05 | "Ver texto formatado" mostra o payload exato antes de gerar | Should |
| GEN-F06 | Link sem esquema recebe `https://` automaticamente | Must |
| GEN-F07 | Máscara de telefone BR nos campos de telefone e máscara com DDI no WhatsApp | Should |
| GEN-F08 | Local: preencher latitude e longitude pela localização atual do dispositivo | Should |
| GEN-F09 | Local: escolher o ponto num mapa e buscar por endereço, só após consentimento | Could |
| GEN-F10 | Fluxo em etapas: Conteúdo → Personalizar (opcional) → Baixar, com botão para voltar e editar | Must |
| GEN-F11 | Exibir versão, nível de correção e tamanho da matriz do QR gerado | Could |

## 6. Requisitos não funcionais
| ID | Requisito |
|---|---|
| GEN-N01 | Payload montado e QR gerado 100% no navegador. |
| GEN-N02 | Localização atual via Geolocation API, sem envio à rede. |
| GEN-N03 | Mapa e busca de endereço só após "Escolher no mapa" ([PRD-006](006-privacidade.md)). |
| GEN-N04 | O payload segue os formatos de fato lidos pelas câmeras de Android e iOS (`WIFI:`, vCard 3.0, iCalendar, `geo:`, `mailto:`, `tel:`, `SMSTO:`). |
| GEN-N05 | Os valores digitados em cada tipo ficam preservados ao trocar de tipo. |

## 7. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| Tipo inicial | Texto | 21 tipos |
| Segurança do Wi-Fi | WPA/WPA2 | WPA, WEP, aberta |
| Rede oculta | desligado | ligado/desligado |
| Posição inicial do mapa | centro do Brasil, zoom 4 | zoom 2–19 |

## 8. Critérios de aceite
- [ ] Wi-Fi com `;` e `:` na senha gera um QR que conecta num Android e num iPhone.
- [ ] O contato gerado é salvo corretamente pela câmera do iOS e do Android.
- [ ] O evento gerado é aberto pelo app de agenda.
- [ ] Sem os campos obrigatórios, aparece "Preencha os campos primeiro." e nenhum QR é gerado.
- [ ] `exemplo.com` no tipo Link vira `https://exemplo.com`.
- [ ] Sem abrir o mapa, nenhuma requisição ao OpenStreetMap acontece.
- [ ] As funções puras de formato passam em `tests/format.test.ts`.

## 9. Questões em aberto
- **Gerar Pix?** Provisório: não. É candidato forte (muita busca no Brasil e o app já sabe ler BR Code); deve ter PRD próprio.
- **Fuso do evento:** as datas saem em hora local, sem fuso. Provisório: manter.
- **Duplicidade vCard × MeCard:** manter os dois; o MeCard é mais compacto e gera QR menor.
