/*
 * Telefones de qualquer país (SPEC-001: GEN-F07, GEN-F12), via libphonenumber-js
 * com os metadados completos (`max`), que validam tamanho e prefixos por país.
 * Sem `+`, o número é lido como brasileiro; com `+`, pelo DDI.
 */
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js/max';

const DEFAULT_COUNTRY = 'BR';
const MAX_DIGITS = 15; // limite do E.164

/**
 * Número internacional? Com `+` sempre. No WhatsApp (`wa`), mais de 11 dígitos
 * sem `+` também é lido como DDI + número, como a máscara antiga fazia.
 */
function isIntl(raw: string, digits: string, wa: boolean): boolean {
  return raw.trim().startsWith('+') || (wa && digits.length > 11);
}

function digitsOf(v: string): string {
  return v.replace(/\D/g, '').slice(0, MAX_DIGITS);
}

/** Máscara enquanto digita, no formato do país (ex.: "(11) 99999-9999", "+1 213 373 4253"). */
export function maskPhone(v: string, wa = false): string {
  const d = digitsOf(v);
  const intl = isIntl(v, d, wa);
  if (!d) return intl && v.trim().startsWith('+') ? '+' : '';
  return intl ? new AsYouType().input('+' + d) : new AsYouType(DEFAULT_COUNTRY).input(d);
}

/** Máscara do WhatsApp: aceita o DDI com ou sem `+`. */
export function maskPhoneWa(v: string): string {
  return maskPhone(v, true);
}

/** Número válido no formato E.164 (`+5511999999999`), ou `null` se inválido. */
export function phoneE164(v: string, wa = false): string | null {
  const d = digitsOf(v);
  if (!d) return null;
  const p = isIntl(v, d, wa)
    ? parsePhoneNumberFromString('+' + d)
    : parsePhoneNumberFromString(d, DEFAULT_COUNTRY);
  return p && p.isValid() ? p.number : null;
}
