import { describe, it, expect } from 'vitest';
import { toMatrix } from '../src/qr/matrix';
import { renderCustomQr, type CustomRenderOptions } from '../src/qr/customRenderer';

/** Matriz 21×21 (versão 1) vazia com um módulo de dado isolado em (10,10). */
function fakeMatrix() {
  const modules = Array.from({ length: 21 }, () => Array<boolean>(21).fill(false));
  modules[10][10] = true; // longe dos 3 finders
  return toMatrix(modules);
}

const opts = (over: Partial<CustomRenderOptions> = {}): CustomRenderOptions => ({
  shape: 'circle',
  eyeFrame: 'square',
  eyeCenter: 'solid',
  colors: { fg: '#0f172a', bg: '#ffffff', eyeFrame: '#e11d48', eyeCenter: '#16a34a' },
  bgTransparent: false,
  logo: null,
  base: 1000,
  margin: 40,
  ...over,
});

const count = (s: string, re: RegExp): number => (s.match(re) ?? []).length;

describe('renderCustomQr', () => {
  it('produz um SVG com o viewBox lógico', () => {
    const svg = renderCustomQr(fakeMatrix(), opts());
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0 1000 1000"');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('pinta o fundo quando não é transparente e omite quando é', () => {
    expect(renderCustomQr(fakeMatrix(), opts())).toContain('width="1000" height="1000" fill="#ffffff"');
    const t = renderCustomQr(fakeMatrix(), opts({ bgTransparent: true }));
    expect(t).not.toContain('width="1000" height="1000" fill="#ffffff"');
  });

  it('desenha os 3 olhos com as cores de moldura e centro', () => {
    const svg = renderCustomQr(fakeMatrix(), opts());
    expect(count(svg, /stroke="#e11d48"/g)).toBe(3);   // 3 molduras
    expect(count(svg, /fill="#16a34a"/g)).toBe(3);      // 3 centros
  });

  it('desenha o corpo do módulo isolado com a cor dos módulos', () => {
    const svg = renderCustomQr(fakeMatrix(), opts());
    expect(svg).toMatch(/<circle[^>]*fill="#0f172a"/); // corpo 'circle'
  });

  it('olhos "auto" herdam a forma sugerida pelo corpo', () => {
    // corpo 'circle' → autoEye.frame = 'circle' → molduras viram <circle stroke>
    const svg = renderCustomQr(fakeMatrix(), opts({ eyeFrame: 'auto', eyeCenter: 'auto' }));
    expect(count(svg, /<circle[^>]*stroke="#e11d48"/g)).toBe(3);
  });

  it('o centro do olho aceita qualquer forma do catálogo de corpo', () => {
    // centro 'heart' → 3 corações no centro dos finders, na cor do centro
    const svg = renderCustomQr(fakeMatrix(), opts({ eyeCenter: 'heart' }));
    expect(count(svg, /<path[^>]*fill="#16a34a"/g)).toBe(3);
  });

  it('embute o logo (imagem + fundo) quando fornecido', () => {
    const logo = 'data:image/png;base64,AAAA';
    const svg = renderCustomQr(fakeMatrix(), opts({ logo }));
    expect(svg).toContain('<image');
    expect(svg).toContain(`href="${logo}"`);
  });
});
