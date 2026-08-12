/*
 * Decodificação do conteúdo lido — interpreta o texto bruto de um QR e o
 * classifica (link, Wi-Fi, vCard, evento, geo, tel, sms, e-mail, WhatsApp ou
 * texto puro), extraindo os campos relevantes. Função pura, sem DOM.
 */
import { icalGet } from '../format';

export type DecodedType = 'text' | 'link' | 'tel' | 'sms' | 'email' | 'wifi' | 'geo' | 'vcard' | 'event' | 'whatsapp' | 'pix';

export interface Decoded {
  type: DecodedType;
  url?: string; number?: string; msg?: string; to?: string; subject?: string; body?: string;
  ssid?: string; sec?: string; pass?: string; hidden?: boolean;
  lat?: string; lng?: string; name?: string; tel?: string; email?: string;
  org?: string; title?: string; loc?: string; start?: string; end?: string; text?: string;
  pixKey?: string; city?: string; amount?: string; txid?: string; desc?: string; dynamic?: boolean;
  cep?: string; currency?: string; mcc?: string; billNumber?: string; storeLabel?: string;
  terminalLabel?: string; purpose?: string; valid?: boolean;
}

/**
 * Valida o CRC16 (CCITT-FALSE, polinômio 0x1021, init 0xFFFF) de um BR Code.
 * O CRC são os 4 hex finais, calculados sobre todo o resto — inclusive o "6304"
 * que o antecede. Serve só para detectar leitura corrompida; não acessa a rede.
 */
function pixCrcValid(payload: string): boolean {
  if (payload.length < 8 || payload.slice(-8, -4) !== '6304') return false;
  let crc = 0xffff;
  const base = payload.slice(0, -4);
  for (let k = 0; k < base.length; k++) {
    crc ^= base.charCodeAt(k) << 8;
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0') === payload.slice(-4).toUpperCase();
}

/**
 * Faz o parse de um payload EMV (BR Code / Pix) em pares `id → valor`. O formato
 * é TLV: 2 dígitos de id, 2 de comprimento e o valor. Ignora lixo mal-formado.
 */
function parseEmv(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= s.length) {
    const id = s.slice(i, i + 2);
    const len = parseInt(s.slice(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > s.length) break;
    out[id] = s.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

/** Interpreta o texto bruto de um QR e devolve o tipo + campos extraídos. */
export function parseDecoded(raw: string): Decoded {
  const t = raw.trim();
  // Pix / BR Code (EMV): começa com o indicador de formato "000201" e traz o
  // identificador do arranjo Pix. Extraímos só os campos que existirem.
  if (/^000201/.test(t) && /br\.gov\.bcb\.pix/i.test(t)) {
    const emv = parseEmv(t);
    // Conta do recebedor (Merchant Account Information): fica em algum id de 26 a 51;
    // pegamos o que contém o GUI do Pix.
    let mai = '';
    for (let id = 26; id <= 51; id++) {
      const v = emv[String(id).padStart(2, '0')];
      if (v && /br\.gov\.bcb\.pix/i.test(v)) { mai = v; break; }
    }
    const sub = parseEmv(mai);           // subcampos da conta do recebedor (GUI/chave/URL)
    const add = parseEmv(emv['62'] || ''); // "Additional Data Field Template"
    const txid = add['05'] || '';
    const url = sub['25'] || '';
    // Tipo pelo "Point of Initiation Method" (id 01): 12 = dinâmico, 11 = estático.
    // Ausente = estático (reutilizável); a presença da URL (subcampo 25) confirma dinâmico.
    const dynamic = emv['01'] === '12' || !!url;
    return {
      type: 'pix',
      dynamic,
      valid: pixCrcValid(t),
      pixKey: sub['01'] || '',       // chave (só no Pix estático)
      desc: sub['02'] || '',         // informação adicional do recebedor
      url: url ? (/^https?:\/\//i.test(url) ? url : 'https://' + url) : '',
      name: emv['59'] || '',         // nome do recebedor
      city: emv['60'] || '',         // cidade
      cep: emv['61'] || '',          // CEP
      amount: emv['54'] || '',       // valor
      currency: emv['53'] || '',     // moeda (986 = BRL)
      mcc: emv['52'] || '',          // categoria do estabelecimento (MCC)
      billNumber: add['01'] || '',   // número do documento/fatura
      storeLabel: add['03'] || '',   // identificação da loja
      terminalLabel: add['07'] || '', // identificação do terminal/caixa
      purpose: add['08'] || '',      // finalidade da transação
      // "***" é o marcador de "sem txid" no Pix estático; tratamos como ausente.
      txid: txid && txid !== '***' ? txid : '',
    };
  }
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
