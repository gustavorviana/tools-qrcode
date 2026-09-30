# DESIGN-008 — Integração com o app Viana Utils

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-008](../spec/008-viana-utils.md) |
| **Módulos** | `src/viana.ts`, `src/app.ts`, `src/templates/layout.html`, `src/templates/partials/{about,overlays,privacy}.html`, `src/templates/pages/home.html`, `src/styles.css` |
| **Atualizado em** | 2026-09-29 |

## 1. Resumo
O Viana Utils injeta o `bridge.js` antes de qualquer script do site. Ele cria `window.VianaApp`, um objeto congelado com `platform`, `version` e `exit()`.

O site trata esse objeto em duas etapas:
- **No `<head>`:** um script inline de uma linha adiciona a classe `in-viana` ao `<html>` antes da primeira pintura.
- **No `app.js`:** o `init()` repete a marcação (`setupViana`), guarda `inViana` e chama `bindVianaBack()`. Essa função tira o `hidden` do link "‹ Voltar" e liga o clique ao `VianaApp.exit()`.

O CSS usa duas classes utilitárias: `.no-viana` (some no app) e `.viana-only` (só aparece no app).

## 2. Módulos e dependências
| Módulo | Papel |
|---|---|
| `src/viana.ts` | tipos da API, `inVianaApp`, `setupViana`, `vianaExit`, `bindVianaBack`, `VIANA_CLASS` (puro, testável com objetos falsos) |
| `src/templates/layout.html` | script inline no `<head>` e link `<a class="viana-back" id="vianaBack" href="/" hidden>` no cabeçalho |
| `src/app.ts` | `init()` → `setupViana(document)` e `bindVianaBack(#vianaBack)`; `showInstall()` retorna cedo no app |
| `src/styles.css` | regras `.in-viana …`, estilo do `.viana-back` |

Sem dependências novas.

## 3. Modelo de dados
```ts
interface VianaAppApi {
  readonly platform: 'android';
  readonly version: number;   // 1 nesta implementação
  exit(): void;
}
declare global { interface Window { readonly VianaApp?: VianaAppApi } }
```
Estado: a classe `in-viana` no `<html>` e o campo `App.inViana`. Nada é persistido.

## 4. Componentes
```ts
const VIANA_CLASS = 'in-viana';
function inVianaApp(w?: Pick<Window, 'VianaApp'>): boolean
function setupViana(doc: Pick<Document, 'documentElement'>, w?: Pick<Window, 'VianaApp'>): boolean
function vianaExit(w?: Pick<Window, 'VianaApp'>): void
function bindVianaBack(el: Pick<HTMLElement, 'hidden' | 'addEventListener'> | null, w?): boolean
```

## 5. Fluxos
1. O WebView injeta `bridge.js`, que cria `window.VianaApp`.
2. No `<head>`: `if(window.VianaApp)document.documentElement.classList.add('in-viana')`. O CSS já esconde os `.no-viana`.
3. `app.js` (`defer`) → `init()` → `setupViana(document)` (idempotente) → `inViana = true` → `bindVianaBack()` remove o `hidden` do "‹ Voltar".
4. `showInstall()` retorna sem mostrar o banner quando `inViana`.
5. Toque em "‹ Voltar" → `preventDefault()` (o `href="/"` é só fallback) → `VianaApp.exit()`. O app fecha a tela.

## 6. UI
| Elemento | Classe | No app |
|---|---|---|
| "‹ Voltar" (cabeçalho, à esquerda da marca; pílula com borda, chevron em SVG, hover na cor de destaque, como os chips do site) | `viana-back` + atributo `hidden` | o JS remove o `hidden` |
| Banner de instalação `#installBar` | `no-viana` | oculto |
| Cartão "Instalar como app" `#aboutInstallCard` | `no-viana` | oculto |
| Pilar "Funciona offline" da home | trecho "Instale como app e use" `no-viana`, e "Use" `viana-only` | "Use sem internet depois da primeira visita." |
| Linha sobre a preferência de instalação (`/privacidade/`) | `no-viana` | oculta |

## 7. Permissões e manifest
Nenhuma mudança. Dentro do app, o `beforeinstallprompt` não dispara; o manifesto continua valendo para o navegador.

## 8. Erros e casos de borda
| Situação | Comportamento |
|---|---|
| `window.VianaApp` ausente | nada muda; `vianaExit()` não faz nada |
| `VianaApp.version` > 1 | ignorado; o site usa só o que existe desde a v1 |
| Página aberta num iframe ou em outro domínio dentro do app | o app não injeta o objeto; comportamento de site comum |
| JS do site falha antes do `init()` | o script do `<head>` já aplicou `in-viana`, então os elementos de instalação continuam ocultos; o "‹ Voltar" continua oculto (sem JS não haveria como chamar o `exit()`) |

## 9. Testes
| Teste | Cobre |
|---|---|
| `viana.test.ts` › detecção, `setupViana`, `bindVianaBack` (fica `hidden` fora do app; exibe e chama `exit()` dentro), `vianaExit` | VIA-F01, VIA-F02, VIA-N02 |
| `site.test.ts` › script no `<head>` e link "‹ Voltar" `hidden` em todas as páginas | VIA-F02, VIA-N01 |
| `site.test.ts` › classes `no-viana` nos elementos de instalação | VIA-F03 |
| roteiro manual: Playwright ad hoc (fora do repo) com `addInitScript` definindo `VianaApp` | VIA-F02 a VIA-F04 (clique chama `exit()` uma vez) |

## 10. Plano de implementação
Concluído: `src/viana.ts` → script no `<head>` e botão no layout → classes nos partials → CSS → `init()`/`showInstall()` → testes.

## 11. Decisões e alternativas descartadas
- **Classe no `<html>` via script inline no `<head>`** em vez de só no `app.js` (`defer`): evita que o banner e o cartão de instalação apareçam por um instante.
- **Utilitários `.no-viana`/`.viana-only`** em vez de JS que remove elementos: declarativo e cobre páginas futuras só com a classe.
- **"‹ Voltar" oculto no HTML e exibido por JS** em vez de por classe CSS: sem o JS não há como chamar `exit()`, então o link só existe para quem pode usá-lo. É um `<a>` estilizado como os chips do site, não um `<button>` solto.
- **Não usar o user agent:** o objeto `VianaApp` já está disponível antes de qualquer script, e o UA é mais frágil.
