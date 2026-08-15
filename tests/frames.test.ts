import { describe, it, expect } from 'vitest';
import { createFrame } from '../src/qr/frames';
import { splitTwoLines } from '../src/qr/caption';
import type { QrRender } from '../src/qr/types';

/** QR falso (só precisa ser um <svg> com o tamanho lógico) para exercitar apply(). */
const qr = (): QrRender =>
  ({ svg: '<svg viewBox="0 0 1000 1000" width="1000" height="1000"></svg>', size: 1000, moduleCount: 33 });

const applySvg = (style: 'none' | 'corners' | 'border' | 'label', caption?: string): string =>
  createFrame(style, caption).apply(qr(), { fg: '#0f172a', bg: '#ffffff' }).svg;

const num = (svg: string, re: RegExp): number => Number(re.exec(svg)![1]);

describe('splitTwoLines', () => {
  it('string de 1 caractere não é dividida', () => {
    expect(splitTwoLines('A')).toEqual(['A']);
  });
  it('divide em duas linhas no espaço', () => {
    expect(splitTwoLines('OI MUNDO')).toEqual(['OI', 'MUNDO']);
  });
  it('equilibra escolhendo o corte que deixa a linha mais larga menor', () => {
    expect(splitTwoLines('UM DOIS TRES')).toEqual(['UM DOIS', 'TRES']);
  });
  it('parte no meio uma palavra sem espaços', () => {
    expect(splitTwoLines('AABB')).toEqual(['AA', 'BB']);
  });
});

describe('createFrame / apply', () => {
  it('NoneFrame não reserva faixa e devolve o QR intacto', () => {
    const f = createFrame('none');
    expect(f.captionHeight(1000)).toBe(0);
    const framed = f.apply(qr(), { fg: '#0f172a', bg: '#ffffff' });
    expect(framed.svg).toBe(qr().svg);      // QR inalterado
    expect(framed.width).toBe(1000);
    expect(framed.height).toBe(1000);
    expect(framed.svg).not.toContain('<tspan'); // sem legenda
  });

  it('molduras com legenda reservam altura de faixa (> 0)', () => {
    expect(createFrame('label').captionHeight(1000)).toBeGreaterThan(0);
    expect(createFrame('corners').captionHeight(1000)).toBeGreaterThan(0);
    expect(createFrame('border').captionHeight(1000)).toBeGreaterThan(0);
  });

  it('embute o QR como <svg> aninhado em x=0 y=0', () => {
    expect(applySvg('label', 'OI')).toContain('<svg x="0" y="0"');
  });

  it('altura externa = QR + faixa de legenda', () => {
    const f = createFrame('label', 'OI');
    const framed = f.apply(qr(), { fg: '#0f172a', bg: '#ffffff' });
    expect(framed.height).toBeCloseTo(1000 + f.captionHeight(1000), 5);
    expect(framed.width).toBe(1000);
  });

  it('LabelFrame: o texto fica no centro vertical da pílula', () => {
    const svg = applySvg('label', 'ESCANEIE');
    // Pílula = único rect com a cor de frente (fg); o fundo da faixa usa bg.
    const pill = /<rect x="[^"]*" y="([\d.]+)" width="[^"]*" height="([\d.]+)"[^>]*fill="#0f172a"\/>/.exec(svg)!;
    const pillCenter = Number(pill[1]) + Number(pill[2]) / 2;
    const textY = num(svg, /<tspan x="[^"]*" y="([\d.]+)"/);
    expect(pillCenter).toBeCloseTo(textY, 5);
  });

  it('a legenda é centralizada horizontalmente (text-anchor middle em x=size/2)', () => {
    const svg = applySvg('label', 'OI');
    expect(svg).toContain('text-anchor="middle"');
    expect(num(svg, /<tspan x="([\d.]+)"/)).toBeCloseTo(500, 5);
  });

  it('escapa XML no texto da legenda', () => {
    const svg = applySvg('label', 'A & <B>');
    expect(svg).toContain('A &amp; &lt;B&gt;');
    expect(svg).not.toContain('<B>');
  });

  it('legenda longa quebra em duas linhas (dois tspans)', () => {
    const svg = applySvg('label', 'ESCANEIE PARA VER O CARDAPIO COMPLETO');
    const tspans = svg.match(/<tspan\b/g) ?? [];
    expect(tspans.length).toBe(2);
  });
});
