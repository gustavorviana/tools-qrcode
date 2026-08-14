/* Service Worker — cache offline do QR Utils.
   Único arquivo .js "separado" exigido pela plataforma (SW não pode ser inline).
   Toda a lógica do app está embutida no index.html. */
const CACHE_PREFIX = 'qr-utils-';
// A versão é o commit atual, injetado pelo build.mjs (SHA do Cloudflare Pages ou
// do git). Cada commit em main gera um sw.js diferente → o navegador detecta a
// mudança, reinstala o SW e troca o precache. (Em dev sem build, o placeholder
// permanece literal.)
const CACHE = CACHE_PREFIX + '__BUILD_HASH__';
// Cache transitório para a imagem recebida via share_target (não é versionado
// nem removido na limpeza de versões).
const SHARE_CACHE = CACHE_PREFIX + 'share';
// Nota: usamos './' (URL canônica, responde 200) e NÃO './index.html', que os
// servidores de estáticos (serve, Cloudflare Pages) redirecionam (301) para './'
// — e a Cache API não armazena respostas redirecionadas.
const ASSETS = [
  './',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './og-image.png',
  './screenshot-narrow.png',
  './screenshot-wide.png',
  // Leitor de código de barras (ZXing-C++ em WebAssembly). Precache para que a
  // leitura funcione offline já na primeira carga.
  './zxing_reader.wasm',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Cacheia um a um: se um arquivo falhar, os demais ainda são gravados
    // (o addAll seria atômico e abortaria tudo em qualquer 404).
    await Promise.allSettled(
      ASSETS.map((a) => cache.add(new Request(a, { cache: 'reload' })))
    );
    await self.skipWaiting();
  })());
});

// Ao ativar uma nova versão, remove todos os caches antigos deste app,
// mantendo apenas o da versão atual.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE && k !== SHARE_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  // share_target: outro app compartilhou uma imagem (POST multipart). Guardamos
  // o arquivo no cache e redirecionamos para a página, que o lê e decodifica.
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const form = await req.formData();
        const file = form.get('image');
        if (file && file.size) {
          const cache = await caches.open(SHARE_CACHE);
          await cache.put('shared-image', new Response(file, {
            headers: { 'content-type': file.type || 'application/octet-stream' },
          }));
        }
      } catch { /* imagem ausente/ilegível → segue para a página mesmo assim */ }
      return Response.redirect(new URL('./?share-target=1', self.registration.scope).href, 303);
    })());
    return;
  }

  if (req.method !== 'GET') return;

  // Navegação (abrir/recarregar a página): busca na rede e cai para o HTML
  // cacheado quando offline. Cobre qualquer URL (/, /index.html, etc.).
  // `cache: 'no-cache'` revalida via ETag em vez de baixar tudo: o servidor
  // responde 304 (poucos bytes) quando o HTML não mudou e só manda o corpo
  // inteiro quando muda — nunca serve HTML velho, sem redownload à toa.
  // Guardamos a cópia fresca para servir offline depois.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-cache' });
        const copy = fresh.clone();
        caches.open(CACHE).then((c) => c.put('./', copy)).catch(() => {});
        return fresh;
      } catch {
        return (await caches.match('./'))
          || (await caches.match('./index.html'))
          || Response.error();
      }
    })());
    return;
  }

  // Demais assets: cache-first, com atualização em segundo plano quando online.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return resp;
    } catch {
      return Response.error();
    }
  })());
});
