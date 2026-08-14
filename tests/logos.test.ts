import { describe, it, expect } from 'vitest';
import { LOGOS, logoSvg, logoDataUrl } from '../src/qr/logos';

describe('registro de logos', () => {
  it('cobre os tipos da etapa 1 + redes sociais', () => {
    const names = LOGOS.map((l) => l.name);
    for (const expected of ['whatsapp', 'facebook', 'instagram', 'telegram',
      'tel', 'email', 'sms', 'wifi', 'link', 'vcard', 'geo', 'event']) {
      expect(names, expected).toContain(expected);
    }
  });

  it('nomes são únicos', () => {
    const names = LOGOS.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('versão colorida: SVG 128×128 com o glifo branco sobre o fundo da marca', () => {
    for (const l of LOGOS) {
      const s = logoSvg(l);
      expect(l.label.length, l.name).toBeGreaterThan(0);
      expect(s.startsWith('<svg'), l.name).toBe(true);
      expect(s, l.name).toContain('viewBox="0 0 128 128"');
      expect(s.endsWith('</svg>'), l.name).toBe(true);
      expect(s, l.name).toContain('#ffffff'); // glifo branco
    }
  });

  it('versão monocromática: glifo na cor fg sobre fundo bg (sem cor de marca)', () => {
    for (const l of LOGOS) {
      const s = logoSvg(l, { mono: true, fg: '#123456', bg: '#fafafa' });
      expect(s, l.name).toContain('#123456');   // glifo na cor do QR
      expect(s, l.name).toContain('#fafafa');    // fundo
      expect(s.includes(l.bg), l.name).toBe(false); // não usa a cor de marca
    }
  });

  it('logoDataUrl gera data URL segura para atributo (sem aspas/# cru) e reversível', () => {
    for (const l of LOGOS) {
      const raw = logoSvg(l);
      const url = logoDataUrl(raw);
      expect(url.startsWith('data:image/svg+xml,'), l.name).toBe(true);
      const encoded = url.slice('data:image/svg+xml,'.length);
      expect(encoded.includes('"'), l.name).toBe(false); // seguro em href="..."
      expect(encoded.includes('#'), l.name).toBe(false); // cores #fff viram %23
      expect(decodeURIComponent(encoded), l.name).toBe(raw);
    }
  });
});
