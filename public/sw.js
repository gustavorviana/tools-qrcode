/* Service Worker — cache offline do QR Utils.
   Único arquivo .js "separado" exigido pela plataforma (SW não pode ser inline).
   Toda a lógica do app está embutida no index.html. */
const CACHE_PREFIX = 'qr-utils-';
const CACHE = CACHE_PREFIX + 'v1';
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
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Só intercepta requisições da própria origem.
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  // Navegação (abrir/recarregar a página): tenta a rede e cai para o
  // index.html cacheado quando offline. Cobre qualquer URL (/, /index.html, etc.).
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        return await fetch(req);
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
