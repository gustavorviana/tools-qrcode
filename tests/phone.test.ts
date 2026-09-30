import { describe, it, expect } from 'vitest';
import { maskPhone, maskPhoneWa, phoneE164 } from '../src/phone';

describe('maskPhone', () => {
  it('sem +, formata como Brasil', () => {
    expect(maskPhone('11999998888')).toBe('(11) 99999-8888');
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
  });

  it('com +, formata pelo país do DDI', () => {
    expect(maskPhone('+12133734253')).toBe('+1 213 373 4253');
    expect(maskPhone('+442079460958')).toBe('+44 20 7946 0958');
    expect(maskPhone('+5511999998888')).toBe('+55 11 99999 8888');
  });

  it('mantém o + sozinho e descarta letras', () => {
    expect(maskPhone('+')).toBe('+');
    expect(maskPhone('abc')).toBe('');
  });
});

describe('maskPhoneWa', () => {
  it('até 11 dígitos sem +, lê como Brasil', () => {
    expect(maskPhoneWa('11999998888')).toBe('(11) 99999-8888');
  });

  it('mais de 11 dígitos sem +, lê como DDI + número', () => {
    expect(maskPhoneWa('5511999998888')).toBe('+55 11 99999 8888');
  });
});

describe('phoneE164', () => {
  it('valida números BR sem DDI e devolve com +55', () => {
    expect(phoneE164('(11) 99999-8888')).toBe('+5511999998888');
    expect(phoneE164('(11) 3333-4444')).toBe('+551133334444');
  });

  it('valida números de outros países', () => {
    expect(phoneE164('+1 213 373 4253')).toBe('+12133734253');
    expect(phoneE164('+44 20 7946 0958')).toBe('+442079460958');
    expect(phoneE164('+351 912 345 678')).toBe('+351912345678');
  });

  it('rejeita tamanho ou prefixo impossível', () => {
    expect(phoneE164('99999-9999')).toBeNull();
    expect(phoneE164('+1 234')).toBeNull();
    expect(phoneE164('+44 1')).toBeNull();
    expect(phoneE164('')).toBeNull();
  });

  it('WhatsApp aceita DDI sem +', () => {
    expect(phoneE164('5511999998888', true)).toBe('+5511999998888');
    expect(phoneE164('11999998888', true)).toBe('+5511999998888');
  });
});
