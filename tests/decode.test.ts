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
});
