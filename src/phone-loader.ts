/*
 * Carrega o bundle `phone.js` sob demanda. Ele fica fora do `app.js` para não pesar
 * nas páginas sem telefone; o service worker o pré-cacheia para uso offline.
 */
import type { maskPhone, maskPhoneWa, phoneE164 } from './phone';

export interface PhoneApi {
  maskPhone: typeof maskPhone;
  maskPhoneWa: typeof maskPhoneWa;
  phoneE164: typeof phoneE164;
}

declare global {
  interface Window { QRPhone?: PhoneApi }
}

/** Tipos cujos campos têm telefone. */
export const PHONE_TYPES: ReadonlySet<string> = new Set(['tel', 'sms', 'whatsapp', 'vcard', 'mecard']);

let pending: Promise<PhoneApi> | null = null;

/** Injeta `<script src="/phone.js?v=…">` uma vez e resolve com a API. */
export function loadPhone(version: string): Promise<PhoneApi> {
  if (window.QRPhone) return Promise.resolve(window.QRPhone);
  pending ??= new Promise<PhoneApi>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/phone.js?v=' + encodeURIComponent(version);
    s.onload = () => (window.QRPhone ? resolve(window.QRPhone) : reject(new Error('phone.js sem QRPhone')));
    s.onerror = () => { pending = null; reject(new Error('Falha ao carregar phone.js')); };
    document.head.appendChild(s);
  });
  return pending;
}
