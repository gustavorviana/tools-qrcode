import { describe, it, expect } from 'vitest';
import { validateFields as vf, isEmail, isWebUrl, wifiPassError } from '../src/validate';
import type { FieldValues } from '../src/validate';
import { phoneE164 } from '../src/phone';

const validateFields = (type: string, v: FieldValues) => vf(type, v, phoneE164);
const isPhone = (s: string): boolean => phoneE164(s) !== null;

describe('formatos', () => {
  it('isEmail', () => {
    expect(isEmail('nome@exemplo.com')).toBe(true);
    expect(isEmail('nome@exemplo')).toBe(false);
    expect(isEmail('nome exemplo.com')).toBe(false);
  });

  it('isWebUrl aceita com ou sem esquema e exige domínio', () => {
    expect(isWebUrl('exemplo.com')).toBe(true);
    expect(isWebUrl('https://exemplo.com.br/a?b=1')).toBe(true);
    expect(isWebUrl('exemplo')).toBe(false);
    expect(isWebUrl('exemplo .com')).toBe(false);
  });

  it('isPhone: BR sem DDI ou qualquer país com +DDI', () => {
    expect(isPhone('(11) 99999-9999')).toBe(true);
    expect(isPhone('(11) 3333-4444')).toBe(true);
    expect(isPhone('99999-9999')).toBe(false);
    expect(isPhone('+55 11 99999-9999')).toBe(true);
    expect(isPhone('+1 234')).toBe(false);
    expect(isPhone('+1 213 373 4253')).toBe(true);
  });

  it('wifiPassError', () => {
    expect(wifiPassError('nopass', '')).toBeNull();
    expect(wifiPassError('WPA', '')).toMatch(/Informe a senha/);
    expect(wifiPassError('WPA', '1234567')).toMatch(/8 a 63/);
    expect(wifiPassError('WPA', '12345678')).toBeNull();
    expect(wifiPassError('WPA', 'a'.repeat(64))).toMatch(/8 a 63/);
    expect(wifiPassError('WEP', 'abcde')).toBeNull();
    expect(wifiPassError('WEP', '0123456789')).toBeNull();
    expect(wifiPassError('WEP', 'abcdef')).toMatch(/WEP/);
  });
});

describe('validateFields', () => {
  it('Wi-Fi: senha obrigatória com WPA, dispensada se aberta', () => {
    expect(validateFields('wifi', { f_ssid: 'Casa', f_sec: 'WPA', f_pass: '' })).toHaveProperty('f_pass');
    expect(validateFields('wifi', { f_ssid: 'Casa', f_sec: 'nopass', f_pass: '' })).toEqual({});
    expect(validateFields('wifi', { f_ssid: '', f_sec: 'WPA', f_pass: 'senhaboa1' })).toHaveProperty('f_ssid');
  });

  it('campos obrigatórios vazios', () => {
    expect(validateFields('text', { f_text: '  ' })).toHaveProperty('f_text');
    expect(validateFields('email', { f_email: '' }).f_email).toBe('Campo obrigatório.');
    expect(validateFields('event', { f_evtitle: '', f_evstart: '' })).toEqual({
      f_evtitle: 'Campo obrigatório.', f_evstart: 'Campo obrigatório.',
    });
  });

  it('opcionais só são validados quando preenchidos', () => {
    expect(validateFields('vcard', { f_vcname: 'Maria' })).toEqual({});
    expect(validateFields('vcard', { f_vcname: 'Maria', f_vcemail: 'x' })).toHaveProperty('f_vcemail');
    expect(validateFields('paypal', { f_pp: 'maria', f_ppamt: '0' })).toHaveProperty('f_ppamt');
    expect(validateFields('paypal', { f_pp: 'maria', f_ppamt: '49,90' })).toEqual({});
  });

  it('local: faixas de latitude e longitude', () => {
    expect(validateFields('geo', { f_geolat: '-23,55', f_geolng: '-46.63' })).toEqual({});
    expect(Object.keys(validateFields('geo', { f_geolat: '91', f_geolng: '181' }))).toEqual(['f_geolat', 'f_geolng']);
  });

  it('evento: fim antes do início', () => {
    const e = validateFields('event', { f_evtitle: 'R', f_evstart: '2026-10-01T10:00', f_evend: '2026-10-01T09:00' });
    expect(e).toHaveProperty('f_evend');
  });

  it('sem o validador de telefone (phone.js carregando), telefone só é obrigatório', () => {
    expect(vf('tel', { f_tel: '123' })).toEqual({});
    expect(vf('tel', { f_tel: '' })).toHaveProperty('f_tel');
  });

  it('WhatsApp, Zoom e redes sociais', () => {
    expect(validateFields('whatsapp', { f_wanum: '+55 11 99999-9999' })).toEqual({});
    expect(validateFields('whatsapp', { f_wanum: '123' })).toHaveProperty('f_wanum');
    expect(validateFields('zoom', { f_zoomid: '123 4567 8901' })).toEqual({});
    expect(validateFields('zoom', { f_zoomid: '1234' })).toHaveProperty('f_zoomid');
    expect(validateFields('instagram', { f_ig: '@meu perfil' })).toHaveProperty('f_ig');
    expect(validateFields('instagram', { f_ig: 'https://instagram.com/meuperfil' })).toEqual({});
  });
});
