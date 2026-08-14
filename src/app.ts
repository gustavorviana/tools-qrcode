/*
 * App — Controlador da interface. Orquestra os campos, a personalização e a
 * leitura, delegando ao QREncoder (geração), QRDesigner (render/estilo) e
 * QRReader (decodificação).
 */
import { QRDesigner } from './qr/designer';
import { QRReader } from './qr/reader';
import type { ReadMode } from './qr/reader';
import { createFrame } from './qr/frames';
import type { Ecl, ModuleShape, EyeFrameShape, EyeCenterShape, FrameStyle } from './qr/types';
import type { ShapeType } from 'qr-code-styling';
import { BODY, EYE_FRAME, eyeCenterOptions } from './qr/shapes';
import type { BodyShapeDef, EyeFrameDef, CenterOption } from './qr/shapes';
import { escWifi, escVcard, icalDate, fmtIcalDate, maskPhoneBR, maskPhoneWa } from './format';
import { parseDecoded } from './qr/decode';
import type { DecodedType } from './qr/decode';
import { SHARE_DEFAULTS, PNG_SIZES, buildShareQuery, parseShareQuery } from './qr/share';
import type { ShareParams } from './qr/share';

/* ---------- Helpers de DOM ---------- */
const $ = (id: string): HTMLElement => document.getElementById(id)!;
const $i = (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement;
const val = (id: string): string => $i(id).value;

let toastTimer: number | undefined;
function toast(msg: string): void {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------- Formatação (escapes/máscaras/datas vivem em ./format) ---------- */
// Letra do nível de correção, para exibição na meta.
const ECL_LETTER: Record<Ecl, string> = { LOW: 'L', MEDIUM: 'M', QUARTILE: 'Q', HIGH: 'H' };

function attachMask(id: string, fn: (v: string) => string): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.addEventListener('input', () => { el.value = fn(el.value); });
}

/* ---------- Previews dos botões de forma (gerados dos registries) ---------- */
const ICON_COL = '#334155';
const svgIco = (inner: string): string =>
  `<svg class="opt-ico-svg" viewBox="0 0 24 24" width="26" height="26">${inner}</svg>`;

/** Ícone de uma forma de corpo: usa o próprio `draw` (lib e custom têm glifo). */
const bodyPreview = (def: BodyShapeDef): string => svgIco(def.draw(12, 12, 20, ICON_COL));
/** Ícone da moldura do olho: desenha o anel num finder 7×7 encaixado em 24×24. */
const eyeFramePreview = (def: EyeFrameDef): string => svgIco(def.draw(2, 2, 20 / 7, ICON_COL));
/** Ícone do centro do olho: moldura leve de contexto + o glifo do centro. */
const eyeCenterPreview = (def: CenterOption): string =>
  svgIco(`<rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="none" stroke="#cbd5e1" stroke-width="2"/>`
    + def.draw(12, 12, 15, ICON_COL));

/* =====================================================================
   Visualização por tipo (resultado lido / link compartilhado)
   ===================================================================== */
type Attrs = { class?: string; style?: string; onclick?: (e: Event) => void };

function el(tag: string, attrs: Attrs = {}, ...kids: Array<Node | string | null | false>): HTMLElement {
  const n = document.createElement(tag);
  for (const k of Object.keys(attrs) as Array<keyof Attrs>) {
    const v = attrs[k];
    if (v == null) continue;
    if (k === 'class') n.className = v as string;
    else if (k === 'onclick') n.addEventListener('click', v as (e: Event) => void);
    else n.setAttribute(k, v as string);
  }
  for (const c of kids) {
    if (c == null || c === false) continue;
    n.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return n;
}

function drow(key: string, value: string | undefined, mono = false): HTMLElement {
  return el('div', { class: 'drow' },
    el('span', { class: 'dkey' }, key),
    el('span', { class: 'dval' + (mono ? ' mono' : '') }, value ?? ''));
}

/** Formata um valor Pix (ex.: "10.50") como moeda BRL; devolve o cru se inválido. */
function fmtBRL(v: string): string {
  const n = Number(v);
  return isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : v;
}

function downloadText(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function copyText(t: string): void {
  navigator.clipboard.writeText(t).then(
    () => toast('Copiado!'), () => toast('Não foi possível copiar'));
}
/* parseDecoded, Decoded e DecodedType vivem em ./qr/decode (lógica pura). */

const KIND: Record<DecodedType, { i: string; k: string }> = {
  text: { i: '≡', k: 'Texto' }, link: { i: '🔗', k: 'Link' }, tel: { i: '📞', k: 'Telefone' },
  sms: { i: '💬', k: 'SMS' }, email: { i: '✉️', k: 'E-mail' }, wifi: { i: '📶', k: 'Wi-Fi' },
  geo: { i: '📍', k: 'Localização' }, vcard: { i: '👤', k: 'Contato' }, event: { i: '📅', k: 'Evento' },
  whatsapp: { i: '💚', k: 'WhatsApp' }, pix: { i: '💠', k: 'Pix' },
};

interface Action { label: string; cls: string; fn: () => void; }

function renderDecoded(container: HTMLElement, raw: string): void {
  container.innerHTML = '';
  const d = parseDecoded(raw);
  const meta = KIND[d.type];
  const rows: HTMLElement[] = [];
  const actions: Action[] = [];
  const openUrl = (u: string): void => { window.open(u, '_blank', 'noopener'); };

  switch (d.type) {
    case 'link':
      rows.push(drow('URL', d.url, true));
      actions.push({ label: 'Abrir', cls: 'ok', fn: () => openUrl(d.url!) });
      break;
    case 'tel':
      rows.push(drow('Número', d.number));
      actions.push({ label: 'Ligar', cls: 'ok', fn: () => openUrl('tel:' + d.number) });
      break;
    case 'sms':
      rows.push(drow('Número', d.number));
      if (d.msg) rows.push(drow('Mensagem', d.msg));
      actions.push({ label: 'Enviar SMS', cls: 'ok', fn: () => openUrl('sms:' + d.number) });
      break;
    case 'email':
      rows.push(drow('Para', d.to));
      if (d.subject) rows.push(drow('Assunto', d.subject));
      if (d.body) rows.push(drow('Mensagem', d.body));
      actions.push({ label: 'Enviar e-mail', cls: 'ok', fn: () => openUrl(raw) });
      break;
    case 'wifi':
      rows.push(drow('Rede', d.ssid));
      rows.push(drow('Segurança', d.sec === 'nopass' ? 'Aberta' : d.sec));
      if (d.pass) rows.push(drow('Senha', d.pass, true));
      if (d.hidden) rows.push(drow('Oculta', 'Sim'));
      if (d.pass) actions.push({ label: 'Copiar senha', cls: 'ok', fn: () => copyText(d.pass!) });
      break;
    case 'geo':
      rows.push(drow('Latitude', d.lat, true));
      rows.push(drow('Longitude', d.lng, true));
      actions.push({ label: 'Abrir no mapa', cls: 'ok', fn: () =>
        openUrl('https://www.google.com/maps/search/?api=1&query=' + d.lat + ',' + d.lng) });
      break;
    case 'vcard':
      if (d.org) rows.push(drow('Empresa', d.org));
      if (d.title) rows.push(drow('Cargo', d.title));
      if (d.tel) rows.push(drow('Telefone', d.tel));
      if (d.email) rows.push(drow('E-mail', d.email));
      if (d.url) rows.push(drow('Site', d.url, true));
      actions.push({ label: 'Salvar contato', cls: 'ok', fn: () => downloadText('contato.vcf', 'text/vcard', raw) });
      if (d.tel) actions.push({ label: 'Ligar', cls: 'ghost', fn: () => openUrl('tel:' + d.tel!.replace(/[^\d+]/g, '')) });
      break;
    case 'event':
      if (d.loc) rows.push(drow('Local', d.loc));
      if (d.start) rows.push(drow('Início', fmtIcalDate(d.start)));
      if (d.end) rows.push(drow('Fim', fmtIcalDate(d.end)));
      actions.push({ label: 'Adicionar à agenda', cls: 'ok', fn: () => downloadText('evento.ics', 'text/calendar', raw) });
      break;
    case 'whatsapp':
      rows.push(drow('Número', d.number));
      if (d.msg) rows.push(drow('Mensagem', d.msg));
      actions.push({ label: 'Abrir conversa', cls: 'ok', fn: () => openUrl(d.url!) });
      break;
    case 'pix': {
      const brl = d.currency && d.currency !== '986';
      rows.push(drow('Tipo', d.dynamic ? 'Pix dinâmico' : 'Pix estático'));
      if (d.name) rows.push(drow('Recebedor', d.name));
      if (d.pixKey) rows.push(drow('Chave', d.pixKey, true));
      if (d.amount) rows.push(drow('Valor', brl ? d.amount : fmtBRL(d.amount)));
      if (brl) rows.push(drow('Moeda', d.currency!));
      if (d.desc) rows.push(drow('Descrição', d.desc));
      if (d.city) rows.push(drow('Cidade', d.city));
      if (d.cep) rows.push(drow('CEP', d.cep));
      if (d.mcc && d.mcc !== '0000') rows.push(drow('Categoria (MCC)', d.mcc));
      if (d.billNumber) rows.push(drow('Documento', d.billNumber));
      if (d.storeLabel) rows.push(drow('Loja', d.storeLabel));
      if (d.terminalLabel) rows.push(drow('Terminal', d.terminalLabel));
      if (d.purpose) rows.push(drow('Finalidade', d.purpose));
      if (d.txid) rows.push(drow('Identificador', d.txid, true));
      if (d.valid === false) rows.push(drow('Verificação', 'CRC inválido — código possivelmente corrompido'));
      // A URL do Pix dinâmico é um link de acesso à cobrança (funciona como um token):
      // não a exibimos nem a acessamos. Deixamos só um aviso de não compartilhar os dados.
      rows.push(el('div', { class: 'dnote' },
        '🔒 Este código pode conter dados pessoais'
        + (d.url ? ' e um link de acesso à cobrança' : '')
        + '. Evite compartilhar o código Pix ou capturas de tela com terceiros.'));
      actions.push({ label: 'Copiar código Pix', cls: 'ok', fn: () => copyText(raw) });
      if (d.pixKey) actions.push({ label: 'Copiar chave', cls: 'ghost', fn: () => copyText(d.pixKey!) });
      break;
    }
    default:
      rows.push(el('div', { class: 'drow' },
        el('span', { class: 'dval', style: 'white-space:pre-wrap' }, d.text ?? '')));
  }

  const title = d.type === 'vcard' ? (d.name || 'Contato')
    : d.type === 'event' ? (d.title || 'Evento')
    : d.type === 'wifi' ? d.ssid
    : d.type === 'pix' ? (d.name || d.pixKey || 'Pix')
    : d.type === 'text' ? ''
    : (d.url || d.number || d.to || (d.lat ? d.lat + ', ' + d.lng : '') || meta.k);

  const head = el('div', { class: 'detail-head' },
    el('div', { class: 'detail-ico' }, meta.i),
    el('div', {},
      el('div', { class: 'detail-kind' }, meta.k),
      title ? el('div', { class: 'detail-title' }, title) : null));

  container.append(el('div', { class: 'detail' }, head, ...rows));

  actions.push({ label: 'Copiar', cls: 'ghost', fn: () => copyText(raw) });
  const bar = el('div', { class: 'detail-actions' + (actions.length === 2 ? ' two' : '') });
  actions.forEach((a) => bar.append(el('button', { class: 'btn ' + a.cls, onclick: a.fn }, a.label)));
  container.append(bar);
}

/* ---------- Estado do mapa ---------- */
interface MapState { lat: number; lng: number; z: number; W: number; H: number; }

// Web Mercator: conversão entre lat/lng e coordenadas de tile.
const lon2tile = (lon: number, z: number): number => (lon + 180) / 360 * Math.pow(2, z);
const lat2tile = (lat: number, z: number): number => {
  const r = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z);
};
const tile2lon = (x: number, z: number): number => x / Math.pow(2, z) * 360 - 180;
const tile2lat = (y: number, z: number): number => {
  const nn = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(nn) - Math.exp(-nn)));
};

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches
  || (navigator as unknown as { standalone?: boolean }).standalone === true;

/* File Handling API (abrir arquivos no PWA) — ainda fora da lib padrão do TS. */
interface LaunchParams { files?: Array<{ getFile(): Promise<File> }>; }
interface LaunchQueue { setConsumer(consumer: (params: LaunchParams) => void): void; }

/** Controlador principal da aplicação. */
export class App {
  private readonly designer = new QRDesigner();
  private readonly reader = new QRReader();

  private currentType = 'text';
  private lastText = '';
  private lastSVG = '';

  /** Modo do leitor: procurar os dois (padrão), só QR ou só código de barras. */
  private readMode: ReadMode = 'auto';

  /** Após a 1ª geração, mudanças de personalização redesenham o QR ao vivo. */
  private live = false;
  private liveTimer: number | undefined;

  /** Estilo/legenda atuais da moldura; combinados numa instância `Frame`. */
  private frameStyle: FrameStyle = 'none';
  private caption = 'ESCANEIE';

  private stream: MediaStream | null = null;
  private scanning = false;
  private map: MapState | null = null;
  private mapBound = false;
  private deferredPrompt: { prompt(): void; userChoice: Promise<{ outcome: string }> } | null = null;

  /* ---------- Navegação ---------- */
  showView(v: string): void {
    ['gen', 'read', 'about', 'privacy', 'share'].forEach((name) => {
      $('view-' + name).classList.toggle('active', v === name);
    });
    (document.querySelector('.tabs') as HTMLElement).hidden = false;
    $('tabGen').classList.toggle('active', v === 'gen');
    $('tabRead').classList.toggle('active', v === 'read');
    $('tabAbout').classList.toggle('active', v === 'about');
    if (v !== 'read') this.stopCamera();
    const m = document.querySelector('main');
    if (m) m.scrollTop = 0;
  }

  setType(t: string): void {
    this.currentType = t;
    document.querySelectorAll('#typeChips .type-tab').forEach((c) =>
      c.classList.toggle('active', (c as HTMLElement).dataset.type === t));
    document.querySelectorAll('.fgroup').forEach((g) => {
      (g as HTMLElement).hidden = (g as HTMLElement).dataset.fields !== t;
    });
    $('genPreview').hidden = true;
    $('genErr').textContent = '';
    // Troca de tipo não gera QR — apenas limpa a prévia anterior.
    $('step3').hidden = true;
  }

  toggleWifiPass(): void {
    const open = val('f_sec') === 'nopass';
    $i('f_pass').disabled = open;
    $i('f_pass').style.opacity = open ? '.5' : '1';
    $('lbl_pass').classList.toggle('req', !open);
  }

  /* ---------- Montagem do conteúdo ---------- */
  private buildContent(): string {
    switch (this.currentType) {
      case 'text':
        return val('f_text');
      case 'link': {
        let u = val('f_link').trim();
        if (!u) return '';
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = 'https://' + u;
        return u;
      }
      case 'wifi': {
        const ssid = val('f_ssid');
        if (!ssid.trim()) return '';
        const sec = val('f_sec');
        let s = 'WIFI:T:' + sec + ';S:' + escWifi(ssid) + ';';
        if (sec !== 'nopass') s += 'P:' + escWifi(val('f_pass')) + ';';
        if ($i('f_hidden').checked) s += 'H:true;';
        return s + ';';
      }
      case 'email': {
        const to = val('f_email').trim();
        if (!to) return '';
        const q: string[] = [];
        const sub = val('f_subject').trim(), body = val('f_ebody').trim();
        if (sub) q.push('subject=' + encodeURIComponent(sub));
        if (body) q.push('body=' + encodeURIComponent(body));
        return 'mailto:' + to + (q.length ? '?' + q.join('&') : '');
      }
      case 'tel': {
        const n = val('f_tel').replace(/[^\d+]/g, '');
        return n ? 'tel:' + n : '';
      }
      case 'sms': {
        const n = val('f_smsnum').replace(/[^\d+]/g, '');
        if (!n) return '';
        const m = val('f_smsmsg').trim();
        return 'SMSTO:' + n + (m ? ':' + m : '');
      }
      case 'whatsapp': {
        const n = val('f_wanum').replace(/\D/g, '');
        if (!n) return '';
        const m = val('f_wamsg').trim();
        return 'https://api.whatsapp.com/send?phone=' + n + (m ? '&text=' + encodeURIComponent(m) : '');
      }
      case 'vcard': {
        const name = val('f_vcname').trim();
        if (!name) return '';
        const parts = name.split(/\s+/);
        const last = parts.length > 1 ? parts.pop()! : '';
        const first = parts.join(' ');
        const lines = ['BEGIN:VCARD', 'VERSION:3.0',
          'N:' + escVcard(last) + ';' + escVcard(first) + ';;;',
          'FN:' + escVcard(name)];
        const org = val('f_vcorg').trim(), title = val('f_vctitle').trim();
        const tel = val('f_vctel').trim(), email = val('f_vcemail').trim();
        let url = val('f_vcurl').trim();
        if (org) lines.push('ORG:' + escVcard(org));
        if (title) lines.push('TITLE:' + escVcard(title));
        if (tel) lines.push('TEL;TYPE=CELL:' + tel.replace(/[^\d+]/g, ''));
        if (email) lines.push('EMAIL:' + escVcard(email));
        if (url) {
          if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = 'https://' + url;
          lines.push('URL:' + url);
        }
        lines.push('END:VCARD');
        return lines.join('\n');
      }
      case 'geo': {
        const lat = val('f_geolat').trim().replace(',', '.');
        const lng = val('f_geolng').trim().replace(',', '.');
        if (!lat || !lng) return '';
        if (isNaN(Number(lat)) || isNaN(Number(lng))) return '';
        return 'geo:' + lat + ',' + lng;
      }
      case 'event': {
        const title = val('f_evtitle').trim();
        const start = icalDate(val('f_evstart'));
        if (!title || !start) return '';
        const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
          'SUMMARY:' + escVcard(title)];
        const loc = val('f_evloc').trim();
        const end = icalDate(val('f_evend'));
        if (loc) lines.push('LOCATION:' + escVcard(loc));
        lines.push('DTSTART:' + start);
        if (end) lines.push('DTEND:' + end);
        lines.push('END:VEVENT', 'END:VCALENDAR');
        return lines.join('\n');
      }
    }
    return '';
  }

  showFormatted(): void {
    const errEl = $('genErr');
    errEl.textContent = '';
    const text = this.buildContent();
    const pv = $('genPreview');
    if (!text.trim()) {
      pv.hidden = true;
      errEl.textContent = 'Preencha os campos primeiro.';
      return;
    }
    $('genPreviewText').textContent = text;
    pv.hidden = false;
  }

  private renderSeq = 0;

  /* ---------- Geração + render ---------- */
  private async renderPreview(): Promise<void> {
    if (!this.designer.ready) return;
    const seq = ++this.renderSeq;
    let svg: string;
    try { svg = await this.designer.toSVG(); }
    catch (e) { $('step3').hidden = true; $('genErr').textContent = (e as Error).message; return; }
    if (seq !== this.renderSeq) return; // um render mais novo já começou → descarta o atrasado
    this.lastSVG = svg;
    $('qrPreview').innerHTML = svg;
    $('step3').hidden = false;
    // Aviso de que o logo não é embutido no link compartilhado (só na imagem).
    $('shareLinkNote').hidden = !this.designer.hasLogo;
    const { moduleCount, version, ecl } = this.designer.info;
    $('qrMeta').textContent =
      `Versão ${version} · correção ${ECL_LETTER[ecl]} · ${moduleCount}×${moduleCount} módulos`;
  }

  private async regenerate(): Promise<void> {
    $('genErr').textContent = '';
    const text = this.buildContent();
    if (!text.trim()) { this.lastSVG = ''; $('step3').hidden = true; return; }
    let ecl = val('genEcl') as Ecl;
    if (this.designer.hasLogo && (ecl === 'LOW' || ecl === 'MEDIUM')) ecl = 'QUARTILE';
    this.lastText = text;
    this.designer.text = text;
    this.designer.ecl = ecl;
    await this.renderPreview();
  }

  async doGenerate(): Promise<void> {
    await this.regenerate();
    if (this.lastSVG) {
      // Sucesso: troca para a etapa de personalização + QR (ao vivo).
      this.live = true;
      $('genContent').hidden = true;
      $('genResult').hidden = false;
      const m = document.querySelector('main');
      if (m) m.scrollTop = 0;
    } else if (!$('genErr').textContent) {
      $('genErr').textContent = 'Preencha os campos primeiro.';
    }
  }

  /** Volta à etapa de conteúdo (oculta a personalização/QR). */
  backToContent(): void {
    this.live = false;
    clearTimeout(this.liveTimer);
    $('genResult').hidden = true;
    $('genContent').hidden = false;
    const m = document.querySelector('main');
    if (m) m.scrollTop = 0;
  }

  /**
   * Redesenha o QR ao vivo quando a personalização muda (só após a 1ª geração).
   * Debounce curto para coalescer eventos rápidos (arrastar cor, digitar hex/legenda).
   */
  private liveUpdate(): void {
    if (!this.live) return;
    clearTimeout(this.liveTimer);
    this.liveTimer = window.setTimeout(() => void this.regenerate(), 120);
  }

  /* ---------- Personalização ---------- */
  setCustomTab(name: string): void {
    document.querySelectorAll('#custTabs .ctab').forEach((b) =>
      b.classList.toggle('active', (b as HTMLElement).dataset.ctab === name));
    document.querySelectorAll('.cpanel').forEach((p) => {
      (p as HTMLElement).hidden = (p as HTMLElement).dataset.panel !== name;
    });
  }

  /*
   * Os ajustes de personalização abaixo guardam o estado no designer e atualizam
   * a UI dos controles; após a 1ª geração (etapa 2), `liveUpdate()` redesenha o
   * QR automaticamente a cada mudança.
   */
  setColor(which: 'fg' | 'bg', value: string): void {
    this.designer.colors = { [which]: value };
    const base = which === 'fg' ? 'c_fg' : 'c_bg';
    $i(base).value = value;
    $i(base + '_hex').value = value;
    // Enquanto as cores de olho herdam `fg`, mantém os seletores exibindo a mesma cor.
    if (which === 'fg') {
      const { eyeFrame, eyeCenter } = this.designer.colors;
      if (eyeFrame === undefined) { $i('c_ef').value = value; $i('c_ef_hex').value = value; }
      if (eyeCenter === undefined) { $i('c_ec').value = value; $i('c_ec_hex').value = value; }
    }
    this.liveUpdate();
  }

  setHex(which: 'fg' | 'bg', raw: string): void {
    let v = raw.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split('').map((c) => c + c).join('');
    else if (!/^[0-9a-fA-F]{6}$/.test(v)) return;
    v = '#' + v.toLowerCase();
    this.designer.colors = { [which]: v };
    $i(which === 'fg' ? 'c_fg' : 'c_bg').value = v;
    this.liveUpdate();
  }

  applyPreset(fg: string, bg: string): void { this.setColor('fg', fg); this.setColor('bg', bg); }

  setShape(v: ModuleShape): void {
    this.designer.shape = v;
    document.querySelectorAll('#shapeOpts .opt').forEach((o) =>
      o.classList.toggle('active', (o as HTMLElement).dataset.shape === v));
    this.liveUpdate();
  }

  setEyeFrameShape(v: EyeFrameShape): void {
    this.designer.eyeFrameShape = v;
    document.querySelectorAll('#eyeFrameOpts .opt').forEach((o) =>
      o.classList.toggle('active', (o as HTMLElement).dataset.eyeframe === v));
    this.liveUpdate();
  }

  setEyeCenterShape(v: EyeCenterShape): void {
    this.designer.eyeCenterShape = v;
    document.querySelectorAll('#eyeCenterOpts .opt').forEach((o) =>
      o.classList.toggle('active', (o as HTMLElement).dataset.eyecenter === v));
    this.liveUpdate();
  }

  /** Cor da moldura/centro do olho (sobrescreve a cor dos módulos). */
  setEyeColor(which: 'frame' | 'center', value: string): void {
    this.designer.colors = which === 'frame' ? { eyeFrame: value } : { eyeCenter: value };
    const base = which === 'frame' ? 'c_ef' : 'c_ec';
    $i(base).value = value;
    $i(base + '_hex').value = value;
    this.liveUpdate();
  }

  setEyeHex(which: 'frame' | 'center', raw: string): void {
    let v = raw.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split('').map((c) => c + c).join('');
    else if (!/^[0-9a-fA-F]{6}$/.test(v)) return;
    v = '#' + v.toLowerCase();
    this.setEyeColor(which, v);
  }

  /** Liga/desliga o fundo transparente; desabilita o seletor de cor de fundo. */
  setBgTransparent(on: boolean): void {
    this.designer.bgTransparent = on;
    $i('c_bg').disabled = on;
    $i('c_bg_hex').disabled = on;
    $('c_bg').closest('.color-field')?.classList.toggle('disabled', on);
    const chk = document.getElementById('bgTransp') as HTMLInputElement | null;
    if (chk) chk.checked = on;
    this.liveUpdate();
  }

  /**
   * Monta os botões de forma (corpo/moldura/centro) a partir dos registries.
   * Registrar uma forma nova em ./qr/shapes já a faz aparecer aqui — sem tocar no
   * HTML nem repetir listas.
   */
  private buildShapeControls(): void {
    const autoFirst = <T extends { name: string }>(a: T, b: T): number =>
      (a.name === 'auto' ? 0 : 1) - (b.name === 'auto' ? 0 : 1);
    const fill = <T extends { name: string; label: string }>(
      id: string, attr: string, entries: T[], active: string,
      onClick: (name: string) => void, preview: (d: T) => string,
    ): void => {
      const host = $(id);
      host.innerHTML = '';
      for (const def of entries) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'opt' + (def.name === active ? ' active' : '');
        b.dataset[attr] = def.name;
        b.innerHTML = preview(def) + `<span>${def.label}</span>`;
        b.addEventListener('click', () => onClick(def.name));
        host.appendChild(b);
      }
    };
    fill('shapeOpts', 'shape', [...BODY.values()], this.designer.shape,
      (v) => this.setShape(v as ModuleShape), bodyPreview);
    fill('eyeFrameOpts', 'eyeframe', [...EYE_FRAME.values()].sort(autoFirst), this.designer.eyeFrameShape,
      (v) => this.setEyeFrameShape(v as EyeFrameShape), eyeFramePreview);
    // Centro do olho: mesmo catálogo do corpo (`auto` já vem primeiro).
    fill('eyeCenterOpts', 'eyecenter', eyeCenterOptions(), this.designer.eyeCenterShape,
      (v) => this.setEyeCenterShape(v as EyeCenterShape), eyeCenterPreview);
  }

  setQrShape(v: ShapeType): void {
    this.designer.qrShape = v;
    document.querySelectorAll('#qrShapeOpts .opt').forEach((o) =>
      o.classList.toggle('active', (o as HTMLElement).dataset.qrshape === v));
    this.liveUpdate();
  }

  setFrame(v: FrameStyle): void {
    this.frameStyle = v;
    this.designer.frame = createFrame(v, this.caption);
    document.querySelectorAll('#frameOpts .opt').forEach((o) =>
      o.classList.toggle('active', (o as HTMLElement).dataset.frame === v));
    $('capRow').hidden = v === 'none';
    this.liveUpdate();
  }

  setCaption(v: string): void {
    this.caption = v;
    this.designer.frame = createFrame(this.frameStyle, v);
    this.liveUpdate();
  }

  onLogo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.designer.logo = reader.result as string;
      $('logoRemove').hidden = false;
      this.liveUpdate();
    };
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.designer.logo = null;
    $('logoRemove').hidden = true;
    this.liveUpdate();
  }

  /* ---------- Modal ---------- */
  openModal(): void {
    if (!this.lastSVG) return;
    $('qrModalBox').innerHTML = this.lastSVG;
    $('qrModalMeta').textContent = $('qrMeta').textContent;
    this.applyModalSize();
    $('qrModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  closeModal(): void {
    $('qrModal').hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------- Exportação ---------- */
  /**
   * Resolução do PNG (px). Fonte única de verdade: define a resolução do export
   * e também o tamanho com que o QR é exibido ampliado no modal. O SVG é vetorial,
   * então isto nunca altera a geração — só o export e a exibição.
   */
  private exportPx: number = SHARE_DEFAULTS.size;

  /** Largura de exibição (px) do QR no modal para cada resolução escolhida. */
  private static readonly MODAL_W: Record<number, number> = {
    512: 220, 1024: 300, 2048: 380, 4096: 460,
  };

  /** Ajusta a largura do QR ampliado no modal conforme o tamanho escolhido. */
  private applyModalSize(): void {
    const svg = document.querySelector('#qrModalBox svg') as SVGElement | null;
    if (svg) svg.style.width = `min(${App.MODAL_W[this.exportPx] ?? 300}px, 88vw)`;
  }

  /** Atualiza o tamanho do PNG, reflete no select e redimensiona a imagem do modal. */
  setPngSize(px: number): void {
    if (!(PNG_SIZES as readonly number[]).includes(px)) return;
    this.exportPx = px;
    const el = document.getElementById('pngSize') as HTMLSelectElement | null;
    if (el) el.value = String(px);
    this.applyModalSize();
  }

  async downloadPNG(): Promise<void> {
    if (!this.lastSVG) return;
    try {
      const cv = await this.designer.toCanvas(this.exportPx);
      const a = document.createElement('a');
      a.download = 'qrcode.png';
      a.href = cv.toDataURL('image/png');
      a.click();
    } catch { toast('Falha ao exportar PNG'); }
  }

  downloadSVG(): void {
    if (!this.lastSVG) return;
    const a = document.createElement('a');
    a.download = 'qrcode.svg';
    a.href = URL.createObjectURL(this.designer.toSVGBlob());
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async shareQR(): Promise<void> {
    if (!this.lastSVG) return;
    try {
      const cv = await this.designer.toCanvas(this.exportPx);
      if (!navigator.canShare) { this.downloadPNG(); return; }
      const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, 'image/png'));
      if (!blob) return;
      const file = new File([blob], 'qrcode.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'QR Code' });
      else this.downloadPNG();
    } catch { /* cancelado */ }
  }

  /* ---------- Link compartilhável ---------- */
  /**
   * Link compartilhável: `#q=<texto>` mais as opções que fogem do padrão
   * (correção de erro + personalização). O logo não entra — é uma imagem e
   * inflaria demais a URL.
   */
  private buildShareURL(text: string): string {
    const { fg, bg, eyeFrame, eyeCenter } = this.designer.colors;
    const q = buildShareQuery({
      text, ecl: this.designer.ecl, fg, bg,
      eyeFrameColor: eyeFrame, eyeCenterColor: eyeCenter,
      bgTransparent: this.designer.bgTransparent,
      shape: this.designer.shape,
      eyeFrame: this.designer.eyeFrameShape, eyeCenter: this.designer.eyeCenterShape,
      qrShape: this.designer.qrShape,
      frame: this.frameStyle, caption: this.caption, size: this.exportPx,
    });
    return location.origin + location.pathname + '#' + q;
  }

  async shareLink(): Promise<void> {
    if (!this.lastText) return;
    const url = this.buildShareURL(this.lastText);
    if (navigator.share) {
      try { await navigator.share({ url }); return; }
      catch (e) { if (e && (e as Error).name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Link copiado!'); }
    catch { toast('Não foi possível copiar'); }
  }

  /** Lê texto + opções de um link (hash `#q=…` ou query `?q=…`); validação em ./qr/share. */
  private getSharedParams(): ShareParams | null {
    const raw = location.hash.length > 1 ? location.hash.slice(1)
      : location.search.length > 1 ? location.search.slice(1) : '';
    return parseShareQuery(raw);
  }

  private async renderShared(sp: ShareParams): Promise<void> {
    const text = sp.text;
    this.lastText = text;
    this.designer.text = text;
    // Aplica as opções do link (ou o padrão para as ausentes).
    this.designer.ecl = sp.ecl ?? SHARE_DEFAULTS.ecl;
    this.designer.colors = {
      fg: sp.fg ?? SHARE_DEFAULTS.fg, bg: sp.bg ?? SHARE_DEFAULTS.bg,
      eyeFrame: sp.eyeFrameColor, eyeCenter: sp.eyeCenterColor,
    };
    this.designer.bgTransparent = sp.bgTransparent ?? SHARE_DEFAULTS.bgTransparent;
    this.designer.shape = sp.shape ?? SHARE_DEFAULTS.shape;
    this.designer.eyeFrameShape = sp.eyeFrame ?? SHARE_DEFAULTS.eyeFrame;
    this.designer.eyeCenterShape = sp.eyeCenter ?? SHARE_DEFAULTS.eyeCenter;
    this.designer.qrShape = sp.qrShape ?? SHARE_DEFAULTS.qrShape;
    this.frameStyle = sp.frame ?? SHARE_DEFAULTS.frame;
    this.caption = sp.caption ?? SHARE_DEFAULTS.caption;
    this.designer.frame = createFrame(this.frameStyle, this.caption);
    this.setPngSize(sp.size ?? SHARE_DEFAULTS.size);
    let svg: string;
    try { svg = await this.designer.toSVG(); }
    catch { return; } // conteúdo inválido/grande demais → segue app normal
    if (!svg) return;

    this.lastSVG = svg;
    $('sharePreview').innerHTML = svg;
    renderDecoded($('shareDetail'), text);

    (document.querySelector('.tabs') as HTMLElement).hidden = true;
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('active'));
    ['gen', 'read', 'about', 'privacy'].forEach((n) => $('view-' + n).classList.remove('active'));
    $('view-share').classList.add('active');
    const m = document.querySelector('main');
    if (m) m.scrollTop = 0;
  }

  private initShared(): void {
    let sp: ShareParams | null;
    try { sp = this.getSharedParams(); } catch { sp = null; }
    if (sp) void this.renderShared(sp);
  }

  exitShared(): void {
    history.replaceState(null, '', location.pathname);
    $('view-share').classList.remove('active');
    (document.querySelector('.tabs') as HTMLElement).hidden = false;
    document.querySelectorAll('#view-gen input[type="text"], #view-gen textarea')
      .forEach((e) => { (e as HTMLInputElement).value = ''; });
    $i('f_hidden').checked = false;
    $('step3').hidden = true;
    this.live = false;
    $('genResult').hidden = true;
    $('genContent').hidden = false;
    this.resetCustomization();
    this.setType('text');
    this.showView('gen');
  }

  /**
   * Restaura a personalização (designer + controles) ao padrão. Usado ao sair de
   * um link compartilhado, para não vazar as opções do link para um novo QR.
   */
  private resetCustomization(): void {
    this.setColor('fg', SHARE_DEFAULTS.fg);
    this.setColor('bg', SHARE_DEFAULTS.bg);
    // Zera as sobrescritas de cor do olho (voltam a herdar `fg`).
    this.designer.colors = { eyeFrame: undefined, eyeCenter: undefined };
    $i('c_ef').value = SHARE_DEFAULTS.fg; $i('c_ef_hex').value = SHARE_DEFAULTS.fg;
    $i('c_ec').value = SHARE_DEFAULTS.fg; $i('c_ec_hex').value = SHARE_DEFAULTS.fg;
    this.setBgTransparent(SHARE_DEFAULTS.bgTransparent);
    this.setShape(SHARE_DEFAULTS.shape);
    this.setEyeFrameShape(SHARE_DEFAULTS.eyeFrame);
    this.setEyeCenterShape(SHARE_DEFAULTS.eyeCenter);
    this.setQrShape(SHARE_DEFAULTS.qrShape);
    this.setFrame(SHARE_DEFAULTS.frame);
    this.setCaption(SHARE_DEFAULTS.caption);
    $i('c_caption').value = SHARE_DEFAULTS.caption;
    this.setPngSize(SHARE_DEFAULTS.size);
    this.removeLogo();
  }

  /* ---------- Leitura ---------- */
  /** Rótulo do que está sendo procurado, conforme o modo do leitor. */
  private modeLabel(): string {
    return this.readMode === 'qr' ? 'QR Code'
      : this.readMode === 'barcode' ? 'código de barras'
        : 'QR Code ou código de barras';
  }

  /** Escolhe o que o leitor procura: automático, só QR ou só código de barras. */
  setReadMode(m: ReadMode): void {
    this.readMode = m;
    document.querySelectorAll('#readModeTabs .ctab').forEach((b) =>
      b.classList.toggle('active', (b as HTMLElement).dataset.readmode === m));
    $('readHint').textContent = this.scanning
      ? `Aponte para um ${this.modeLabel()}.`
      : `Leia ${this.modeLabel()} pela câmera ou de uma imagem do dispositivo.`;
  }

  async toggleCamera(): Promise<void> {
    if (this.scanning) { this.stopCamera(); return; }
    const errEl = $('readErr');
    errEl.textContent = '';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = $('video') as HTMLVideoElement;
      video.srcObject = this.stream;
      await video.play();
      $('scanBox').classList.add('active');
      $('camBtn').textContent = 'Parar câmera';
      $('readHint').textContent = `Aponte para um ${this.modeLabel()}.`;
      this.scanning = true;
      this.scanLoop();
    } catch (e) {
      errEl.textContent = 'Não foi possível acessar a câmera: ' + ((e as Error).message || e);
      this.stopCamera();
    }
  }

  private async scanLoop(): Promise<void> {
    if (!this.scanning) return;
    const video = $('video') as HTMLVideoElement;
    try {
      if (video.readyState >= 2) {
        const value = await this.reader.decode(video, video.videoWidth, video.videoHeight, { mode: this.readMode });
        if (value != null) { this.showResult(value); this.stopCamera(); return; }
      }
    } catch { /* ignora frames com erro */ }
    requestAnimationFrame(() => this.scanLoop());
  }

  private stopCamera(): void {
    this.scanning = false;
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
    const video = document.getElementById('video') as HTMLVideoElement | null;
    if (video) video.srcObject = null;
    document.getElementById('scanBox')?.classList.remove('active');
    const btn = document.getElementById('camBtn');
    if (btn) btn.textContent = 'Escanear com a câmera';
  }

  async readFromFile(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    input.value = '';
    if (file) await this.decodeFile(file);
  }

  /**
   * Decodifica uma imagem (arquivo) e mostra o resultado. Reutilizado pelo
   * seletor de arquivo, pelos `file_handlers` (abrir imagem) e pelo
   * `share_target` (compartilhar imagem para o app).
   */
  async decodeFile(file: File): Promise<void> {
    const errEl = $('readErr');
    errEl.textContent = '';
    try {
      const bmp = await createImageBitmap(file);
      const value = await this.reader.decode(bmp, bmp.width, bmp.height, { mode: this.readMode, thorough: true });
      if (value != null) this.showResult(value);
      else { this.hideResult(); errEl.textContent = `Nenhum ${this.modeLabel()} encontrado na imagem.`; }
    } catch (e) {
      // Falha ao carregar/ler a imagem: descarta o resultado anterior para não
      // deixar um valor obsoleto de outra leitura na tela.
      this.hideResult();
      errEl.textContent = 'Falha ao ler a imagem: ' + ((e as Error).message || e);
    }
  }

  private showResult(text: string): void {
    const card = $('resultCard');
    card.style.display = 'block';
    renderDecoded($('resultDetail'), text);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    toast('QR Code lido!');
  }

  /** Oculta o card de resultado (usado quando uma nova leitura falha). */
  private hideResult(): void {
    const card = $('resultCard');
    card.style.display = 'none';
    $('resultDetail').innerHTML = '';
  }

  /* ---------- Localização / mapa ---------- */
  private geoSet(lat: number, lng: number): void {
    $i('f_geolat').value = Number(lat).toFixed(6);
    $i('f_geolng').value = Number(lng).toFixed(6);
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) { toast('Geolocalização indisponível'); return; }
    toast('Obtendo localização…');
    navigator.geolocation.getCurrentPosition((pos) => {
      this.geoSet(pos.coords.latitude, pos.coords.longitude);
      if (this.map) { this.map.lat = pos.coords.latitude; this.map.lng = pos.coords.longitude; this.map.z = 16; this.drawMap(); }
      toast('Localização obtida');
    }, () => toast('Não foi possível obter a localização'),
      { enableHighAccuracy: true, timeout: 10000 });
  }

  loadMap(): void {
    $('mapConsent').hidden = true;
    const wrap = $('mapWrap');
    wrap.hidden = false;
    $('mapSearch').hidden = false;
    $('mapHint').hidden = false;
    $i('f_geoquery').addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') { e.preventDefault(); this.searchAddress(); }
    });

    const lat = parseFloat(val('f_geolat'));
    const lng = parseFloat(val('f_geolng'));
    const has = !isNaN(lat) && !isNaN(lng);
    this.map = { lat: has ? lat : -14.24, lng: has ? lng : -51.93, z: has ? 15 : 4,
      W: wrap.clientWidth, H: wrap.clientHeight };
    this.geoSet(this.map.lat, this.map.lng);
    this.drawMap();
    if (!this.mapBound) { this.bindMapDrag(wrap); this.mapBound = true; }
  }

  private drawMap(): void {
    if (!this.map) return;
    const wrap = $('mapWrap');
    this.map.W = wrap.clientWidth; this.map.H = wrap.clientHeight;
    const { lat, lng, z, W, H } = this.map;
    const n = Math.pow(2, z);
    const cx = lon2tile(lng, z), cy = lat2tile(lat, z);
    const frag = document.createDocumentFragment();
    const minI = Math.floor(cx - W / 2 / 256) - 1, maxI = Math.floor(cx + W / 2 / 256) + 1;
    const minJ = Math.floor(cy - H / 2 / 256) - 1, maxJ = Math.floor(cy + H / 2 / 256) + 1;
    for (let i = minI; i <= maxI; i++) {
      for (let j = minJ; j <= maxJ; j++) {
        if (j < 0 || j >= n) continue;
        const img = new Image();
        img.src = 'https://tile.openstreetmap.org/' + z + '/' + (((i % n) + n) % n) + '/' + j + '.png';
        img.style.left = Math.round((i - cx) * 256 + W / 2) + 'px';
        img.style.top = Math.round((j - cy) * 256 + H / 2) + 'px';
        frag.append(img);
      }
    }
    const tiles = $('mapTiles');
    tiles.innerHTML = '';
    tiles.append(frag);
    this.geoSet(lat, lng);
  }

  private bindMapDrag(wrap: HTMLElement): void {
    let dragging = false, lastX = 0, lastY = 0;
    wrap.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      wrap.classList.add('dragging'); wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!dragging || !this.map) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      const z = this.map.z;
      this.map.lng = tile2lon(lon2tile(this.map.lng, z) - dx / 256, z);
      this.map.lat = tile2lat(lat2tile(this.map.lat, z) - dy / 256, z);
      this.drawMap();
    });
    const end = (): void => { dragging = false; wrap.classList.remove('dragging'); };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('wheel', (e) => { e.preventDefault(); this.mapZoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  }

  mapZoom(delta: number): void {
    if (!this.map) return;
    this.map.z = Math.max(2, Math.min(19, this.map.z + delta));
    this.drawMap();
  }

  async searchAddress(): Promise<void> {
    if (!this.map) return;
    const q = val('f_geoquery').trim();
    if (!q) return;
    toast('Buscando endereço…');
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(q);
      const resp = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!resp.ok) throw new Error('http ' + resp.status);
      const data = await resp.json() as Array<{ lat: string; lon: string }>;
      if (!data.length) { toast('Endereço não encontrado'); return; }
      this.map.lat = parseFloat(data[0].lat);
      this.map.lng = parseFloat(data[0].lon);
      this.map.z = 16;
      this.drawMap();
      toast('Local encontrado');
    } catch { toast('Falha na busca de endereço'); }
  }

  /* ---------- Instalação (PWA) ---------- */
  private showInstall(mode: 'ios' | 'android'): void {
    if (isStandalone()) return;
    try { if (localStorage.getItem('installDismissed')) return; } catch { /* ignore */ }
    const text = $('installText');
    const btn = $('installBtn');
    if (mode === 'ios') {
      btn.hidden = true;
      text.innerHTML = '<strong>Instalar o QR Utils</strong>Toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.';
    } else {
      btn.hidden = false;
      text.innerHTML = '<strong>Instalar o QR Utils</strong>Use como um app, direto na tela inicial.';
    }
    $('installBar').hidden = false;
  }

  dismissInstall(): void {
    $('installBar').hidden = true;
    try { localStorage.setItem('installDismissed', '1'); } catch { /* ignore */ }
  }

  async installApp(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    if (outcome === 'accepted') $('installBar').hidden = true;
  }

  promptInstall(): void {
    if (this.deferredPrompt) { this.installApp(); return; }
    if (isIOS) { toast('No Safari: Compartilhar → Adicionar à Tela de Início'); return; }
    toast('Abra o menu do navegador e escolha "Instalar app".');
  }

  /* ---------- Inicialização ---------- */
  init(): void {
    this.exposeHandlers();
    this.registerEvents();
    this.buildShapeControls();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
      });
    }

    if (isIOS && !isStandalone()) this.showInstall('ios');

    if (isStandalone()) {
      $('aboutInstallCard').hidden = true;
    } else if (isIOS) {
      $('aboutInstallHint').textContent =
        'No iPhone/iPad: toque em Compartilhar e depois em "Adicionar à Tela de Início".';
    }

    $('readHint').textContent = 'Leia QR Code ou código de barras pela câmera ou de uma imagem do dispositivo.';

    attachMask('f_tel', maskPhoneBR);
    attachMask('f_smsnum', maskPhoneBR);
    attachMask('f_vctel', maskPhoneBR);
    attachMask('f_wanum', maskPhoneWa);

    // O conteúdo e o nível de correção são fixados ao clicar em "Gerar"; a partir
    // daí (etapa 2) só a personalização muda, redesenhando o QR ao vivo.

    this.handleLaunch();
    this.initShared();
  }

  /**
   * Trata os modos de abertura do PWA:
   * - atalhos (`?view=read|gen|about`) abrem a aba correspondente;
   * - `file_handlers` (abrir uma imagem no app) via `launchQueue`;
   * - `share_target` (imagem compartilhada de outro app) via `?share-target=1`,
   *   com o arquivo guardado pelo service worker.
   */
  private handleLaunch(): void {
    const params = new URLSearchParams(location.search);

    const view = params.get('view');
    if (view && ['gen', 'read', 'about'].includes(view)) this.showView(view);

    if (params.has('share-target')) {
      history.replaceState(null, '', location.pathname);
      this.showView('read');
      void this.consumeSharedImage();
    }

    const lq = (window as unknown as { launchQueue?: LaunchQueue }).launchQueue;
    lq?.setConsumer((p) => {
      const handle = p.files && p.files[0];
      if (!handle) return;
      this.showView('read');
      void (async () => { await this.decodeFile(await handle.getFile()); })();
    });
  }

  /** Lê a imagem que o service worker guardou ao receber um compartilhamento. */
  private async consumeSharedImage(): Promise<void> {
    try {
      const cache = await caches.open('qr-utils-share');
      const resp = await cache.match('shared-image');
      if (!resp) return;
      await cache.delete('shared-image');
      const blob = await resp.blob();
      await this.decodeFile(new File([blob], 'compartilhado', { type: blob.type }));
    } catch { /* sem imagem/sem cache → ignora */ }
  }

  private registerEvents(): void {
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeModal(); });

    window.addEventListener('hashchange', () => {
      let sp: ShareParams | null;
      try { sp = this.getSharedParams(); } catch { sp = null; }
      if (sp) {
        this.renderShared(sp);
      } else if ($('view-share').classList.contains('active')) {
        (document.querySelector('.tabs') as HTMLElement).hidden = false;
        this.resetCustomization();
        this.showView('gen');
      }
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as unknown as App['deferredPrompt'];
      this.showInstall('android');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      $('installBar').hidden = true;
    });
  }

  /** Expõe ao `window` os handlers usados pelos atributos onclick do HTML. */
  private exposeHandlers(): void {
    const w = window as unknown as Record<string, unknown>;
    w.showView = (v: string) => this.showView(v);
    w.setType = (t: string) => this.setType(t);
    w.toggleWifiPass = () => this.toggleWifiPass();
    w.showFormatted = () => this.showFormatted();
    w.doGenerate = () => this.doGenerate();
    w.openModal = () => this.openModal();
    w.closeModal = () => this.closeModal();
    w.downloadPNG = () => this.downloadPNG();
    w.downloadSVG = () => this.downloadSVG();
    w.shareQR = () => this.shareQR();
    w.shareLink = () => this.shareLink();
    w.toggleCamera = () => this.toggleCamera();
    w.setReadMode = (m: ReadMode) => this.setReadMode(m);
    w.readFromFile = (ev: Event) => this.readFromFile(ev);
    w.installApp = () => this.installApp();
    w.dismissInstall = () => this.dismissInstall();
    w.promptInstall = () => this.promptInstall();
    w.exitShared = () => this.exitShared();
    w.backToContent = () => this.backToContent();
    w.useCurrentLocation = () => this.useCurrentLocation();
    w.loadMap = () => this.loadMap();
    w.mapZoom = (d: number) => this.mapZoom(d);
    w.searchAddress = () => this.searchAddress();
    w.setCustomTab = (n: string) => this.setCustomTab(n);
    w.setColor = (which: 'fg' | 'bg', v: string) => this.setColor(which, v);
    w.setHex = (which: 'fg' | 'bg', v: string) => this.setHex(which, v);
    w.setEyeColor = (which: 'frame' | 'center', v: string) => this.setEyeColor(which, v);
    w.setEyeHex = (which: 'frame' | 'center', v: string) => this.setEyeHex(which, v);
    w.setBgTransparent = (on: boolean) => this.setBgTransparent(on);
    w.applyPreset = (fg: string, bg: string) => this.applyPreset(fg, bg);
    w.setShape = (v: ModuleShape) => this.setShape(v);
    w.setQrShape = (v: ShapeType) => this.setQrShape(v);
    w.setFrame = (v: FrameStyle) => this.setFrame(v);
    w.setCaption = (v: string) => this.setCaption(v);
    w.onLogo = (ev: Event) => this.onLogo(ev);
    w.removeLogo = () => this.removeLogo();
    w.setPngSize = (px: number) => this.setPngSize(px);
  }
}
