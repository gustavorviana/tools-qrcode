/*
 * Entrada do bundle separado `phone.js` (libphonenumber-js, ~220 KB). Ele é baixado
 * só nas páginas com campo de telefone (ver `loadPhone` em ./phone-loader) e expõe
 * as funções em `window.QRPhone`.
 */
import { maskPhone, maskPhoneWa, phoneE164 } from './phone';

window.QRPhone = { maskPhone, maskPhoneWa, phoneE164 };
