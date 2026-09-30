import { describe, it, expect } from 'vitest';
import { resolveEcl } from '../src/qr/ecl';

const plain = { customShapes: false, hasLogo: false };

describe('resolveEcl', () => {
  it('automático: M por padrão, Q com formas isoladas, H com logo', () => {
    expect(resolveEcl('AUTO', plain)).toEqual({ ecl: 'MEDIUM', raised: false });
    expect(resolveEcl('AUTO', { customShapes: true, hasLogo: false })).toEqual({ ecl: 'QUARTILE', raised: false });
    expect(resolveEcl('AUTO', { customShapes: true, hasLogo: true })).toEqual({ ecl: 'HIGH', raised: false });
  });

  it('manual sem logo respeita a escolha', () => {
    for (const c of ['LOW', 'MEDIUM', 'QUARTILE', 'HIGH'] as const) {
      expect(resolveEcl(c, plain)).toEqual({ ecl: c, raised: false });
    }
  });

  it('manual L ou M com logo sobe para Q e sinaliza o aviso', () => {
    expect(resolveEcl('LOW', { customShapes: false, hasLogo: true })).toEqual({ ecl: 'QUARTILE', raised: true });
    expect(resolveEcl('MEDIUM', { customShapes: false, hasLogo: true })).toEqual({ ecl: 'QUARTILE', raised: true });
  });

  it('manual Q ou H com logo não muda nem avisa', () => {
    expect(resolveEcl('QUARTILE', { customShapes: false, hasLogo: true })).toEqual({ ecl: 'QUARTILE', raised: false });
    expect(resolveEcl('HIGH', { customShapes: false, hasLogo: true })).toEqual({ ecl: 'HIGH', raised: false });
  });
});
