import { describe, it, expect } from 'vitest';
import { parseDecoded } from '../src/qr/decode';

describe('parseDecoded', () => {
  it('classifica link https', () => {
    expect(parseDecoded('https://exemplo.com')).toEqual({ type: 'link', url: 'https://exemplo.com' });
  });

  it('texto puro cai em type text mantendo o original', () => {
    expect(parseDecoded('  olá mundo  ')).toEqual({ type: 'text', text: '  olá mundo  ' });
  });

  it('tel: extrai o número', () => {
    expect(parseDecoded('tel:+5511999998888')).toEqual({ type: 'tel', number: '+5511999998888' });
  });

  it('SMSTO com mensagem', () => {
    expect(parseDecoded('SMSTO:11999:oi tudo bem')).toEqual({ type: 'sms', number: '11999', msg: 'oi tudo bem' });
  });

  it('mailto com assunto e corpo', () => {
    const d = parseDecoded('mailto:a@b.com?subject=Oi&body=Tudo%20bem');
    expect(d).toEqual({ type: 'email', to: 'a@b.com', subject: 'Oi', body: 'Tudo bem' });
  });

  it('Wi-Fi extrai ssid/segurança/senha e oculta, desescapando', () => {
    const d = parseDecoded('WIFI:T:WPA;S:Minha\\;Rede;P:sen\\,ha;H:true;;');
    expect(d).toEqual({ type: 'wifi', ssid: 'Minha;Rede', sec: 'WPA', pass: 'sen,ha', hidden: true });
  });

  it('Wi-Fi sem senha marca segurança nopass', () => {
    const d = parseDecoded('WIFI:T:nopass;S:Aberta;;');
    expect(d.type).toBe('wifi');
    expect(d.sec).toBe('nopass');
    expect(d.hidden).toBe(false);
  });

  it('geo extrai latitude e longitude', () => {
    expect(parseDecoded('geo:-23.55,-46.63')).toEqual({ type: 'geo', lat: '-23.55', lng: '-46.63' });
  });

  it('vCard extrai nome, telefone, e-mail, empresa, cargo e site', () => {
    const vcard = [
      'BEGIN:VCARD', 'VERSION:3.0', 'N:Silva;Maria;;;', 'FN:Maria Silva',
      'ORG:ACME', 'TITLE:Dev', 'TEL;TYPE=CELL:11999998888', 'EMAIL:maria@acme.com',
      'URL:https://acme.com', 'END:VCARD',
    ].join('\n');
    const d = parseDecoded(vcard);
    expect(d.type).toBe('vcard');
    expect(d.name).toBe('Maria Silva');
    expect(d.org).toBe('ACME');
    expect(d.title).toBe('Dev');
    expect(d.tel).toBe('11999998888');
    expect(d.email).toBe('maria@acme.com');
    expect(d.url).toBe('https://acme.com');
  });

  it('evento iCal extrai título, local e datas', () => {
    const ev = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'SUMMARY:Reunião',
      'LOCATION:Sala 3', 'DTSTART:20260811T140000', 'DTEND:20260811T150000',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\n');
    const d = parseDecoded(ev);
    expect(d).toMatchObject({ type: 'event', title: 'Reunião', loc: 'Sala 3', start: '20260811T140000', end: '20260811T150000' });
  });

  it('link do WhatsApp vira type whatsapp com número e texto', () => {
    const d = parseDecoded('https://api.whatsapp.com/send?phone=5511999998888&text=Oi');
    expect(d.type).toBe('whatsapp');
    expect(d.number).toBe('5511999998888');
    expect(d.msg).toBe('Oi');
  });

  it('wa.me sem query usa o número do path', () => {
    const d = parseDecoded('https://wa.me/5511999998888');
    expect(d.type).toBe('whatsapp');
    expect(d.number).toBe('5511999998888');
  });

  it('Pix estático extrai chave, recebedor, cidade e valor; ignora txid "***"', () => {
    const pix = '000201' + '010211'
      + '2638' + '0014br.gov.bcb.pix' + '0116fulano@email.com'
      + '52040000' + '5303986' + '540510.50' + '5802BR'
      + '5913Fulano de Tal' + '6008BRASILIA' + '62070503***' + '6304FFFF';
    const d = parseDecoded(pix);
    expect(d.type).toBe('pix');
    expect(d.dynamic).toBe(false);
    expect(d.pixKey).toBe('fulano@email.com');
    expect(d.name).toBe('Fulano de Tal');
    expect(d.city).toBe('BRASILIA');
    expect(d.amount).toBe('10.50');
    expect(d.txid).toBe('');
  });

  it('Pix dinâmico traz URL no lugar de chave/valor', () => {
    const pix = '00020101021226800014br.gov.bcb.pix2558pix.exemplo.com/qr/v2/'
      + '00000000-0000-0000-0000-0000000000005204000053039865802BR'
      + '5920EMPRESA EXEMPLO LTDA6009SAO PAULO62070503***6304FB58';
    const d = parseDecoded(pix);
    expect(d.type).toBe('pix');
    expect(d.dynamic).toBe(true);
    expect(d.pixKey).toBe('');
    expect(d.amount).toBe('');
    expect(d.name).toBe('EMPRESA EXEMPLO LTDA');
    expect(d.city).toBe('SAO PAULO');
    expect(d.url).toBe('https://pix.exemplo.com/qr/v2/00000000-0000-0000-0000-000000000000');
  });

  it('Pix dinâmico com valor embutido e CRC válido', () => {
    const pix = '00020101021226800014br.gov.bcb.pix2558pix.exemplo.com/qr/v2/'
      + '11111111-1111-1111-1111-111111111111520400005303986540530.005802BR'
      + '5915EMPRESA EXEMPLO6009SAO PAULO62070503***63048FFD';
    const d = parseDecoded(pix);
    expect(d.type).toBe('pix');
    expect(d.dynamic).toBe(true);
    expect(d.amount).toBe('30.00');
    expect(d.name).toBe('EMPRESA EXEMPLO');
    expect(d.url).toBe('https://pix.exemplo.com/qr/v2/11111111-1111-1111-1111-111111111111');
    expect(d.valid).toBe(true);
  });

  it('CRC inválido é sinalizado quando o payload é adulterado', () => {
    const bom = '000201' + '010211'
      + '2638' + '0014br.gov.bcb.pix' + '0116fulano@email.com'
      + '52040000' + '5303986' + '540510.50' + '5802BR'
      + '5913Fulano de Tal' + '6008BRASILIA' + '62070503***' + '6304FFFF';
    // "6304FFFF" é um CRC falso — deve reprovar.
    expect(parseDecoded(bom).valid).toBe(false);
  });

  it('Pix estático extrai CEP, MCC, documento, loja, terminal e finalidade', () => {
    const mai = '0014br.gov.bcb.pix' + '0111chave123456';                 // conta do recebedor
    const add = '0104NF01' + '0303L07' + '0703T09' + '0806compra';        // subcampos do 62
    const tlv = (id: string, v: string): string => id + String(v.length).padStart(2, '0') + v;
    const pix = '000201' + '010211'
      + tlv('26', mai) + '52045411' + '5303986' + '540530.00' + '5802BR'
      + tlv('59', 'Loja1') + tlv('60', 'BRASILIA') + tlv('61', '01310100')
      + tlv('62', add) + '6304FFFF';
    const d = parseDecoded(pix);
    expect(d.type).toBe('pix');
    expect(d.cep).toBe('01310100');
    expect(d.mcc).toBe('5411');
    expect(d.billNumber).toBe('NF01');
    expect(d.storeLabel).toBe('L07');
    expect(d.terminalLabel).toBe('T09');
    expect(d.purpose).toBe('compra');
  });

  it('Pix com descrição e identificador preenchidos', () => {
    const pix = '000201' + '010211'
      + '2646' + '0014br.gov.bcb.pix' + '0111chave123456' + '0209Pagamento'
      + '52040000' + '5303986' + '5802BR'
      + '5904Loja' + '6008BRASILIA' + '62120508ABC12345' + '6304FFFF';
    const d = parseDecoded(pix);
    expect(d.type).toBe('pix');
    expect(d.pixKey).toBe('chave123456');
    expect(d.desc).toBe('Pagamento');
    expect(d.txid).toBe('ABC12345');
    expect(d.amount).toBe('');
  });
});
