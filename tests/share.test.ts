import { describe, it, expect } from 'vitest';
import { buildShareQuery, parseShareQuery, SHARE_DEFAULTS, type ShareState } from '../src/qr/share';

const baseState = (over: Partial<ShareState> = {}): ShareState => ({
  text: 'https://exemplo.com',
  ecl: 'MEDIUM', fg: '#0f172a', bg: '#ffffff', bgTransparent: false,
  shape: 'solid', eyeFrame: 'auto', eyeCenter: 'auto',
  qrShape: 'square', frame: 'none', caption: 'ESCANEIE', size: 1024,
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

  it('o tamanho só entra quando difere do padrão (1024)', () => {
    expect(new URLSearchParams(buildShareQuery(baseState())).get('sz')).toBeNull();
    expect(new URLSearchParams(buildShareQuery(baseState({ size: 2048 }))).get('sz')).toBe('2048');
  });

  it('formas custom, olhos, cores de olho e fundo transparente entram na query', () => {
    const q = buildShareQuery(baseState({
      shape: 'heart', eyeFrame: 'circle', eyeCenter: 'diamond',
      eyeFrameColor: '#ff0000', eyeCenterColor: '#00ff00', bgTransparent: true,
    }));
    const p = new URLSearchParams(q);
    expect(p.get('s')).toBe('heart');
    expect(p.get('ef')).toBe('circle');
    expect(p.get('ec')).toBe('diamond');
    expect(p.get('efc')).toBe('ff0000');   // sem '#'
    expect(p.get('ecc')).toBe('00ff00');
    expect(p.get('bt')).toBe('1');
  });

  it('olhos no padrão (auto) e sem cores/transparência são omitidos', () => {
    const p = new URLSearchParams(buildShareQuery(baseState()));
    expect(p.get('ef')).toBeNull();
    expect(p.get('ec')).toBeNull();
    expect(p.get('efc')).toBeNull();
    expect(p.get('ecc')).toBeNull();
    expect(p.get('bt')).toBeNull();
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
    const sp = parseShareQuery('q=oi&e=ZZZ&fg=naohex&s=triangulo&qs=oval&fr=nenhuma&ef=oval&ec=blob');
    expect(sp?.ecl).toBeUndefined();
    expect(sp?.fg).toBeUndefined();
    expect(sp?.shape).toBeUndefined();
    expect(sp?.qrShape).toBeUndefined();
    expect(sp?.frame).toBeUndefined();
    expect(sp?.eyeFrame).toBeUndefined();
    expect(sp?.eyeCenter).toBeUndefined();
  });

  it('valida formas custom e olhos contra as chaves dos registries', () => {
    const sp = parseShareQuery('q=x&s=heart&ef=circle&ec=diamond&efc=ff0000&ecc=00ff00&bt=1');
    expect(sp).toMatchObject({
      shape: 'heart', eyeFrame: 'circle', eyeCenter: 'diamond',
      eyeFrameColor: '#ff0000', eyeCenterColor: '#00ff00', bgTransparent: true,
    });
  });

  it('aceita hex de 3 dígitos e normaliza para minúsculas', () => {
    expect(parseShareQuery('q=x&fg=ABC')?.fg).toBe('#abc');
  });

  it('só aceita comprimentos de hex válidos (3/4/6/8), rejeitando 5 e 7', () => {
    expect(parseShareQuery('q=x&fg=123456')?.fg).toBe('#123456'); // 6 ok
    expect(parseShareQuery('q=x&fg=1234')?.fg).toBe('#1234');     // 4 ok (com alfa)
    expect(parseShareQuery('q=x&fg=12345')?.fg).toBeUndefined();  // 5 inválido
    expect(parseShareQuery('q=x&efc=1234567')?.eyeFrameColor).toBeUndefined(); // 7 inválido
  });

  it('lê o tamanho só quando é uma resolução válida', () => {
    expect(parseShareQuery('q=x&sz=2048')?.size).toBe(2048);
    expect(parseShareQuery('q=x&sz=1234')?.size).toBeUndefined();
    expect(parseShareQuery('q=x')?.size).toBeUndefined();
  });

  it('round-trip: build → parse recupera as opções não-padrão', () => {
    const state = baseState({
      text: 'olá mundo', ecl: 'QUARTILE', fg: '#123456', bg: '#eeeeee',
      shape: 'diamond', eyeFrame: 'rounded', eyeCenter: 'circle',
      eyeFrameColor: '#abcdef', eyeCenterColor: '#fedcba', bgTransparent: true,
      qrShape: 'circle', frame: 'border',
    });
    const sp = parseShareQuery(buildShareQuery(state));
    expect(sp).toMatchObject({
      text: 'olá mundo', ecl: 'QUARTILE', fg: '#123456', bg: '#eeeeee',
      shape: 'diamond', eyeFrame: 'rounded', eyeCenter: 'circle',
      eyeFrameColor: '#abcdef', eyeCenterColor: '#fedcba', bgTransparent: true,
      qrShape: 'circle', frame: 'border',
    });
  });

  it('SHARE_DEFAULTS reflete o estado inicial esperado', () => {
    expect(SHARE_DEFAULTS).toMatchObject({ ecl: 'MEDIUM', fg: '#0f172a', bg: '#ffffff', shape: 'solid', qrShape: 'square', frame: 'none', caption: 'ESCANEIE' });
  });
});
