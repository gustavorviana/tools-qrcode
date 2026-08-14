// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { QRDesigner } from '../src/qr/designer';

// Trecho único do path de coração (ver HEART em src/qr/shapes.ts).
const HEART_MARK = '8.5 3.2';

async function svgFor(shape: string, eyeCenter: string): Promise<string> {
  const d = new QRDesigner();
  d.text = 'https://exemplo.com/teste';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d.shape = shape as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d.eyeCenterShape = eyeCenter as any;
  return d.toSVG();
}

describe('REPRO integração (jsdom): centro de olho ícone com corpo da lib', () => {
  it('corpo custom (diamond) + centro coração → desenha o coração', async () => {
    const svg = await svgFor('diamond', 'heart');
    expect(svg).toContain(HEART_MARK);
  });

  it('corpo LIB (solid) + centro coração → deve desenhar o coração (não virar quadrado)', async () => {
    const svg = await svgFor('solid', 'heart');
    expect(svg).toContain(HEART_MARK);
  });

  it('corpo LIB (rounded) + centro estrela → deve desenhar a estrela', async () => {
    const svg = await svgFor('rounded', 'star');
    // Marca do path de estrela (ver STAR em shapes.ts).
    expect(svg).toContain('14.94 8.63');
  });
});
