import { defineConfig } from 'vitest/config';

// Os testes cobrem a lógica pura (format, decode, share, frames, raster) — sem
// DOM, então o ambiente node basta. Geração/leitura de QR e canvas ficam de
// fora (integração no browser, via Playwright nas verificações).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
