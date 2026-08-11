/*
 * build.mjs — Empacota a fonte de src/ num único dist/index.html self-contained.
 * - Bundla e minifica o JS (app.js + jsQR do npm) num IIFE.
 * - Minifica o CSS.
 * - Injeta ambos no template src/index.html.
 * - Copia os assets estáticos de public/ para dist/.
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';

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

// 3) Injeta no template (função evita interpretação de $ no conteúdo).
const tpl = await readFile('src/index.html', 'utf8');
const html = tpl
  .replace('/*__CSS__*/', () => cssCode)
  .replace('/*__JS__*/', () => jsCode.trim());
await writeFile(path.join(OUT, 'index.html'), html);

// 4) Copia assets estáticos.
for (const file of await readdir('public')) {
  await copyFile(path.join('public', file), path.join(OUT, file));
}

console.log(`Build OK -> ${OUT}/index.html (${Math.round(Buffer.byteLength(html) / 1024)}KB)`);
