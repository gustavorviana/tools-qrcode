/*
 * tunnel.mjs — Preview online para TESTES (ex.: abrir no celular).
 * Faz o build, serve o dist/ em localhost:5000 e cria um túnel HTTPS
 * público temporário (cloudflared). Use a URL https://...trycloudflare.com
 * que aparecer no terminal. Ctrl+C encerra tudo.
 *
 * Obs.: é só um túnel de teste (URL temporária), não é publicação.
 */
import { spawn } from 'node:child_process';

const PORT = 5000;

// 1) Build (executa o build.mjs uma vez)
console.log('Buildando...');
await import('./build.mjs');

// 2) Sobe o servidor local e o túnel
console.log(`\nServindo dist/ em http://localhost:${PORT} e abrindo túnel HTTPS...`);
console.log('A URL pública (https://...trycloudflare.com) vai aparecer abaixo.\n');

const opts = { stdio: 'inherit', shell: true };
const serve = spawn('npx', ['--yes', 'serve', '-l', String(PORT), 'dist'], opts);
const tunnel = spawn('npx', ['--yes', 'cloudflared', 'tunnel', '--url', `http://localhost:${PORT}`], opts);

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  serve.kill();
  tunnel.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
serve.on('exit', shutdown);
tunnel.on('exit', shutdown);
