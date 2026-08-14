/*
 * build.mjs — Empacota a fonte de src/ num único dist/index.html self-contained.
 * - Bundla e minifica o JS (app.js + jsQR do npm) num IIFE.
 * - Minifica o CSS.
 * - Injeta ambos no template src/index.html.
 * - Copia os assets estáticos de public/ para dist/.
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

// Versão do service worker, em ordem de prioridade:
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
await mkdir(OUT, { recursive: true });

// 1) JS: bundle + minify a partir do entry TypeScript (jsQR entra aqui, via import)
const js = await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2019'],
  legalComments: 'none',
  write: false,
});

// 2) CSS: minify
const css = await build({
  entryPoints: ['src/styles.css'],
  bundle: true,
  minify: true,
  loader: { '.css': 'css' },
  write: false,
});

// Evita que um eventual "</script>" no bundle feche a tag cedo demais.
const jsCode = js.outputFiles[0].text.replace(/<\/(script)/gi, '<\\/$1');
const cssCode = css.outputFiles[0].text.trim();

// Versão do build (env da pipeline → última tag → 1.0). Injetada no HTML e no SW.
const version = swVersion();

// 3) Injeta no template (função evita interpretação de $ no conteúdo).
const tpl = await readFile('src/index.html', 'utf8');
const html = tpl
  .replace('/*__CSS__*/', () => cssCode)
  .replace('/*__JS__*/', () => jsCode.trim())
  .replaceAll('__VERSION__', version);
await writeFile(path.join(OUT, 'index.html'), html);

// 4) Copia assets estáticos (o sw.js é tratado à parte no passo 6, com versão).
for (const file of await readdir('public')) {
  if (file === 'sw.js') continue;
  await copyFile(path.join('public', file), path.join(OUT, file));
}

// 5) Copia o WASM do leitor de código de barras (zxing-wasm) para a raiz do dist.
// É o único binário que não dá para embutir no HTML; o service worker o cacheia
// (precache) para funcionar offline. O barcode.ts o carrega por './zxing_reader.wasm'.
await copyFile(
  'node_modules/zxing-wasm/dist/reader/zxing_reader.wasm',
  path.join(OUT, 'zxing_reader.wasm'),
);

// 6) Service worker: injeta a mesma versão na versão do cache, disparando a
// atualização do SW no cliente a cada release.
const sw = (await readFile('public/sw.js', 'utf8')).replaceAll('__BUILD_HASH__', version);
await writeFile(path.join(OUT, 'sw.js'), sw);

console.log(`Build OK -> ${OUT}/index.html (${Math.round(Buffer.byteLength(html) / 1024)}KB) · sw ${version}`);
