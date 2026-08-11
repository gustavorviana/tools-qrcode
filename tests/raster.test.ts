import { describe, it, expect } from 'vitest';
import { rasterizeSVG } from '../src/qr/raster';

const SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" shape-rendering="crispEdges" viewBox="0 0 1000 1000">',
  '<defs><clipPath id="c1"><rect x="1" y="2" width="10" height="10"/><rect x="20" y="2" width="10" height="10"/></clipPath></defs>',
  '<rect x="0" y="0" height="1000" width="1000" clip-path="url(\'#c1\')" fill="#0f172a"/>',
  '</svg>',
].join('');

describe('rasterizeSVG', () => {
  it('troca crispEdges por geometricPrecision', () => {
    const out = rasterizeSVG(SVG, 500, 600);
    expect(out).toContain('shape-rendering="geometricPrecision"');
    expect(out).not.toContain('crispEdges');
  });

  it('desfaz o clip: rect recortado vira <g> com stroke da mesma cor + as formas do clip', () => {
    const out = rasterizeSVG(SVG, 500, 600);
    expect(out).toContain('<g fill="#0f172a" stroke="#0f172a" stroke-width="1" stroke-linejoin="round">');
    expect(out).toContain('<rect x="1" y="2" width="10" height="10"/>');
    expect(out).toContain('<rect x="20" y="2" width="10" height="10"/>');
    // o rect recortado original (com clip-path) não sobra
    expect(out).not.toMatch(/<rect[^>]*clip-path="url\('#c1'\)"/);
  });

  it('força width/height do <svg> para a resolução alvo', () => {
    const out = rasterizeSVG(SVG, 500, 600);
    expect(out).toMatch(/<svg\b[^>]*\swidth="500"/);
    expect(out).toMatch(/<svg\b[^>]*\sheight="600"/);
  });

  it('recorte com id desconhecido é mantido intacto (não quebra o desenho)', () => {
    const svg = '<svg shape-rendering="crispEdges" width="10" height="10">'
      + '<rect x="0" y="0" width="10" height="10" clip-path="url(\'#naoexiste\')" fill="#000000"/></svg>';
    const out = rasterizeSVG(svg, 40, 40);
    expect(out).toContain('clip-path="url(\'#naoexiste\')"');
    expect(out).not.toContain('<g ');
  });
});
