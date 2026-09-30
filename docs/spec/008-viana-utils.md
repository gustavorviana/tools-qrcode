# SPEC-008 — Integração com o app Viana Utils

| | |
|---|---|
| **Status** | Implementado |
| **Design** | [DESIGN-008](../design/008-viana-utils.md) |
| **Módulo** | `src/viana.ts`, `src/templates/layout.html`, `src/styles.css`, `src/app.ts` |
| **Atualizado em** | 2026-09-30 |

## 1. Problema
O QR Utils também é aberto dentro do app Android **Viana Utils**. Lá ele roda em tela cheia num `WebView`, sem a barra do app, e o cabeçalho visível é o do próprio site. Isso cria dois problemas:
- **Não há como sair.** O site não oferecia jeito de voltar ao hub; a pessoa dependia do botão voltar do Android.
- **Os convites para instalar não fazem sentido.** O site pedia para "instalar como app" (banner, cartão, textos), mas no Viana Utils ele já está dentro de um app e não há instalação.

## 2. Objetivos
- Detectar quando o site está aberto no Viana Utils (`window.VianaApp`).
- Mostrar "‹ Voltar" no cabeçalho, ao lado da marca, que fecha o app web e volta ao hub.
- Esconder toda menção a instalar como app dentro do Viana Utils.
- Fora do app, nada muda.

## 3. Cenários de uso
- Abro o QR Utils pelo hub do Viana Utils, gero um QR e toco em "‹ Voltar" para voltar ao hub.
- No Viana Utils, não vejo banner, cartão nem texto pedindo para instalar o app.
- No navegador comum, o site continua igual: sem "Voltar" e com o convite para instalar.

## 4. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| VIA-F01 | Detectar o app pela existência de `window.VianaApp` | Must |
| VIA-F02 | Link "‹ Voltar" à esquerda do ícone do QR Utils, em todas as páginas, no visual de pílula do site. Vem oculto (`hidden`) no HTML e só é exibido por JS quando `VianaApp` existe; ao tocar, chama `VianaApp.exit()` | Must |
| VIA-F03 | Esconder no app: banner de instalação, cartão "Instalar como app", o texto "Instale como app" da home e a linha sobre a preferência de instalação na página Privacidade | Must |
| VIA-F04 | O banner de instalação nunca é exibido no app, nem por código | Must |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| VIA-N01 | Nenhum elemento de instalação pisca antes de sumir: a detecção acontece no `<head>`, antes da primeira pintura. |
| VIA-N02 | Fora do app, o HTML e o comportamento são os mesmos de antes; `vianaExit()` sem o app não faz nada nem gera erro. |
| VIA-N03 | Usa só a API pública da versão 1 (`platform`, `version`, `exit`); nunca o canal interno `VianaBridge`. |
| VIA-N04 | Nenhuma requisição ou dependência nova. |

## 6. Configurações
Nenhuma.

## 7. Critérios de aceite
| ID | Requisito | Critério | Verificação |
|---|---|---|---|
| AC-VIA-F01.1 | VIA-F01 | Com `window.VianaApp` definido, o app deve ser detectado e o `<html>` deve receber `in-viana`; sem ele, não. | `viana.test.ts` |
| AC-VIA-F02.1 | VIA-F02 | Toda página deve trazer o "‹ Voltar" com `hidden` no HTML. | `site.test.ts` |
| AC-VIA-F02.2 | VIA-F02 | Com `VianaApp` definido, o "‹ Voltar" deve aparecer e tocar nele deve chamar `exit()` uma vez. | `viana.test.ts` + manual (Playwright ad hoc com `addInitScript`, fora do repo) |
| AC-VIA-F03.1 | VIA-F03 | Todos os elementos de instalação listados no VIA-F03 devem ter a classe `no-viana`. | `site.test.ts` |
| AC-VIA-F04.1 | VIA-F04 | Com `VianaApp` definido, o banner de instalação não deve aparecer, nem se `showInstall()` for chamado. | manual (Playwright ad hoc, fora do repo) |
| AC-VIA-N01.1 | VIA-N01 | O `<head>` de toda página deve marcar `in-viana` antes do CSS/JS do site. | `site.test.ts` |
| AC-VIA-N02.1 | VIA-N02 | Sem `VianaApp`, o "‹ Voltar" deve continuar oculto, os elementos de instalação visíveis, e `vianaExit()` não deve lançar erro. | `viana.test.ts` |

## 8. Fora de escopo
- Qualquer uso do canal interno `VianaBridge` ou de APIs além da v1 (`platform`, `version`, `exit`).
- Detecção pelo user agent.
- Tema escuro (ver Questões em aberto).
- Integração com o app em plataformas além do Android.

## 9. Questões em aberto
- **Detectar pelo user agent (` VianaUtils`)?** Provisório: não é necessário, porque o objeto existe antes dos scripts do site. Usar o UA só se um dia houver renderização no servidor.
- **Tema escuro:** o app repassa `prefers-color-scheme: dark`, mas o site ainda não tem modo escuro. Fica para uma spec própria.
