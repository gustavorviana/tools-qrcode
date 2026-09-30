/*
 * Formatação pura — escapes de conteúdo (Wi-Fi/vCard/iCal), datas e links
 * de redes sociais. Sem DOM: funções puras, fáceis de testar isoladamente.
 */

/** Escapa caracteres especiais do payload Wi-Fi (`\ ; , " :`). */
export const escWifi = (s: string): string => s.replace(/([\\;,":])/g, '\\$1');

/** Escapa um valor de vCard (barra, `;`, `,` e quebras de linha). */
export const escVcard = (s: string): string => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;')
  .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Converte `datetime-local` em carimbo iCal (`AAAAMMDDTHHMM00`). */
export const icalDate = (s: string): string => s ? s.replace(/[-:]/g, '') + '00' : '';

/** Extrai o valor de uma propriedade iCal/vCard (`KEY[...]:valor`), desescapando. */
export function icalGet(text: string, key: string): string {
  const m = text.match(new RegExp('^' + key + '[^:\\n]*:(.*)$', 'im'));
  return m ? m[1].trim().replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1') : '';
}

/** Formata uma data iCal (`AAAAMMDD[THHMM]`) como `DD/MM/AAAA [HH:MM]`. */
export function fmtIcalDate(s: string): string {
  const m = s.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!m) return s;
  const d = m[3] + '/' + m[2] + '/' + m[1];
  return m[4] ? d + ' ' + m[4] + ':' + m[5] : d;
}

/**
 * URL de perfil de rede social. Aceita um link completo (`http(s)://…`, devolvido
 * como está) ou só o usuário (com `@` opcional), anexado à `base`. Vazio → ''.
 */
export function socialUrl(input: string, base: string): string {
  const u = input.trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return base + u.replace(/^@+/, '').replace(/\s+/g, '');
}

/** Link do PayPal.me a partir do usuário e um valor opcional. Vazio → ''. */
export function paypalUrl(user: string, amount: string): string {
  const u = user.trim().replace(/^@+/, '').replace(/\s+/g, '');
  if (!u) return '';
  const amt = amount.trim().replace(',', '.');
  return 'https://paypal.me/' + u + (amt && !isNaN(Number(amt)) ? '/' + amt : '');
}

/** Payload MeCard (`MECARD:N:sobrenome,nome;TEL:…;EMAIL:…;;`). Sem nome → ''. */
export function mecard(name: string, tel: string, email: string): string {
  const nm = name.trim();
  if (!nm) return '';
  const esc = (s: string): string => s.replace(/([\\;:,])/g, '\\$1');
  const parts = nm.split(/\s+/);
  const last = parts.length > 1 ? parts.pop()! : '';
  const first = parts.join(' ');
  let s = 'MECARD:N:' + esc(last) + ',' + esc(first) + ';';
  const t = tel.replace(/[^\d+]/g, '');
  const e = email.trim();
  if (t) s += 'TEL:' + t + ';';
  if (e) s += 'EMAIL:' + esc(e) + ';';
  return s + ';';
}

/** Link de reunião do Zoom a partir do ID e senha opcional. Sem ID → ''. */
export function zoomUrl(id: string, pwd: string): string {
  const n = id.replace(/\D/g, '');
  if (!n) return '';
  const p = pwd.trim();
  return 'https://zoom.us/j/' + n + (p ? '?pwd=' + encodeURIComponent(p) : '');
}
