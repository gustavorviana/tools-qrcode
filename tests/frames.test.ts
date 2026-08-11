import { describe, it, expect } from 'vitest';
import { createFrame, splitTwoLines, type FrameContext } from '../src/qr/frames';

const UNIT = 1000 / 34;

/** Monta o contexto como o QRDesigner faz, com a altura de faixa da própria moldura. */
const ctxFor = (style: 'none' | 'corners' | 'border' | 'label', caption?: string): FrameContext => {
  const f = createFrame(style, caption);
  return { size: 1000, captionHeight: f.captionHeight(UNIT, 1000), unit: UNIT, fg: '#0f172a', bg: '#ffffff' };
};

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

describe('createFrame', () => {
  it('NoneFrame não reserva faixa nem desenha nada', () => {
    const f = createFrame('none');
    expect(f.captionHeight(UNIT, 1000)).toBe(0);
    expect(f.render(ctxFor('none'))).toBe('');
  });

  it('molduras com legenda reservam altura de faixa (> 0)', () => {
    expect(createFrame('label').captionHeight(UNIT, 1000)).toBeGreaterThan(0);
    expect(createFrame('corners').captionHeight(UNIT, 1000)).toBeGreaterThan(0);
    expect(createFrame('border').captionHeight(UNIT, 1000)).toBeGreaterThan(0);
  });

  it('LabelFrame: o texto fica no centro vertical da pílula', () => {
    const svg = createFrame('label', 'ESCANEIE').render(ctxFor('label'));
    // Pílula = único rect com a cor de frente (fg); o fundo da faixa usa bg.
    const pill = /<rect x="[^"]*" y="([\d.]+)" width="[^"]*" height="([\d.]+)"[^>]*fill="#0f172a"\/>/.exec(svg)!;
    const pillCenter = Number(pill[1]) + Number(pill[2]) / 2;
    const textY = num(svg, /<tspan x="[^"]*" y="([\d.]+)"/);
    expect(pillCenter).toBeCloseTo(textY, 5);
  });

  it('a legenda é centralizada horizontalmente (text-anchor middle em x=size/2)', () => {
    const svg = createFrame('label', 'OI').render(ctxFor('label'));
    expect(svg).toContain('text-anchor="middle"');
    expect(num(svg, /<tspan x="([\d.]+)"/)).toBeCloseTo(500, 5);
  });

  it('escapa XML no texto da legenda', () => {
    const svg = createFrame('label', 'A & <B>').render(ctxFor('label'));
    expect(svg).toContain('A &amp; &lt;B&gt;');
    expect(svg).not.toContain('<B>');
  });

  it('legenda longa quebra em duas linhas (dois tspans)', () => {
    const svg = createFrame('label', 'ESCANEIE PARA VER O CARDAPIO COMPLETO').render(ctxFor('label', 'ESCANEIE PARA VER O CARDAPIO COMPLETO'));
    const tspans = svg.match(/<tspan\b/g) ?? [];
    expect(tspans.length).toBe(2);
  });
});
