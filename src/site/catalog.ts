/*
 * Catálogo do site — fonte única de verdade para os tipos de QR, as páginas
 * geradas no build (uma por tipo principal + leitor + "mais tipos"), os cards
 * da home, o sitemap e os dados estruturados. Adicionar uma página = mais uma
 * entrada aqui (e o arquivo de campos em src/templates/fields/<tipo>.html).
 * Puro: sem DOM, usado tanto pelo build (Node) quanto pelo app (navegador).
 */

/** Origem pública do site (canonical, sitemap, Open Graph). */
export const SITE_URL = 'https://qr.tools.grviana.com.br';
export const SITE_NAME = 'QR Utils';

/** Um tipo de conteúdo que o gerador sabe montar (ver App.buildContent). */
export interface QrType {
  /** Id usado no app (`data-type`, `buildContent`). */
  id: string;
  /** Rótulo curto (card, seletor). */
  label: string;
  /** Uma linha para o card. */
  desc: string;
  /** Nome do ícone (./icons). */
  icon: string;
}

/** Pergunta frequente exibida na página e no JSON-LD `FAQPage`. */
export interface Faq { q: string; a: string }

/** Página gerada no build. */
export interface SitePage {
  /** Caminho público, com barra final (`/wifi/`). A home é `/`. */
  path: string;
  /** Qual template de corpo usar. */
  kind: 'home' | 'gen' | 'read' | 'privacy';
  /** Tipo fixo da página de gerador (ausente em `/mais/`, que tem seletor). */
  type?: string;
  /** Tipos oferecidos no seletor (só `/mais/`). */
  types?: string[];
  /** `<title>` (até ~60 caracteres). */
  title: string;
  /** `meta description` (até ~155 caracteres). */
  description: string;
  /** Rótulo curto (breadcrumb, menu). */
  label: string;
  h1: string;
  /** Parágrafo de abertura, visível. */
  intro: string;
  /** Passo a passo "Como fazer", visível. */
  steps?: string[];
  faq?: Faq[];
}

/** Todos os tipos, na ordem de exibição. */
export const TYPES: QrType[] = [
  { id: 'link', label: 'Link', desc: 'Abre um site ou página ao escanear.', icon: 'link' },
  { id: 'wifi', label: 'Wi-Fi', desc: 'Conecta à rede sem digitar a senha.', icon: 'wifi' },
  { id: 'whatsapp', label: 'WhatsApp', desc: 'Abre uma conversa com mensagem pronta.', icon: 'whatsapp' },
  { id: 'text', label: 'Texto', desc: 'Mostra qualquer texto ou recado.', icon: 'text' },
  { id: 'vcard', label: 'Contato', desc: 'Salva nome, telefone e e-mail na agenda.', icon: 'vcard' },
  { id: 'email', label: 'E-mail', desc: 'Inicia um e-mail com assunto e mensagem.', icon: 'email' },
  { id: 'tel', label: 'Telefone', desc: 'Liga para um número com um toque.', icon: 'tel' },
  { id: 'instagram', label: 'Instagram', desc: 'Leva direto ao seu perfil.', icon: 'instagram' },
  { id: 'sms', label: 'SMS', desc: 'Envia um SMS com texto pronto.', icon: 'sms' },
  { id: 'geo', label: 'Local', desc: 'Abre um ponto no mapa.', icon: 'geo' },
  { id: 'event', label: 'Evento', desc: 'Adiciona um evento à agenda.', icon: 'event' },
  { id: 'facebook', label: 'Facebook', desc: 'Leva à sua página ou perfil.', icon: 'facebook' },
  { id: 'telegram', label: 'Telegram', desc: 'Abre seu perfil ou canal.', icon: 'telegram' },
  { id: 'youtube', label: 'YouTube', desc: 'Leva ao seu canal.', icon: 'youtube' },
  { id: 'tiktok', label: 'TikTok', desc: 'Leva ao seu perfil.', icon: 'tiktok' },
  { id: 'x', label: 'X', desc: 'Leva ao seu perfil no X (Twitter).', icon: 'x' },
  { id: 'linkedin', label: 'LinkedIn', desc: 'Leva ao seu perfil profissional.', icon: 'linkedin' },
  { id: 'paypal', label: 'PayPal', desc: 'Link PayPal.me com valor opcional.', icon: 'paypal' },
  { id: 'mecard', label: 'MeCard', desc: 'Contato compacto (QR menor).', icon: 'mecard' },
  { id: 'app', label: 'App / Loja', desc: 'Leva ao app na Play Store ou App Store.', icon: 'app' },
  { id: 'zoom', label: 'Zoom', desc: 'Entra numa reunião do Zoom.', icon: 'zoom' },
];

export const typeById = (id: string): QrType | undefined => TYPES.find((t) => t.id === id);

/* ------------------------------------------------------------------ */
/* Páginas                                                             */
/* ------------------------------------------------------------------ */

/** Passos comuns a todo gerador (o 1º muda por tipo). */
const commonSteps = (first: string): string[] => [
  first,
  'Toque em "Gerar QR Code". Se quiser, personalize cores, formas, logo e moldura.',
  'Baixe em PNG ou SVG, ou compartilhe a imagem. Tudo acontece no seu navegador.',
];

/** Pergunta de privacidade, comum às páginas de gerador. */
const FAQ_PRIVACY: Faq = {
  q: 'O que eu digito é enviado para algum servidor?',
  a: 'Não. O QR Code é gerado no seu navegador; nenhum conteúdo sai do seu dispositivo. Não há cadastro, cookies nem rastreadores.',
};
/** Pergunta de validade, comum às páginas de gerador. */
const FAQ_FOREVER: Faq = {
  q: 'O QR Code expira?',
  a: 'Não. O código contém o dado final (não passa por um redirecionador), então continua funcionando para sempre, mesmo impresso.',
};

/** Tipos com página própria, na ordem dos cards da home. */
export const MAIN_TYPES = ['link', 'wifi', 'whatsapp', 'text', 'vcard', 'email', 'tel', 'instagram'];

/** Página de gerador por tipo principal. */
const GEN_PAGES: Record<string, Omit<SitePage, 'kind' | 'type'>> = {
  link: {
    path: '/link/', label: 'Link',
    title: 'Gerar QR Code de link (URL) grátis | QR Utils',
    description: 'Crie um QR Code que abre um site ou link. Grátis, sem cadastro e sem expirar: o código é gerado no seu navegador. Baixe em PNG ou SVG.',
    h1: 'QR Code de link',
    intro: 'Cole o endereço de um site, cardápio, formulário ou arquivo e gere um QR Code que abre esse link ao ser escaneado.',
    steps: commonSteps('Cole o endereço (ex.: meusite.com.br). O "https://" é adicionado sozinho.'),
    faq: [
      { q: 'Posso mudar o link depois de imprimir?', a: 'Não: o QR Code contém o próprio link. Para mudar o destino, gere um novo código. Em troca, ele nunca expira nem depende de um serviço de terceiros.' },
      FAQ_PRIVACY,
    ],
  },
  wifi: {
    path: '/wifi/', label: 'Wi-Fi',
    title: 'QR Code de Wi-Fi grátis: conecte sem digitar a senha | QR Utils',
    description: 'Gere um QR Code da sua rede Wi-Fi para visitas e clientes conectarem sem digitar a senha. A senha não sai do seu navegador.',
    h1: 'QR Code de Wi-Fi',
    intro: 'Informe o nome da rede e a senha e gere um QR Code que conecta o celular ao Wi-Fi automaticamente. Ideal para casa, escritório, restaurante e hotel.',
    steps: commonSteps('Digite o nome da rede (SSID), a senha e o tipo de segurança (normalmente WPA/WPA2).'),
    faq: [
      { q: 'A minha senha fica salva em algum lugar?', a: 'Não. O QR Code é montado no seu navegador e a senha não é enviada a nenhum servidor.' },
      { q: 'Funciona no iPhone e no Android?', a: 'Sim. A câmera do iPhone (iOS 11+) e a maioria dos Android reconhecem QR Codes de Wi-Fi e oferecem conectar à rede.' },
      { q: 'E se a rede for oculta?', a: 'Marque a opção "Rede oculta" para que o celular procure a rede pelo nome.' },
    ],
  },
  whatsapp: {
    path: '/whatsapp/', label: 'WhatsApp',
    title: 'QR Code do WhatsApp com mensagem pronta grátis | QR Utils',
    description: 'Crie um QR Code que abre uma conversa no WhatsApp com o seu número e uma mensagem já escrita. Grátis, sem cadastro e sem expirar.',
    h1: 'QR Code do WhatsApp',
    intro: 'Coloque o QR Code no balcão, cardápio ou cartão de visita e receba mensagens no WhatsApp sem que o cliente precise salvar o seu número.',
    steps: commonSteps('Digite o número com DDD (e o código do país, se não for do Brasil) e, se quiser, uma mensagem inicial.'),
    faq: [
      { q: 'Preciso do código do país?', a: 'Sim. Digite o código do país antes do DDD (55 para o Brasil, ex.: 55 11 99999-9999); sem ele o WhatsApp pode não encontrar o número.' },
      { q: 'A mensagem é enviada sozinha?', a: 'Não. A conversa abre com o texto já digitado e a pessoa decide se envia.' },
      FAQ_FOREVER,
    ],
  },
  text: {
    path: '/texto/', label: 'Texto',
    title: 'Gerar QR Code de texto grátis | QR Utils',
    description: 'Transforme qualquer texto, recado ou código em QR Code. Funciona offline, sem cadastro e sem enviar nada a servidores.',
    h1: 'QR Code de texto',
    intro: 'Escreva uma mensagem, instrução, número de série ou qualquer texto. Quem escanear vê o texto na tela, sem precisar de internet.',
    steps: commonSteps('Digite ou cole o texto.'),
    faq: [
      { q: 'Qual o tamanho máximo do texto?', a: 'Um QR Code guarda até cerca de 2.900 caracteres, mas textos curtos geram códigos menores e mais fáceis de ler.' },
      FAQ_PRIVACY,
    ],
  },
  vcard: {
    path: '/contato/', label: 'Contato',
    title: 'QR Code de contato (vCard) para cartão de visita | QR Utils',
    description: 'Gere um QR Code de contato (vCard) que salva nome, telefone, e-mail, empresa e site na agenda de quem escanear. Grátis e privado.',
    h1: 'QR Code de contato (vCard)',
    intro: 'Coloque no cartão de visita, crachá ou assinatura: quem escanear salva o seu contato com um toque, sem digitar nada.',
    steps: commonSteps('Preencha nome e os dados que quiser compartilhar: telefone, e-mail, empresa, cargo e site.'),
    faq: [
      { q: 'O que é vCard?', a: 'É o formato padrão de cartão de contato, reconhecido pela agenda do iPhone e do Android.' },
      { q: 'Posso colocar foto?', a: 'Não. Fotos deixariam o QR Code grande demais para ser lido com facilidade.' },
      FAQ_PRIVACY,
    ],
  },
  email: {
    path: '/email/', label: 'E-mail',
    title: 'Gerar QR Code de e-mail grátis | QR Utils',
    description: 'Crie um QR Code que abre um e-mail pronto, com destinatário, assunto e mensagem. Grátis, sem cadastro e sem expirar.',
    h1: 'QR Code de e-mail',
    intro: 'Facilite o contato, pedidos de orçamento ou inscrições: quem escanear abre o app de e-mail com tudo preenchido.',
    steps: commonSteps('Informe o e-mail de destino e, se quiser, o assunto e a mensagem.'),
    faq: [
      { q: 'O e-mail é enviado automaticamente?', a: 'Não. O app de e-mail abre com o rascunho e a pessoa decide se envia.' },
      FAQ_PRIVACY,
    ],
  },
  tel: {
    path: '/telefone/', label: 'Telefone',
    title: 'Gerar QR Code de telefone para ligar | QR Utils',
    description: 'Crie um QR Code que liga para um número com um toque. Ideal para cartazes, vitrines e cartões. Grátis e gerado no seu navegador.',
    h1: 'QR Code de telefone',
    intro: 'Quem escanear abre o discador com o seu número já digitado — basta tocar para ligar.',
    steps: commonSteps('Digite o número com DDD.'),
    faq: [FAQ_FOREVER, FAQ_PRIVACY],
  },
  instagram: {
    path: '/instagram/', label: 'Instagram',
    title: 'QR Code do Instagram para o seu perfil | QR Utils',
    description: 'Gere um QR Code que leva direto ao seu perfil do Instagram, com cores e logo. Grátis, sem cadastro e sem expirar.',
    h1: 'QR Code do Instagram',
    intro: 'Ganhe seguidores no ponto de venda, em embalagens e eventos: o QR Code abre o seu perfil no app do Instagram.',
    steps: commonSteps('Digite o seu @usuário ou cole o link do perfil.'),
    faq: [
      { q: 'Posso colocar o logo do Instagram no centro?', a: 'Sim. Em Personalizar → Logo, escolha o logo pronto do Instagram (colorido ou nas cores do QR).' },
      FAQ_FOREVER,
    ],
  },
};

/** Tipos da página "Mais tipos" (os que não têm página própria). */
export const MORE_TYPES = TYPES.map((t) => t.id).filter((id) => !MAIN_TYPES.includes(id));

export const PAGES: SitePage[] = [
  {
    path: '/', kind: 'home', label: 'Início',
    title: 'Gerador de QR Code grátis, privado e sem cadastro | QR Utils',
    description: 'Crie QR Code de link, Wi-Fi, WhatsApp, contato, Instagram e mais — com cores e logo. Grátis, sem cadastro e 100% no seu navegador. Também lê QR Code.',
    h1: 'Gerador de QR Code grátis e privado',
    intro: 'Escolha o tipo de QR Code. Tudo é gerado no seu navegador: nada do que você digita sai do seu dispositivo.',
  },
  ...MAIN_TYPES.map((id): SitePage => ({ ...GEN_PAGES[id], kind: 'gen', type: id })),
  {
    path: '/mais/', kind: 'gen', label: 'Mais tipos', types: MORE_TYPES,
    title: 'QR Code de SMS, evento, local, redes sociais e mais | QR Utils',
    description: 'Gere QR Code de SMS, localização, evento, Facebook, Telegram, YouTube, TikTok, X, LinkedIn, PayPal, MeCard, app e Zoom. Grátis e privado.',
    h1: 'Mais tipos de QR Code',
    intro: 'Escolha o tipo abaixo: SMS, localização, evento, redes sociais, PayPal, apps e reuniões do Zoom.',
    steps: commonSteps('Escolha o tipo e preencha os campos.'),
    faq: [FAQ_FOREVER, FAQ_PRIVACY],
  },
  {
    path: '/ler/', kind: 'read', label: 'Ler QR Code',
    title: 'Ler QR Code e código de barras online pela câmera ou imagem | QR Utils',
    description: 'Leia QR Code e código de barras pela câmera ou a partir de uma imagem/print, no celular ou no computador. Confira Pix antes de pagar. Nada é enviado.',
    h1: 'Ler QR Code e código de barras',
    intro: 'Use a câmera ou escolha uma imagem (inclusive um print). O conteúdo aparece interpretado — link, Wi-Fi, contato, Pix — e a leitura acontece no seu dispositivo.',
    faq: [
      { q: 'Consigo ler um QR Code de um print ou foto?', a: 'Sim. Toque em "Ler de uma imagem" e escolha o arquivo. Funciona também no computador, sem câmera.' },
      { q: 'Dá para conferir um Pix antes de pagar?', a: 'Sim. O leitor mostra recebedor, chave, valor e cidade do Pix e verifica se o código está íntegro (CRC).' },
      { q: 'Quais códigos de barras são lidos?', a: 'EAN-13, EAN-8, UPC, Code 128, Code 39, ITF, Codabar, GS1 DataBar, Data Matrix, PDF417, Aztec e outros — 30 formatos no total.' },
    ],
  },
  {
    path: '/privacidade/', kind: 'privacy', label: 'Privacidade',
    title: 'Privacidade | QR Utils',
    description: 'Como o QR Utils funciona sem coletar dados: processamento local, sem cookies nem rastreadores, e a única exceção opcional (mapa).',
    h1: 'Privacidade',
    intro: 'Feito para funcionar sem coletar seus dados. Aqui está exatamente o que acontece.',
  },
];

/** URL absoluta de uma página. */
export const pageUrl = (p: Pick<SitePage, 'path'>): string => SITE_URL + p.path;

/** Página do gerador de um tipo (própria ou `/mais/?tipo=`). */
export function typeHref(id: string): string {
  const own = PAGES.find((p) => p.kind === 'gen' && p.type === id);
  return own ? own.path : '/mais/?tipo=' + id;
}
