# DESIGN-005 — App instalável e offline (PWA)

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-005](../spec/005-pwa-offline.md) |
| **Módulos** | `public/manifest.webmanifest`, `public/sw.js`, `src/app.ts`, `build.mjs` |
| **Atualizado em** | 2026-09-30 |

## 1. Resumo
- **Manifesto:** completo, com atalhos, `file_handlers` e `share_target`.
- **Service worker versionado pelo build:** precache dos assets, rede primeiro para a navegação (revalidação por ETag) e cache primeiro para os demais assets da origem.
- **Share target:** o SW intercepta o POST, guarda a imagem num cache transitório e redireciona para a página, que a decodifica.
- **Instalação:** tratada no `App`, com o prompt nativo ou instruções no iOS.

## 2. Módulos e dependências
- `public/manifest.webmanifest` (estático).
- `public/sw.js`: o build troca `__BUILD_HASH__` pela versão (DESIGN-000).
- `src/app.ts`: `init` (registra o SW no `load`), `handleLaunch`, `consumeSharedImage`, `showInstall`, `dismissInstall`, `installApp`, `promptInstall`, e os eventos `beforeinstallprompt` e `appinstalled`.
- Depende de DESIGN-004 (`decodeFile`) para ler as imagens recebidas.

## 3. Modelo de dados
| Item | Valor |
|---|---|
| Cache do app | `qr-utils-<versão>-<hash>` (hash do conteúdo de JS, CSS e páginas) |
| Cache de compartilhamento | `qr-utils-share`, chave `shared-image` |
| Precache | todas as páginas do catálogo (`/`, `/wifi/`, `/ler/`…), `app.js?v=<hash>`, `phone.js?v=<hash>`, `app.css?v=<hash>`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `og-image.png`, `screenshot-narrow.png`, `screenshot-wide.png`, `zxing_reader.wasm` |
| `localStorage` | `installDismissed = '1'` |

Manifesto: `id "/"`, `start_url "./"`, `scope "./"`, `display standalone`, `orientation portrait`, `lang pt-BR`, `categories [utilities, productivity]`, `launch_handler.client_mode navigate-existing`, `edge_side_panel.preferred_width 400`.

## 4. Componentes
```ts
// sw.js
self.addEventListener('install' | 'activate' | 'fetch', …)
// App
private handleLaunch(): void
private consumeSharedImage(): Promise<void>
private showInstall(mode: 'ios' | 'android'): void
dismissInstall(): void
installApp(): Promise<void>
promptInstall(): void
```

## 5. Fluxos
**install:** abre o cache da versão, faz `cache.add(new Request(a, { cache: 'reload' }))` para cada asset com `Promise.allSettled` e chama `skipWaiting()`.

**activate:** apaga os caches `qr-utils-*` diferentes da versão atual e de `qr-utils-share`, depois `clients.claim()`.

**fetch**
1. Outra origem: não intercepta.
2. `POST …/share-target`: lê o `formData`, guarda o campo `image` em `qr-utils-share/shared-image` e responde `303` para `/ler/?share-target=1`.
3. Não-GET: não intercepta.
4. Navegação: `fetch(req, { cache: 'no-cache' })`, guarda a cópia sob a chave da página (`pageKey`: caminho sem query, com barra final) e retorna. Offline, usa essa chave ou `/` do cache e, na falta deles, `Response.error()`.
5. Demais: cache primeiro, com casamento exato da URL (inclusive o `?v=<hash>`); na falta, busca, guarda se `ok` e retorna. Assim um `app.css?v=<hash novo>` nunca recebe o arquivo antigo, nem na 1ª carga após um deploy.

**Inicialização (`handleLaunch`)**
- `?view=gen|read|about` abre a aba.
- `?share-target=1`: limpa a URL, abre Ler e chama `consumeSharedImage()`, que lê, apaga e decodifica.
- `launchQueue.setConsumer`: abre Ler e decodifica o primeiro arquivo.

**Instalação**
- iOS fora do modo standalone: mostra a barra com instruções.
- `beforeinstallprompt`: `preventDefault`, guarda o evento e mostra a barra com "Instalar".
- `installApp()` chama o prompt e esconde a barra se aceito.
- Dispensar grava `installDismissed`; a barra não volta.
- Já em modo standalone: esconde `#aboutInstallCard`.

## 6. UI
- `#installBar` (texto + Instalar + ✕).
- Cartão "Instalar como app" na seção Sobre da home, com a dica para iOS.
- Parâmetros de URL: `?view=`, `?share-target=1`.

## 7. Permissões e manifest
| Declaração | Uso |
|---|---|
| `icons` (SVG, 192, 512, maskable 512) | instalação |
| `screenshots` (540×1080 estreito, 1280×800 largo) | prompt de instalação rico |
| `shortcuts` "Ler" (`./?view=read`), "Gerar" (`./?view=gen`) | atalhos no ícone |
| `file_handlers` `image/*` (png, jpg, jpeg, gif, webp, bmp, svg, avif) | abrir imagem com o app |
| `share_target` POST multipart, campo `image` (`image/*`) | receber imagem compartilhada |

Nenhuma permissão é pedida para instalar.

## 8. Erros e casos de borda
| Situação | Comportamento |
|---|---|
| Registro a partir de uma subpágina (`/wifi/`) | `register('/sw.js', { scope: '/' })` com caminho absoluto; relativo, viraria `/wifi/sw.js` (404) |
| Um asset do precache dá 404 | os demais são cacheados |
| `…/index.html` redireciona (301) | não é precacheado; as páginas usam a URL com barra final |
| Offline sem cache | `Response.error()` |
| Share target sem imagem ou ilegível | redireciona mesmo assim; a página ignora |
| `localStorage` bloqueado | exceção ignorada; a barra pode reaparecer |
| Navegador sem SW | o app funciona online, sem offline |
| iOS | sem `beforeinstallprompt`; só instruções |

## 9. Testes
Não há testes automatizados do SW nem do manifesto.

| Roteiro manual | Cobre |
|---|---|
| Lighthouse (instalável) | PWA-F01 |
| instalar, desligar a rede, gerar e ler | PWA-F08, PWA-N01 |
| atalhos, abrir imagem, compartilhar da galeria | PWA-F05 a PWA-F07 |
| deploy e recarregar | PWA-N02 |

## 10. Plano de implementação
Concluído. Marcos: `e58efef` (SW inicial), `0f5d9f7` (manifesto completo, abrir e compartilhar imagem), `64d7c33` (versão do SW pela pipeline).

## 11. Decisões e alternativas descartadas
- **Versão do cache = versão do release**, e não o hash do conteúdo: cada deploy troca o SW de forma previsível.
- **Rede primeiro com `no-cache` na navegação:** nunca serve HTML velho e economiza banda com o 304.
- **`allSettled` em vez de `addAll`:** um 404 não derruba todo o precache.
- **Share target via SW + cache** em vez de ler o POST na página: uma página estática não recebe POST.
- **Sem Workbox:** o SW é pequeno e legível; menos dependência.
