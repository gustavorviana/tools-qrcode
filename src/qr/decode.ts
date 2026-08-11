/*
 * Decodificação do conteúdo lido — interpreta o texto bruto de um QR e o
 * classifica (link, Wi-Fi, vCard, evento, geo, tel, sms, e-mail, WhatsApp ou
 * texto puro), extraindo os campos relevantes. Função pura, sem DOM.
 */
import { icalGet } from '../format';

export type DecodedType = 'text' | 'link' | 'tel' | 'sms' | 'email' | 'wifi' | 'geo' | 'vcard' | 'event' | 'whatsapp';

export interface Decoded {
  type: DecodedType;
  url?: string; number?: string; msg?: string; to?: string; subject?: string; body?: string;
  ssid?: string; sec?: string; pass?: string; hidden?: boolean;
  lat?: string; lng?: string; name?: string; tel?: string; email?: string;
  org?: string; title?: string; loc?: string; start?: string; end?: string; text?: string;
}

/** Interpreta o texto bruto de um QR e devolve o tipo + campos extraídos. */
export function parseDecoded(raw: string): Decoded {
  const t = raw.trim();
  if (/^BEGIN:VCARD/i.test(t)) {
    return { type: 'vcard',
      name: icalGet(t, 'FN') || icalGet(t, 'N').replace(/;+/g, ' ').trim(),
      tel: icalGet(t, 'TEL'), email: icalGet(t, 'EMAIL'),
      org: icalGet(t, 'ORG'), title: icalGet(t, 'TITLE'), url: icalGet(t, 'URL') };
  }
  if (/^BEGIN:V(CALENDAR|EVENT)/i.test(t)) {
    return { type: 'event', title: icalGet(t, 'SUMMARY'), loc: icalGet(t, 'LOCATION'),
      start: icalGet(t, 'DTSTART'), end: icalGet(t, 'DTEND') };
  }
  if (/^WIFI:/i.test(t)) {
    const g = (k: string): string => {
      const m = t.match(new RegExp(k + ':((?:\\\\.|[^;])*)', 'i'));
      return m ? m[1].replace(/\\(.)/g, '$1') : '';
    };
    return { type: 'wifi', ssid: g('S'), sec: g('T') || 'nopass', pass: g('P'), hidden: /;H:true/i.test(t) };
  }
  if (/^geo:/i.test(t)) {
    const c = t.slice(4).split(/[?;]/)[0].split(',');
    return { type: 'geo', lat: (c[0] || '').trim(), lng: (c[1] || '').trim() };
  }
  if (/^mailto:/i.test(t)) {
    const mm = t.match(/^mailto:([^?]*)\??(.*)$/i)!;
    const p = new URLSearchParams(mm[2] || '');
    return { type: 'email', to: decodeURIComponent(mm[1]), subject: p.get('subject') || '', body: p.get('body') || '' };
  }
  if (/^tel:/i.test(t)) return { type: 'tel', number: t.slice(4) };
  if (/^SMSTO:/i.test(t)) { const p = t.slice(6).split(':'); return { type: 'sms', number: p[0], msg: p.slice(1).join(':') }; }
  if (/^sms:/i.test(t)) {
    const m = t.slice(4).match(/^([^?]*)\??(?:.*body=([^&]*))?/i)!;
    return { type: 'sms', number: m[1], msg: m[2] ? decodeURIComponent(m[2]) : '' };
  }
  if (/^https?:\/\/(wa\.me|(api|web)\.whatsapp\.com)\//i.test(t)) {
    try {
      const u = new URL(t);
      const number = u.searchParams.get('phone') || u.pathname.replace(/\D/g, '');
      return { type: 'whatsapp', number, msg: u.searchParams.get('text') || '', url: t };
    } catch { return { type: 'link', url: t }; }
  }
  if (/^https?:\/\//i.test(t)) return { type: 'link', url: t };
  return { type: 'text', text: raw };
}
