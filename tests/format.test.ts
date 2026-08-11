import { describe, it, expect } from 'vitest';
import { escWifi, escVcard, icalDate, icalGet, fmtIcalDate, maskPhoneBR, maskPhoneWa } from '../src/format';

describe('escWifi', () => {
  it('escapa os caracteres especiais do payload Wi-Fi', () => {
    expect(escWifi('a;b,c:d"e\\f')).toBe('a\\;b\\,c\\:d\\"e\\\\f');
  });
  it('deixa texto sem especiais intacto', () => {
    expect(escWifi('MinhaRede123')).toBe('MinhaRede123');
  });
});

describe('escVcard', () => {
  it('escapa barra, ponto-e-vírgula, vírgula e quebra de linha', () => {
    expect(escVcard('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
  });
  it('trata CRLF como uma única quebra', () => {
    expect(escVcard('linha1\r\nlinha2')).toBe('linha1\\nlinha2');
  });
});

describe('icalDate', () => {
  it('converte datetime-local em carimbo iCal', () => {
    expect(icalDate('2026-08-11T14:30')).toBe('20260811T143000');
  });
  it('devolve string vazia para entrada vazia', () => {
    expect(icalDate('')).toBe('');
  });
});

describe('icalGet', () => {
  it('extrai o valor de uma propriedade', () => {
    expect(icalGet('BEGIN:VCARD\nFN:Maria Silva\nTEL:123', 'FN')).toBe('Maria Silva');
  });
  it('desescapa vírgula/ponto-e-vírgula e \\n', () => {
    expect(icalGet('SUMMARY:Reunião\\, sala 3\\ncom café', 'SUMMARY')).toBe('Reunião, sala 3\ncom café');
  });
  it('ignora parâmetros após a chave (ex.: TEL;TYPE=CELL)', () => {
    expect(icalGet('TEL;TYPE=CELL:11999', 'TEL')).toBe('11999');
  });
  it('devolve vazio quando a chave não existe', () => {
    expect(icalGet('FN:Maria', 'ORG')).toBe('');
  });
});

describe('fmtIcalDate', () => {
  it('formata data com hora', () => {
    expect(fmtIcalDate('20260811T1430')).toBe('11/08/2026 14:30');
  });
  it('formata data sem hora', () => {
    expect(fmtIcalDate('20260811')).toBe('11/08/2026');
  });
  it('devolve a entrada quando não bate o padrão', () => {
    expect(fmtIcalDate('sem-data')).toBe('sem-data');
  });
});

describe('maskPhoneBR', () => {
  it('formata celular de 11 dígitos', () => {
    expect(maskPhoneBR('11999998888')).toBe('(11) 99999-8888');
  });
  it('formata fixo de 10 dígitos', () => {
    expect(maskPhoneBR('1133334444')).toBe('(11) 3333-4444');
  });
  it('formata parcialmente enquanto digita', () => {
    expect(maskPhoneBR('11')).toBe('11');
    expect(maskPhoneBR('119')).toBe('(11) 9');
  });
  it('descarta não-dígitos e trunca em 11', () => {
    expect(maskPhoneBR('(11) 99999-88889999')).toBe('(11) 99999-8888');
  });
});

describe('maskPhoneWa', () => {
  it('sem código do país, comporta como BR', () => {
    expect(maskPhoneWa('11999998888')).toBe('(11) 99999-8888');
  });
  it('inclui o código do país acima de 11 dígitos', () => {
    expect(maskPhoneWa('5511999998888')).toBe('+55 (11) 99999-8888');
  });
  it('devolve vazio para entrada sem dígitos', () => {
    expect(maskPhoneWa('abc')).toBe('');
  });
});
