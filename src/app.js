import { encode } from './qrcode.js';
import { decodeFrom } from './reader.js';

/* =====================================================================
   UI + estado
   ===================================================================== */
let lastQR = null;
let lastText = '';

function showView(v) {
  ['gen', 'read', 'about', 'privacy', 'share'].forEach((name) => {
    document.getElementById('view-' + name).classList.toggle('active', v === name);
  });
  document.querySelector('.tabs').hidden = false; // garante navegação visível fora do modo compartilhado
  document.getElementById('tabGen').classList.toggle('active', v === 'gen');
  document.getElementById('tabRead').classList.toggle('active', v === 'read');
  document.getElementById('tabAbout').classList.toggle('active', v === 'about');
  if (v !== 'read') stopCamera();
  const m = document.querySelector('main');
  if (m) m.scrollTop = 0;
}

let currentType = 'text';

function setType(t) {
  currentType = t;
  document.querySelectorAll('#typeChips .chip').forEach(c =>
    c.classList.toggle('active', c.dataset.type === t));
  document.querySelectorAll('.fgroup').forEach(g =>
    g.hidden = g.dataset.fields !== t);
  document.getElementById('genPreview').hidden = true;
  document.getElementById('genErr').textContent = '';
}

function toggleWifiPass() {
  const open = document.getElementById('f_sec').value === 'nopass';
  document.getElementById('f_pass').disabled = open;
  document.getElementById('f_pass').style.opacity = open ? .5 : 1;
}

const val = (id) => document.getElementById(id).value;
// Escapa caracteres especiais do formato Wi-Fi (\ ; , " :)
const escWifi = (s) => s.replace(/([\\;,":])/g, '\\$1');

// Monta a string final a partir dos campos do tipo atual
function buildContent() {
  switch (currentType) {
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
      if (document.getElementById('f_hidden').checked) s += 'H:true;';
      return s + ';';
    }
    case 'email': {
      const to = val('f_email').trim();
      if (!to) return '';
      const q = [];
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
  }
  return '';
}

function showFormatted() {
  const errEl = document.getElementById('genErr');
  errEl.textContent = '';
  const text = buildContent();
  const pv = document.getElementById('genPreview');
  if (!text.trim()) {
    pv.hidden = true;
    errEl.textContent = 'Preencha os campos primeiro.';
    return;
  }
  document.getElementById('genPreviewText').textContent = text;
  pv.hidden = false;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------- Gerar ---------- */
function doGenerate() {
  const errEl = document.getElementById('genErr');
  errEl.textContent = '';
  const text = buildContent();
  if (!text.trim()) { errEl.textContent = 'Preencha os campos primeiro.'; return; }

  try {
    const ecl = document.getElementById('genEcl').value;
    lastText = text;
    lastQR = encode(text, ecl);
    renderQR(lastQR, parseInt(document.getElementById('genScale').value, 10));
    document.getElementById('qrCard').style.display = 'block';
    document.getElementById('qrMeta').textContent =
      `Versão ${lastQR.version} · correção ${lastQR.ecl} · ${lastQR.size}×${lastQR.size} módulos`;
    document.getElementById('qrCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) {
    errEl.textContent = e.message || String(e);
  }
}

// Desenha a matriz do QR em qualquer canvas
function drawMatrix(cv, qr, scale) {
  const border = 4; // quiet zone
  const dim = (qr.size + border * 2) * scale;
  cv.width = dim; cv.height = dim;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, dim, dim);
  ctx.fillStyle = '#000000';
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x])
        ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
    }
  }
}

function renderQR(qr, scale) {
  drawMatrix(document.getElementById('qrCanvas'), qr, scale);
}

// Canvas em alta resolução (independente do tamanho exibido) para baixar/compartilhar
function exportCanvas() {
  const scale = Math.max(4, Math.floor(1200 / (lastQR.size + 8)));
  const cv = document.createElement('canvas');
  drawMatrix(cv, lastQR, scale);
  return cv;
}

/* ---- Modal (QR ampliado) ---- */
function openModal() {
  if (!lastQR) return;
  const maxPx = Math.min(window.innerWidth * 0.82, window.innerHeight * 0.6, 560);
  const scale = Math.max(3, Math.floor(maxPx / (lastQR.size + 8)));
  drawMatrix(document.getElementById('qrCanvasBig'), lastQR, scale);
  document.getElementById('qrModalMeta').textContent = document.getElementById('qrMeta').textContent;
  document.getElementById('qrModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('qrModal').hidden = true;
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function downloadPNG() {
  if (!lastQR) return;
  const a = document.createElement('a');
  a.download = 'qrcode.png';
  a.href = exportCanvas().toDataURL('image/png');
  a.click();
}

async function shareQR() {
  if (!lastQR) return;
  const cv = exportCanvas();
  if (!navigator.canShare) { downloadPNG(); return; }
  try {
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const file = new File([blob], 'qrcode.png', { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'QR Code' });
    } else {
      downloadPNG();
    }
  } catch (e) { /* usuário cancelou */ }
}

/* ---------- Link compartilhável (conteúdo no fragmento #, que não vai ao servidor) ---------- */
function buildShareURL(text) {
  return location.origin + location.pathname + '#q=' + encodeURIComponent(text);
}

async function shareLink() {
  if (!lastText) return;
  const url = buildShareURL(lastText);
  if (navigator.share) {
    try { await navigator.share({ url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; /* senão cai para cópia */ }
  }
  try { await navigator.clipboard.writeText(url); toast('Link copiado!'); }
  catch (e) { toast('Não foi possível copiar'); }
}

/* ---------- Visualização de link compartilhado ---------- */
// Prefere o fragmento (#q=), que não é enviado ao servidor; aceita ?q= também.
function getSharedText() {
  if (location.hash.startsWith('#q=')) return decodeURIComponent(location.hash.slice(3));
  const qp = new URLSearchParams(location.search).get('q');
  return qp != null ? qp : null;
}

function renderShared(text) {
  try {
    lastText = text;
    lastQR = encode(text, 'MEDIUM');
  } catch (e) { return false; } // conteúdo inválido/grande demais → segue app normal

  const maxPx = Math.min(window.innerWidth * 0.8, 340);
  const scale = Math.max(2, Math.floor(maxPx / (lastQR.size + 8)));
  drawMatrix(document.getElementById('shareCanvas'), lastQR, scale);
  document.getElementById('shareContent').textContent = text;
  const isLink = /^(https?:|mailto:|tel:|sms:|geo:|wifi:)/i.test(text.trim());
  document.getElementById('shareOpenBtn').style.display = isLink ? '' : 'none';
  // Sem "Abrir link" → "Copiar" ocupa a largura toda.
  document.getElementById('shareActions').style.gridTemplateColumns = isLink ? '' : '1fr';

  document.querySelector('.tabs').hidden = true;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('active'));
  ['gen', 'read', 'about', 'privacy'].forEach((n) =>
    document.getElementById('view-' + n).classList.remove('active'));
  document.getElementById('view-share').classList.add('active');
  const m = document.querySelector('main');
  if (m) m.scrollTop = 0;
  return true;
}

function initShared() {
  let text;
  try { text = getSharedText(); } catch (e) { text = null; }
  if (text) renderShared(text);
}

// A página não recarrega quando só o "#" muda (ex.: colar outro link com a aba aberta),
// então reagimos ao hashchange para renderizar o link compartilhado na hora.
window.addEventListener('hashchange', () => {
  let text;
  try { text = getSharedText(); } catch (e) { text = null; }
  if (text) {
    renderShared(text);
  } else if (document.getElementById('view-share').classList.contains('active')) {
    document.querySelector('.tabs').hidden = false;
    showView('gen');
  }
});

function copyShared() {
  navigator.clipboard.writeText(lastText).then(
    () => toast('Copiado!'), () => toast('Não foi possível copiar'));
}

function openShared() {
  if (lastText) window.open(lastText, '_blank', 'noopener');
}

function exitShared() {
  history.replaceState(null, '', location.pathname); // remove o #q= da URL
  document.getElementById('view-share').classList.remove('active');
  document.querySelector('.tabs').hidden = false;
  // Começa do zero: limpa campos, checkbox e o QR anterior.
  document.querySelectorAll('#view-gen input[type="text"], #view-gen textarea')
    .forEach((el) => { el.value = ''; });
  document.getElementById('f_hidden').checked = false;
  document.getElementById('qrCard').style.display = 'none';
  setType('text');
  showView('gen');
}

/* ---------- Ler ---------- */
let stream = null, scanning = false;

async function toggleCamera() {
  if (scanning) { stopCamera(); return; }
  const errEl = document.getElementById('readErr');
  const hintEl = document.getElementById('readHint');
  errEl.textContent = '';

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('video');
    video.srcObject = stream;
    await video.play();
    document.getElementById('scanBox').classList.add('active');
    document.getElementById('camBtn').textContent = 'Parar câmera';
    hintEl.textContent = 'Aponte para um QR Code.';
    scanning = true;
    scanLoop();
  } catch (e) {
    errEl.textContent = 'Não foi possível acessar a câmera: ' + (e.message || e);
    stopCamera();
  }
}

async function scanLoop() {
  if (!scanning) return;
  const video = document.getElementById('video');
  try {
    if (video.readyState >= 2) {
      const value = await decodeFrom(video, video.videoWidth, video.videoHeight);
      if (value != null) { showResult(value); stopCamera(); return; }
    }
  } catch (e) { /* ignora frames com erro */ }
  requestAnimationFrame(scanLoop);
}

function stopCamera() {
  scanning = false;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  const video = document.getElementById('video');
  if (video) video.srcObject = null;
  const box = document.getElementById('scanBox');
  if (box) box.classList.remove('active');
  const btn = document.getElementById('camBtn');
  if (btn) btn.textContent = 'Escanear com a câmera';
}

async function readFromFile(ev) {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  const errEl = document.getElementById('readErr');
  errEl.textContent = '';
  try {
    const bmp = await createImageBitmap(file);
    const value = await decodeFrom(bmp, bmp.width, bmp.height);
    if (value != null) showResult(value);
    else errEl.textContent = 'Nenhum QR Code encontrado na imagem.';
  } catch (e) {
    errEl.textContent = 'Falha ao ler a imagem: ' + (e.message || e);
  }
}

function showResult(text) {
  document.getElementById('resultCard').style.display = 'block';
  document.getElementById('resultText').textContent = text;
  const isLink = /^(https?:|mailto:|tel:|sms:|geo:|wifi:)/i.test(text.trim());
  document.getElementById('openBtn').style.display = isLink ? '' : 'none';
  document.getElementById('resultCard').dataset.value = text;
  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  toast('QR Code lido!');
}

function copyResult() {
  const v = document.getElementById('resultCard').dataset.value || '';
  navigator.clipboard.writeText(v).then(() => toast('Copiado!'),
    () => toast('Não foi possível copiar'));
}

function openResult() {
  const v = document.getElementById('resultCard').dataset.value || '';
  if (v) window.open(v, '_blank', 'noopener');
}

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

/* ---------- Instalação (adicionar à tela inicial) ---------- */
let deferredPrompt = null;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function showInstall(mode) {
  if (isStandalone()) return;
  try { if (localStorage.getItem('installDismissed')) return; } catch (e) {}
  const text = document.getElementById('installText');
  const btn = document.getElementById('installBtn');
  if (mode === 'ios') {
    btn.hidden = true;
    text.innerHTML = '<strong>Instalar o QR Utils</strong>Toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.';
  } else {
    btn.hidden = false;
    text.innerHTML = '<strong>Instalar o QR Utils</strong>Use como um app, direto na tela inicial.';
  }
  document.getElementById('installBar').hidden = false;
}

function dismissInstall() {
  document.getElementById('installBar').hidden = true;
  try { localStorage.setItem('installDismissed', '1'); } catch (e) {}
}

async function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if (outcome === 'accepted') document.getElementById('installBar').hidden = true;
}

// Botão fixo na aba "Sobre": usa o prompt nativo quando há, senão orienta.
function promptInstall() {
  if (deferredPrompt) { installApp(); return; }
  if (isIOS) { toast('No Safari: Compartilhar → Adicionar à Tela de Início'); return; }
  toast('Abra o menu do navegador e escolha "Instalar app".');
}

// Android/Chrome: captura o prompt nativo e mostra nosso botão.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstall('android');
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.getElementById('installBar').hidden = true;
});

// iOS/Safari não dispara beforeinstallprompt → mostra as instruções manuais.
if (isIOS && !isStandalone()) showInstall('ios');

// Aba "Sobre": esconde o card de instalação se já estiver instalado; instrui no iOS.
if (isStandalone()) {
  document.getElementById('aboutInstallCard').hidden = true;
} else if (isIOS) {
  document.getElementById('aboutInstallHint').textContent =
    'No iPhone/iPad: toque em Compartilhar e depois em "Adicionar à Tela de Início".';
}

// Ajusta dica inicial de leitura
document.getElementById('readHint').textContent =
  'Leia pela câmera ou selecionando uma imagem do dispositivo.';

// Se a URL trouxer um QR compartilhado (#q=), abre o modo visualização.
initShared();

/* Expõe os handlers usados pelos atributos onclick do HTML */
Object.assign(window, {
  showView, setType, toggleWifiPass, showFormatted, doGenerate,
  openModal, closeModal, downloadPNG, shareQR, shareLink,
  toggleCamera, readFromFile, copyResult, openResult,
  installApp, dismissInstall, promptInstall,
  copyShared, openShared, exitShared,
});
