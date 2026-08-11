import { describe, it, expect } from 'vitest';
import { buildShareQuery, parseShareQuery, SHARE_DEFAULTS, type ShareState } from '../src/qr/share';

const baseState = (over: Partial<ShareState> = {}): ShareState => ({
  text: 'https://exemplo.com',
  ecl: 'MEDIUM', fg: '#0f172a', bg: '#ffffff',
  shape: 'solid', qrShape: 'square', frame: 'none', caption: 'ESCANEIE',
  ...over,
});

describe('buildShareQuery', () => {
  it('no padrão total, só o texto entra na query', () => {
    expect(buildShareQuery(baseState())).toBe('q=https%3A%2F%2Fexemplo.com');
  });

  it('inclui só as opções que fogem do padrão', () => {
    const q = buildShareQuery(baseState({ ecl: 'HIGH', fg: '#db2777', shape: 'dots', qrShape: 'circle' }));
    const p = new URLSearchParams(q);
    expect(p.get('e')).toBe('HIGH');
    expect(p.get('fg')).toBe('db2777');   // sem '#'
    expect(p.get('s')).toBe('dots');
    expect(p.get('qs')).toBe('circle');
    expect(p.get('bg')).toBeNull();       // fundo no padrão → omitido
  });

  it('a legenda só entra quando há moldura e ela difere do padrão', () => {
    // moldura no padrão (none): legenda ignorada mesmo se customizada
    expect(new URLSearchParams(buildShareQuery(baseState({ caption: 'OUTRA' }))).get('cap')).toBeNull();
    // com moldura mas legenda padrão: omitida
    expect(new URLSearchParams(buildShareQuery(baseState({ frame: 'label' }))).get('cap')).toBeNull();
    // com moldura e legenda customizada: incluída
    expect(new URLSearchParams(buildShareQuery(baseState({ frame: 'label', caption: 'SIGA' }))).get('cap')).toBe('SIGA');
  });

  it('a cor é comparada sem diferenciar maiúsculas', () => {
    expect(new URLSearchParams(buildShareQuery(baseState({ fg: '#0F172A' }))).get('fg')).toBeNull();
  });
});

describe('parseShareQuery', () => {
  it('devolve null quando não há q', () => {
    expect(parseShareQuery('')).toBeNull();
    expect(parseShareQuery('e=HIGH')).toBeNull();
  });

  it('lê texto e opções válidas', () => {
    const sp = parseShareQuery('q=oi&e=HIGH&fg=db2777&s=dots&qs=circle&fr=label&cap=SIGA');
    expect(sp).toEqual({
      text: 'oi', ecl: 'HIGH', fg: '#db2777', bg: undefined,
      shape: 'dots', qrShape: 'circle', frame: 'label', caption: 'SIGA',
    });
  });

  it('ignora valores inválidos (enum e hex)', () => {
    const sp = parseShareQuery('q=oi&e=ZZZ&fg=naohex&s=triangulo&qs=oval&fr=nenhuma');
    expect(sp?.ecl).toBeUndefined();
    expect(sp?.fg).toBeUndefined();
    expect(sp?.shape).toBeUndefined();
    expect(sp?.qrShape).toBeUndefined();
    expect(sp?.frame).toBeUndefined();
  });

  it('aceita hex de 3 dígitos e normaliza para minúsculas', () => {
    expect(parseShareQuery('q=x&fg=ABC')?.fg).toBe('#abc');
  });

  it('round-trip: build → parse recupera as opções não-padrão', () => {
    const state = baseState({ text: 'olá mundo', ecl: 'QUARTILE', fg: '#123456', bg: '#eeeeee', shape: 'classy', qrShape: 'circle', frame: 'border' });
    const sp = parseShareQuery(buildShareQuery(state));
    expect(sp).toMatchObject({
      text: 'olá mundo', ecl: 'QUARTILE', fg: '#123456', bg: '#eeeeee',
      shape: 'classy', qrShape: 'circle', frame: 'border',
    });
  });

  it('SHARE_DEFAULTS reflete o estado inicial esperado', () => {
    expect(SHARE_DEFAULTS).toMatchObject({ ecl: 'MEDIUM', fg: '#0f172a', bg: '#ffffff', shape: 'solid', qrShape: 'square', frame: 'none', caption: 'ESCANEIE' });
  });
});
