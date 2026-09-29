/*
 * Catálogo do site — fonte única de verdade para os tipos de QR, as páginas
 * geradas no build (uma por tipo + home, leitor e privacidade), os cards
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

/** Página gerada no build (uma por tipo, mais home, leitor e privacidade). */
export interface SitePage {
  /** Caminho público, com barra final (`/wifi/`). A home é `/`. */
  path: string;
  /** Qual template de corpo usar. */
  kind: 'home' | 'gen' | 'read' | 'privacy';
  /** Tipo da página de gerador. */
  type?: string;
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

/** Tipos em destaque ("Mais usados") na home; os demais vêm em "Outros tipos". */
export const MAIN_TYPES = ['link', 'wifi', 'whatsapp', 'text', 'vcard', 'email', 'tel', 'instagram'];

/** Página de gerador de cada tipo. */
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
  sms: {
    path: '/sms/', label: 'SMS',
    title: 'Gerar QR Code de SMS com mensagem pronta | QR Utils',
    description: 'Crie um QR Code que abre o app de mensagens com número e texto já preenchidos. Ideal para promoções e cadastros. Grátis e privado.',
    h1: 'QR Code de SMS',
    intro: 'Quem escanear abre o SMS com o número e a mensagem prontos — útil para inscrições por palavra-chave, promoções e atendimento.',
    steps: commonSteps('Digite o número com DDD e, se quiser, a mensagem.'),
    faq: [
      { q: 'O SMS é enviado automaticamente?', a: 'Não. O app de mensagens abre com o texto preenchido e a pessoa decide se envia.' },
      FAQ_PRIVACY,
    ],
  },
  geo: {
    path: '/local/', label: 'Local',
    title: 'QR Code de localização: abra um ponto no mapa | QR Utils',
    description: 'Gere um QR Code com coordenadas que abre o local no app de mapas. Use sua localização atual, escolha no mapa ou busque o endereço.',
    h1: 'QR Code de localização',
    intro: 'Indique a entrada de um evento, a porta da loja ou o ponto de encontro: quem escanear abre o local no app de mapas do celular.',
    steps: commonSteps('Use sua localização atual, escolha o ponto no mapa ou digite latitude e longitude.'),
    faq: [
      { q: 'O mapa envia meus dados?', a: 'O mapa é opcional: só ao tocar em "Escolher no mapa" as imagens vêm do OpenStreetMap, e a busca envia apenas o endereço digitado. A localização atual e o QR ficam no seu dispositivo.' },
      FAQ_FOREVER,
    ],
  },
  event: {
    path: '/evento/', label: 'Evento',
    title: 'QR Code de evento para adicionar à agenda | QR Utils',
    description: 'Crie um QR Code que adiciona um evento (título, data, hora e local) à agenda do celular. Ideal para convites, palestras e reuniões.',
    h1: 'QR Code de evento',
    intro: 'Coloque no convite, cartaz ou slide: quem escanear salva o evento na agenda com data, horário e local, sem digitar nada.',
    steps: commonSteps('Preencha o título, o início e, se quiser, o fim e o local.'),
    faq: [
      { q: 'Funciona com Google Agenda e iPhone?', a: 'Sim. O QR usa o formato iCalendar, reconhecido pelas agendas do Android e do iOS.' },
      FAQ_PRIVACY,
    ],
  },
  facebook: {
    path: '/facebook/', label: 'Facebook',
    title: 'QR Code do Facebook para sua página ou perfil | QR Utils',
    description: 'Gere um QR Code que leva à sua página ou perfil do Facebook, com cores e logo. Grátis, sem cadastro e sem expirar.',
    h1: 'QR Code do Facebook',
    intro: 'Leve clientes do balcão, da vitrine ou da embalagem direto para a sua página do Facebook.',
    steps: commonSteps('Digite o nome de usuário da página ou cole o link.'),
    faq: [FAQ_FOREVER, FAQ_PRIVACY],
  },
  telegram: {
    path: '/telegram/', label: 'Telegram',
    title: 'QR Code do Telegram para perfil, grupo ou canal | QR Utils',
    description: 'Crie um QR Code que abre seu perfil, grupo ou canal no Telegram. Grátis, sem cadastro e gerado no seu navegador.',
    h1: 'QR Code do Telegram',
    intro: 'Divulgue seu canal ou grupo: quem escanear abre o Telegram direto nele.',
    steps: commonSteps('Digite o @usuário (perfil, grupo ou canal público) ou cole o link t.me.'),
    faq: [FAQ_FOREVER, FAQ_PRIVACY],
  },
  youtube: {
    path: '/youtube/', label: 'YouTube',
    title: 'QR Code do YouTube para o seu canal | QR Utils',
    description: 'Gere um QR Code que abre o seu canal do YouTube. Para vídeos específicos, use o link. Grátis, sem cadastro e sem expirar.',
    h1: 'QR Code do YouTube',
    intro: 'Ganhe inscritos a partir de material impresso, eventos e embalagens: o QR Code abre o seu canal no app do YouTube.',
    steps: commonSteps('Digite o @ do canal ou cole o link do canal ou do vídeo.'),
    faq: [
      { q: 'Dá para apontar para um vídeo específico?', a: 'Sim. Cole o link completo do vídeo no campo; links completos são usados como estão.' },
      FAQ_FOREVER,
    ],
  },
  tiktok: {
    path: '/tiktok/', label: 'TikTok',
    title: 'QR Code do TikTok para o seu perfil | QR Utils',
    description: 'Crie um QR Code que leva ao seu perfil do TikTok, com cores e logo. Grátis, sem cadastro e sem expirar.',
    h1: 'QR Code do TikTok',
    intro: 'Transforme quem vê seu material físico em seguidor: o QR Code abre o seu perfil no TikTok.',
    steps: commonSteps('Digite o @usuário ou cole o link do perfil.'),
    faq: [FAQ_FOREVER, FAQ_PRIVACY],
  },
  x: {
    path: '/x/', label: 'X',
    title: 'QR Code do X (Twitter) para o seu perfil | QR Utils',
    description: 'Gere um QR Code que leva ao seu perfil no X (antigo Twitter). Grátis, sem cadastro e gerado no seu navegador.',
    h1: 'QR Code do X (Twitter)',
    intro: 'Quem escanear abre o seu perfil no X, pronto para seguir.',
    steps: commonSteps('Digite o @usuário ou cole o link do perfil.'),
    faq: [FAQ_FOREVER, FAQ_PRIVACY],
  },
  linkedin: {
    path: '/linkedin/', label: 'LinkedIn',
    title: 'QR Code do LinkedIn para cartão de visita | QR Utils',
    description: 'Crie um QR Code que abre o seu perfil do LinkedIn. Ideal para cartões, crachás e apresentações. Grátis e sem cadastro.',
    h1: 'QR Code do LinkedIn',
    intro: 'Faça networking mais rápido: coloque o QR Code no cartão, no crachá ou no último slide da apresentação.',
    steps: commonSteps('Digite o seu usuário do LinkedIn ou cole o link do perfil.'),
    faq: [FAQ_FOREVER, FAQ_PRIVACY],
  },
  paypal: {
    path: '/paypal/', label: 'PayPal',
    title: 'QR Code do PayPal.me para receber pagamentos | QR Utils',
    description: 'Gere um QR Code com o seu link PayPal.me, com valor opcional, para receber pagamentos. Grátis e gerado no seu navegador.',
    h1: 'QR Code do PayPal',
    intro: 'Receba pagamentos e doações: quem escanear abre o seu PayPal.me, com o valor já preenchido se você quiser.',
    steps: commonSteps('Digite o seu usuário do PayPal.me e, se quiser, o valor.'),
    faq: [
      { q: 'Preciso ter PayPal.me?', a: 'Sim. O QR Code aponta para paypal.me/seu-usuario; crie o seu link na conta PayPal antes.' },
      FAQ_PRIVACY,
    ],
  },
  mecard: {
    path: '/mecard/', label: 'MeCard',
    title: 'QR Code MeCard: contato compacto | QR Utils',
    description: 'Gere um QR Code de contato no formato MeCard, mais curto que o vCard e fácil de ler. Nome, telefone e e-mail. Grátis e privado.',
    h1: 'QR Code MeCard',
    intro: 'Uma versão compacta do cartão de contato: menos dados, QR Code menor e leitura mais fácil em impressões pequenas.',
    steps: commonSteps('Preencha nome e, se quiser, telefone e e-mail.'),
    faq: [
      { q: 'Qual a diferença para o vCard?', a: 'O MeCard guarda menos campos (nome, telefone, e-mail) e gera um QR menor. Para empresa, cargo e site, use o QR Code de contato (vCard).' },
      FAQ_PRIVACY,
    ],
  },
  app: {
    path: '/app/', label: 'App / Loja',
    title: 'QR Code para baixar app na Play Store ou App Store | QR Utils',
    description: 'Crie um QR Code que leva à página do seu app na Google Play ou na App Store. Grátis, sem cadastro e sem expirar.',
    h1: 'QR Code de app',
    intro: 'Aumente os downloads: o QR Code abre a página do seu app na loja, direto no celular de quem escanear.',
    steps: commonSteps('Cole o link do app na Google Play ou na App Store.'),
    faq: [FAQ_FOREVER, FAQ_PRIVACY],
  },
  zoom: {
    path: '/zoom/', label: 'Zoom',
    title: 'QR Code para entrar em reunião do Zoom | QR Utils',
    description: 'Gere um QR Code que abre uma reunião do Zoom com ID e senha. Ideal para salas, eventos e convites. Grátis e privado.',
    h1: 'QR Code do Zoom',
    intro: 'Coloque na porta da sala ou no convite: quem escanear entra na reunião do Zoom sem digitar ID nem senha.',
    steps: commonSteps('Digite o ID da reunião e, se houver, a senha.'),
    faq: [FAQ_PRIVACY, FAQ_FOREVER],
  },
};

/** Tipos que não estão em destaque (seção "Outros tipos" da home). */
export const OTHER_TYPES = TYPES.map((t) => t.id).filter((id) => !MAIN_TYPES.includes(id));

export const PAGES: SitePage[] = [
  {
    path: '/', kind: 'home', label: 'Início',
    title: 'Gerador de QR Code grátis, privado e sem cadastro | QR Utils',
    description: 'Crie QR Code de link, Wi-Fi, WhatsApp, contato, Instagram e mais — com cores e logo. Grátis, sem cadastro e 100% no seu navegador. Também lê QR Code.',
    h1: 'Gerador de QR Code grátis e privado',
    intro: 'Escolha o tipo de QR Code. Tudo é gerado no seu navegador: nada do que você digita sai do seu dispositivo.',
  },
  ...TYPES.map((t): SitePage => ({ ...GEN_PAGES[t.id], kind: 'gen', type: t.id })),
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

/** Caminho da página do gerador de um tipo. */
export function typeHref(id: string): string {
  const own = PAGES.find((p) => p.kind === 'gen' && p.type === id);
  if (!own) throw new Error(`tipo sem página: ${id}`);
  return own.path;
}
