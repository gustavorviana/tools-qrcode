# Spec — PWA, instalação e offline

Código: `public/manifest.webmanifest`, `public/sw.js`, `src/app.ts` (`init`,
`handleLaunch`, `consumeSharedImage`, `showInstall`, `installApp`, `promptInstall`).

## Manifesto

- `name`: "QR Utils — Gerador e Leitor de QR Code"; `short_name`: "QR Utils"; `lang` pt-BR.
- `display: standalone`, orientação retrato, tema e fundo brancos.
- Ícones SVG, 192 e 512 px, e um maskable 512. Screenshots estreito (540×1080) e
  largo (1280×800).
- **Atalhos:** "Ler" (`./?view=read`) e "Gerar" (`./?view=gen`).
- **`file_handlers`:** o app se registra para abrir `image/*` (png, jpg, gif, webp,
  bmp, svg, avif). O arquivo chega por `launchQueue` e é lido na aba Ler.
- **`share_target`:** recebe imagens (POST multipart em `./share-target`).
- `launch_handler: navigate-existing`, painel lateral do Edge com 400 px.

## Service worker

- Cache versionado: `qr-utils-<versão>`. A versão é injetada pelo build (variável
  da pipeline → última tag git → `1.0`), então cada release troca o SW e o
  precache. Ao ativar, apaga os caches antigos do app, exceto `qr-utils-share`.
- **Precache:** `./`, manifesto, ícones, og-image, screenshots e `zxing_reader.wasm`.
  Os arquivos são cacheados um a um (`allSettled`), para que um 404 não aborte o resto.
  Usa `./` e não `./index.html`, porque o servidor responde a este com 301 e
  respostas redirecionadas não entram no cache.
- **Navegação:** rede primeiro com `cache: 'no-cache'` (revalida por ETag, sem
  baixar de novo quando não mudou) e guarda a cópia. Offline, serve o HTML do cache.
- **Demais assets da origem:** cache primeiro; o que falta é buscado e guardado.
- Requisições de outra origem (tiles e busca do OSM) **não** passam pelo SW.
- **Share target:** o SW guarda a imagem em `qr-utils-share/shared-image` e
  redireciona (303) para `./?share-target=1`. A página lê a imagem, apaga do
  cache e a decodifica.

## Instalação

- **Android/desktop:** captura `beforeinstallprompt` e mostra uma barra "Instalar
  o QR Utils" com o botão Instalar. Some após `appinstalled`.
- **iOS:** barra com instruções (Compartilhar → Adicionar à Tela de Início).
- Dispensar grava `installDismissed` no `localStorage`, o único dado persistido pelo app.
- A aba Sobre tem um cartão "Instalar como app", oculto quando o app já roda instalado.

## Parâmetros de inicialização

| URL | Efeito |
|---|---|
| `?view=gen\|read\|about` | abre a aba |
| `?share-target=1` | lê a imagem recebida por compartilhamento |
| `#q=…` / `?q=…` | abre um QR compartilhado ([exportacao-e-compartilhamento.md](exportacao-e-compartilhamento.md)) |

## Requisitos

Câmera, service worker e instalação exigem HTTPS ou `localhost`. Para testar no
celular, use `npm run preview:online` (túnel cloudflared temporário).
