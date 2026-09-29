import { describe, it, expect, vi } from 'vitest';
import { inVianaApp, setupViana, vianaExit, VIANA_CLASS } from '../src/viana';
import type { VianaAppApi } from '../src/viana';

const api = (): VianaAppApi => Object.freeze({ platform: 'android' as const, version: 1, exit: vi.fn() });
const fakeDoc = () => {
  const classes = new Set<string>();
  return { documentElement: { classList: { add: (c: string) => classes.add(c) } }, classes } as unknown as
    Pick<Document, 'documentElement'> & { classes: Set<string> };
};

describe('integração Viana Utils', () => {
  it('detecta o app só quando window.VianaApp existe', () => {
    expect(inVianaApp({ VianaApp: api() })).toBe(true);
    expect(inVianaApp({})).toBe(false);
  });

  it('marca o documento com in-viana dentro do app, e não fora', () => {
    const inApp = fakeDoc();
    expect(setupViana(inApp, { VianaApp: api() })).toBe(true);
    expect(inApp.classes.has(VIANA_CLASS)).toBe(true);
    const outside = fakeDoc();
    expect(setupViana(outside, {})).toBe(false);
    expect(outside.classes.size).toBe(0);
  });

  it('vianaExit chama VianaApp.exit() e não falha fora do app', () => {
    const a = api();
    vianaExit({ VianaApp: a });
    expect(a.exit).toHaveBeenCalledOnce();
    expect(() => vianaExit({})).not.toThrow();
  });
});
