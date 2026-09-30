/*
 * Validação dos campos de cada tipo de QR (SPEC-001: GEN-F04, GEN-F12).
 * Funções puras: recebem os valores por id do campo e devolvem as mensagens de erro
 * por id. Um tipo sem erros devolve `{}`.
 */

/** Valores dos campos, por id (`f_ssid`, `f_hidden`…). Checkbox vem como boolean. */
export type FieldValues = Record<string, string | boolean | undefined>;
/** Mensagem de erro por id do campo. */
export type FieldErrors = Record<string, string>;

const REQUIRED = 'Campo obrigatório.';

const str = (v: FieldValues, id: string): string => {
  const x = v[id];
  return typeof x === 'string' ? x.trim() : '';
};

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/** Endereço web: domínio com ponto e sem espaços; o esquema é opcional. */
export function isWebUrl(s: string): boolean {
  if (/\s/.test(s)) return false;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : 'https://' + s;
  try {
    const host = new URL(withScheme).hostname;
    return /\.[a-z0-9-]{2,}$/i.test(host) && !host.startsWith('.');
  } catch {
    return false;
  }
}

/**
 * Validador de telefone (`phoneE164` de ./phone), injetado para que a lib de
 * telefones fique fora do `app.js`. Sem ele, os telefones só são checados como
 * obrigatórios (ainda carregando).
 */
export type PhoneCheck = (s: string, wa?: boolean) => string | null;

/** Senha de Wi-Fi conforme a segurança: WPA 8–63 caracteres; WEP 5/13 caracteres ou 10/26 hex. */
export function wifiPassError(sec: string, pass: string): string | null {
  if (sec === 'nopass') return null;
  if (!pass) return 'Informe a senha da rede (ou escolha a segurança "Nenhuma").';
  if (sec === 'WEP') {
    const hex = /^[0-9a-f]+$/i.test(pass) && (pass.length === 10 || pass.length === 26);
    return hex || pass.length === 5 || pass.length === 13
      ? null : 'Senha WEP: 5 ou 13 caracteres, ou 10 ou 26 dígitos hexadecimais.';
  }
  return pass.length >= 8 && pass.length <= 63 ? null : 'Senha WPA: de 8 a 63 caracteres.';
}

const PHONE_MSG = 'Telefone inválido: use DDD + número (ex.: (11) 99999-9999) ou +DDI para outro país.';
const EMAIL_MSG = 'E-mail inválido (ex.: nome@exemplo.com).';
const URL_MSG = 'Endereço inválido (ex.: exemplo.com).';

/** Campo de usuário de rede social: obrigatório; aceita link ou usuário sem espaços. */
function social(e: FieldErrors, v: FieldValues, id: string): void {
  const s = str(v, id);
  if (!s) e[id] = REQUIRED;
  else if (/^https?:\/\//i.test(s) ? !isWebUrl(s) : /\s/.test(s.replace(/^@+/, ''))) {
    e[id] = /^https?:\/\//i.test(s) ? URL_MSG : 'O usuário não pode ter espaços.';
  }
}

export function validateFields(type: string, v: FieldValues, phone?: PhoneCheck): FieldErrors {
  const e: FieldErrors = {};
  const isPhone = (s: string): boolean => !phone || phone(s) !== null;
  const req = (id: string): boolean => {
    if (str(v, id)) return true;
    e[id] = REQUIRED;
    return false;
  };
  const opt = (id: string, ok: (s: string) => boolean, msg: string): void => {
    const s = str(v, id);
    if (s && !ok(s)) e[id] = msg;
  };
  const reqFmt = (id: string, ok: (s: string) => boolean, msg: string): void => {
    if (req(id) && !ok(str(v, id))) e[id] = msg;
  };

  switch (type) {
    case 'text':
      if (!(typeof v.f_text === 'string' && v.f_text.trim())) e.f_text = REQUIRED;
      break;
    case 'link': reqFmt('f_link', isWebUrl, URL_MSG); break;
    case 'app': reqFmt('f_app', isWebUrl, URL_MSG); break;
    case 'wifi': {
      req('f_ssid');
      // A senha não leva trim: espaços nas pontas fazem parte dela.
      const pass = typeof v.f_pass === 'string' ? v.f_pass : '';
      const err = wifiPassError(str(v, 'f_sec'), pass);
      if (err) e.f_pass = err;
      break;
    }
    case 'email': reqFmt('f_email', isEmail, EMAIL_MSG); break;
    case 'tel': reqFmt('f_tel', isPhone, PHONE_MSG); break;
    case 'sms': reqFmt('f_smsnum', isPhone, PHONE_MSG); break;
    case 'whatsapp':
      reqFmt('f_wanum', (s) => !phone || phone(s, true) !== null,
        'Número inválido: use DDD + número (Brasil) ou DDI + número (ex.: +1 213 373 4253).');
      break;
    case 'vcard':
      req('f_vcname');
      opt('f_vctel', isPhone, PHONE_MSG);
      opt('f_vcemail', isEmail, EMAIL_MSG);
      opt('f_vcurl', isWebUrl, URL_MSG);
      break;
    case 'mecard':
      req('f_mcname');
      opt('f_mctel', isPhone, PHONE_MSG);
      opt('f_mcemail', isEmail, EMAIL_MSG);
      break;
    case 'geo': {
      const num = (s: string): number => Number(s.replace(',', '.'));
      reqFmt('f_geolat', (s) => { const n = num(s); return Number.isFinite(n) && n >= -90 && n <= 90; },
        'Latitude inválida: de -90 a 90.');
      reqFmt('f_geolng', (s) => { const n = num(s); return Number.isFinite(n) && n >= -180 && n <= 180; },
        'Longitude inválida: de -180 a 180.');
      break;
    }
    case 'event': {
      req('f_evtitle');
      req('f_evstart');
      const start = str(v, 'f_evstart'), end = str(v, 'f_evend');
      // `datetime-local` (AAAA-MM-DDTHH:MM) compara corretamente como texto.
      if (start && end && end < start) e.f_evend = 'O fim não pode ser antes do início.';
      break;
    }
    case 'paypal':
      social(e, v, 'f_pp');
      opt('f_ppamt', (s) => { const n = Number(s.replace(',', '.')); return Number.isFinite(n) && n > 0; },
        'Valor inválido: use um número maior que zero (ex.: 49,90).');
      break;
    case 'zoom':
      reqFmt('f_zoomid', (s) => { const n = s.replace(/\D/g, '').length; return n >= 9 && n <= 11; },
        'ID inválido: de 9 a 11 dígitos.');
      break;
    case 'instagram': social(e, v, 'f_ig'); break;
    case 'facebook': social(e, v, 'f_fb'); break;
    case 'telegram': social(e, v, 'f_tg'); break;
    case 'youtube': social(e, v, 'f_yt'); break;
    case 'tiktok': social(e, v, 'f_tt'); break;
    case 'x': social(e, v, 'f_x'); break;
    case 'linkedin': social(e, v, 'f_li'); break;
  }
  return e;
}
