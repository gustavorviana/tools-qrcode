/*
 * Formatação pura — escapes de conteúdo (Wi-Fi/vCard/iCal), datas e máscaras de
 * telefone. Sem DOM: funções puras, fáceis de testar isoladamente.
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

/** Máscara de telefone BR local: `(11) 99999-9999` (celular) ou `(11) 9999-9999` (fixo). */
export function maskPhoneBR(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  const ddd = '(' + d.slice(0, 2) + ') ';
  const r = d.slice(2);
  if (r.length <= 4) return ddd + r;
  if (r.length <= 8) return ddd + r.slice(0, 4) + '-' + r.slice(4);
  return ddd + r.slice(0, 5) + '-' + r.slice(5);
}

/** Máscara de WhatsApp: inclui o código do país (dígitos além dos 11 nacionais). */
export function maskPhoneWa(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 15);
  if (!d) return '';
  if (d.length <= 11) return maskPhoneBR(d);
  const cc = d.slice(0, d.length - 11);
  return '+' + cc + ' ' + maskPhoneBR(d.slice(d.length - 11));
}
