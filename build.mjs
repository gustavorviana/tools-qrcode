/*
 * build.mjs — Gera o site estático em dist/.
 * - Bundla e minifica o JS (app + jsQR + qr-code-styling + zxing-wasm) em dist/app.js.
 * - Minifica o CSS em dist/app.css.
 * - Renderiza uma página HTML por entrada do catálogo (src/site/catalog.ts) a
 *   partir dos templates de src/templates/, e gera o sitemap.xml.
 * - Copia os assets estáticos de public/ e o .wasm do leitor de barras.
 * Tudo é servido pela própria origem: nenhum CDN em runtime.
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Versão do build, em ordem de prioridade:
//  1) env NEW_VERSION — definida pela pipeline (job de bump) no deploy;
//  2) última tag de versão do git (vX.Y.Z → X.Y.Z), quando buildando localmente;
//  3) '1.0' como padrão (ex.: sem env e sem git/tags).
function swVersion() {
  const fromEnv = process.env.NEW_VERSION;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  try {
    const tag = execSync('git tag --list "v*" --sort=-v:refname', { encoding: 'utf8' })
      .split('\n')[0].trim();
    if (tag) return tag.replace(/^v/, '');
  } catch {
    /* sem git disponível → cai para o padrão */
  }
  return '1.0';
}

const OUT = 'dist';
const TPL = 'src/templates';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const version = swVersion();

// 1) JS do app: bundle + minify a partir do entry TypeScript.
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2019'],
  legalComments: 'none',
  outfile: path.join(OUT, 'app.js'),
});

// 2) CSS: minify.
await build({
  entryPoints: ['src/styles.css'],
  bundle: true,
  minify: true,
  outfile: path.join(OUT, 'app.css'),
});

// 3) Catálogo + renderizador (TypeScript puro) compilados para um módulo Node
//    temporário e importados aqui — a mesma fonte que o app usa.
const siteMod = path.resolve(OUT, '.site.mjs');
await build({
  entryPoints: ['src/site/render.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: siteMod,
});
const site = await import(pathToFileURL(siteMod).href);
await rm(siteMod);

// 4) Templates.
const readDir = async (dir) => {
  const out = {};
  for (const f of await readdir(dir)) {
    if (f.endsWith('.html')) out[f.replace(/\.html$/, '')] = await readFile(path.join(dir, f), 'utf8');
  }
  return out;
};
const pages = await readDir(path.join(TPL, 'pages'));
const templates = {
  layout: await readFile(path.join(TPL, 'layout.html'), 'utf8'),
  pages: { home: pages.home, gen: pages.generator, read: pages.reader, privacy: pages.privacy },
  partials: await readDir(path.join(TPL, 'partials')),
  fields: await readDir(path.join(TPL, 'fields')),
};

// 5) Páginas: `/` → dist/index.html; `/wifi/` → dist/wifi/index.html.
const written = [];
for (const page of site.PAGES) {
  const html = site.renderPage(page, templates, version).replaceAll('__VERSION__', version);
  const dir = path.join(OUT, page.path);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), html);
  written.push(page.path);
}

// 6) Sitemap gerado do catálogo.
await writeFile(path.join(OUT, 'sitemap.xml'), site.renderSitemap(new Date().toISOString().slice(0, 10)));

// 7) Assets estáticos (o sw.js é tratado à parte no passo 9).
for (const file of await readdir('public')) {
  if (file === 'sw.js') continue;
  await copyFile(path.join('public', file), path.join(OUT, file));
}

// 8) WASM do leitor de código de barras (zxing-wasm), servido pela própria
// origem; o service worker o cacheia para funcionar offline.
await copyFile(
  'node_modules/zxing-wasm/dist/reader/zxing_reader.wasm',
  path.join(OUT, 'zxing_reader.wasm'),
);

// 9) Service worker: injeta a versão (nome do cache) e a lista de páginas a
// pré-cachear — cada release troca o SW e o precache.
const sw = (await readFile('public/sw.js', 'utf8'))
  .replaceAll('__BUILD_HASH__', version)
  .replace("'__PAGES__'", written.map((p) => `'${p}'`).join(', '));
await writeFile(path.join(OUT, 'sw.js'), sw);

const kb = async (f) => Math.round((await readFile(path.join(OUT, f))).length / 1024);
console.log(`Build OK -> ${written.length} páginas · app.js ${await kb('app.js')}KB · app.css ${await kb('app.css')}KB · v${version}`);
