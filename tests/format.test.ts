import { describe, it, expect } from 'vitest';
import { escWifi, escVcard, icalDate, icalGet, fmtIcalDate, maskPhoneBR, maskPhoneWa,
  socialUrl, paypalUrl, mecard, zoomUrl } from '../src/format';

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

describe('socialUrl', () => {
  it('anexa o usuário à base, removendo @ e espaços', () => {
    expect(socialUrl('@fulano', 'https://instagram.com/')).toBe('https://instagram.com/fulano');
    expect(socialUrl('  fulano ', 'https://t.me/')).toBe('https://t.me/fulano');
  });
  it('devolve um link completo como está', () => {
    expect(socialUrl('https://youtube.com/@canal', 'https://youtube.com/@')).toBe('https://youtube.com/@canal');
  });
  it('vazio devolve string vazia', () => {
    expect(socialUrl('   ', 'https://x.com/')).toBe('');
  });
});

describe('paypalUrl', () => {
  it('monta o link sem valor', () => {
    expect(paypalUrl('@loja', '')).toBe('https://paypal.me/loja');
  });
  it('inclui o valor válido (aceita vírgula)', () => {
    expect(paypalUrl('loja', '49,90')).toBe('https://paypal.me/loja/49.90');
  });
  it('ignora valor não numérico e usuário vazio', () => {
    expect(paypalUrl('loja', 'abc')).toBe('https://paypal.me/loja');
    expect(paypalUrl('', '10')).toBe('');
  });
});

describe('mecard', () => {
  it('separa sobrenome/nome e inclui tel/email quando houver', () => {
    expect(mecard('Maria Silva', '(11) 99999-8888', 'm@x.com'))
      .toBe('MECARD:N:Silva,Maria;TEL:11999998888;EMAIL:m@x.com;;');
  });
  it('nome único vai só no primeiro nome; campos vazios são omitidos', () => {
    expect(mecard('Fulano', '', '')).toBe('MECARD:N:,Fulano;;');
  });
  it('escapa caracteres especiais do MeCard', () => {
    expect(mecard('A;B', '', '')).toBe('MECARD:N:,A\\;B;;');
  });
  it('sem nome devolve vazio', () => {
    expect(mecard('  ', '11999', 'a@b.com')).toBe('');
  });
});

describe('zoomUrl', () => {
  it('usa só os dígitos do ID', () => {
    expect(zoomUrl('123 4567 8901', '')).toBe('https://zoom.us/j/12345678901');
  });
  it('inclui a senha codificada', () => {
    expect(zoomUrl('123', 'a b&c')).toBe('https://zoom.us/j/123?pwd=a%20b%26c');
  });
  it('sem ID devolve vazio', () => {
    expect(zoomUrl('abc', 'x')).toBe('');
  });
});
