# PRD-008 — Integração com o app Viana Utils

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-008](../specs/008-viana-utils.md) |
| **Módulo** | `src/viana.ts`, `src/templates/layout.html`, `src/styles.css`, `src/app.ts` |
| **Atualizado em** | 2026-09-29 |

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
- [ ] Com `window.VianaApp` definido (Playwright `addInitScript`), o `<html>` recebe `in-viana`, o "‹ Voltar" aparece e tocar nele chama `exit()` uma vez.
- [ ] Nesse modo, o cartão "Instalar como app", o banner e os textos de instalação não aparecem.
- [ ] Sem `window.VianaApp`, o "‹ Voltar" não aparece e os elementos de instalação continuam visíveis.
- [ ] `tests/viana.test.ts` e os casos Viana de `tests/site.test.ts` passam.

## 8. Questões em aberto
- **Detectar pelo user agent (` VianaUtils`)?** Provisório: não é necessário, porque o objeto existe antes dos scripts do site. Usar o UA só se um dia houver renderização no servidor.
- **Tema escuro:** o app repassa `prefers-color-scheme: dark`, mas o site ainda não tem modo escuro. Fica para um PRD próprio.
