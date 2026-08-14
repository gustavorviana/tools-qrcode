import { describe, it, expect } from 'vitest';
import {
  BODY, EYE_FRAME, isCustomBody, eyeCenterOptions, drawEyeCenter,
  LIB_EYE_FRAME, LIB_EYE_CENTER, centerNeedsCustom, CUSTOM_ONLY_CENTER,
} from '../src/qr/shapes';

describe('registries de formas', () => {
  it('todo corpo tem draw; lib também traz o mapeamento da lib', () => {
    for (const def of BODY.values()) {
      expect(def.draw, def.name).toBeTypeOf('function');
      if (def.backend === 'lib') expect(def.lib, def.name).toBeDefined();
      else expect(def.lib).toBeUndefined();
    }
  });

  it('as formas custom esperadas estão registradas', () => {
    for (const name of ['diamond', 'heart', 'star', 'plus', 'x', 'cross', 'circle'] as const) {
      expect(isCustomBody(name), name).toBe(true);
    }
    expect(isCustomBody('solid')).toBe(false);
  });

  it('cada draw de corpo produz SVG não-vazio com a cor pedida', () => {
    for (const def of BODY.values()) {
      const svg = def.draw(50, 50, 20, '#123456');
      expect(svg, def.name).toContain('#123456');
      expect(svg).toMatch(/<(path|circle|rect)/);
    }
  });

  it('molduras de olho desenham algo com a cor', () => {
    for (const def of EYE_FRAME.values()) {
      const s = def.draw(0, 0, 10, '#abcdef');
      expect(s, def.name).toContain('#abcdef');
      expect(s).toMatch(/<(rect|circle|path)/);
    }
  });

  it('o centro do olho oferece `auto` + todo o catálogo de corpo', () => {
    const names = eyeCenterOptions().map((o) => o.name);
    expect(names[0]).toBe('auto');
    for (const key of BODY.keys()) expect(names).toContain(key);
    expect(names).toHaveLength(BODY.size + 1);
  });

  it('drawEyeCenter usa a forma de corpo pedida e a cor', () => {
    expect(drawEyeCenter('solid', 0, 0, 10, '#abcdef')).toContain('#abcdef');
    expect(drawEyeCenter('heart', 0, 0, 10, '#abcdef')).toMatch(/<path[^>]*#abcdef/);
    expect(drawEyeCenter('circle', 0, 0, 10, '#abcdef')).toMatch(/<circle[^>]*#abcdef/);
  });

  it('mapeamento p/ a lib cobre toda moldura não-auto e todo corpo (centro)', () => {
    for (const name of EYE_FRAME.keys()) {
      if (name === 'auto') continue;
      expect(LIB_EYE_FRAME[name], name).toBeDefined();
    }
    for (const name of BODY.keys()) {
      expect(LIB_EYE_CENTER[name], name).toBeDefined();
    }
  });

  it('centros de ícone (que a lib não desenha) forçam o renderer próprio', () => {
    // As formas de ícone são exatamente os corpos custom, menos o círculo
    // (que a lib representa como "dot").
    for (const def of BODY.values()) {
      const isIcon = def.backend === 'custom' && def.name !== 'circle';
      expect(CUSTOM_ONLY_CENTER.has(def.name), def.name).toBe(isIcon);
      expect(centerNeedsCustom(def.name), def.name).toBe(isIcon);
    }
    expect(centerNeedsCustom('auto')).toBe(false);   // auto nunca força
    expect(centerNeedsCustom('circle')).toBe(false);  // círculo → 'dot' na lib
    expect(centerNeedsCustom('solid')).toBe(false);   // corpo da lib
  });
});
