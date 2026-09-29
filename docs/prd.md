# PRD — QR Utils

- **Produto:** QR Utils — gerador e leitor de QR Code e código de barras
- **URL:** https://qr.tools.grviana.com.br/
- **Responsável:** Gustavo Viana
- **Estado:** em produção (documento reflete o que já existe em `main`)
- **Última revisão:** 2026-09-29

## 1. Visão

Gerar e ler QR Codes **sem que nada saia do navegador**. Uma ferramenta gratuita,
sem cadastro, sem anúncios e sem rastreamento, que funciona offline e cujo código
qualquer pessoa pode auditar.

## 2. Problema

As ferramentas populares de QR Code têm, em geral, um ou mais destes problemas:

1. **Privacidade:** o conteúdo (senha de Wi-Fi, contato, link, dados de pagamento)
   é enviado ao servidor para gerar ou ler o código.
2. **QR "dinâmico" como armadilha:** o código aponta para um redirecionador do
   serviço; quando o plano gratuito expira, o QR impresso para de funcionar.
3. **Cadastro, paywall e anúncios** para recursos básicos (SVG, logo, cores).
4. **Rastreadores e scripts de terceiros** carregados na página.
5. **Dependência de conexão:** não funcionam offline.

## 3. Público

| Perfil | Necessidade principal |
|---|---|
| Pessoa comum | QR de Wi-Fi, WhatsApp, link ou contato, rápido e grátis, pelo celular. |
| Pequeno negócio | QR com logo e cores da marca para cardápio, balcão ou material impresso; PNG em alta resolução e SVG vetorial. |
| Quem precisa ler um código | Ler QR ou código de barras pela câmera ou por uma imagem/print, entendendo o que o código contém antes de agir (ex.: conferir um Pix). |
| Público preocupado com privacidade/dev | Ferramenta auditável, sem servidor, instalável e offline. |

Idioma e mercado: **português do Brasil** (máscaras de telefone BR, Pix, textos em pt-BR).

## 4. Princípios (inegociáveis)

Toda decisão de produto passa por estes princípios, nesta ordem:

1. **Local-first:** todo processamento de conteúdo acontece no dispositivo. Não
   existe back-end recebendo o que a pessoa digita, gera ou lê.
2. **Sem rastreamento:** sem cookies, analytics, pixels ou scripts de terceiros.
   O único dado persistido é uma preferência de UI (`installDismissed`).
3. **Exceções só com consentimento explícito e explicadas:** a única chamada
   externa é o mapa opcional (OpenStreetMap/Nominatim), carregado apenas após a
   pessoa tocar em "Escolher no mapa". Veja [specs/privacidade.md](specs/privacidade.md).
4. **QR estático e permanente:** o código gerado contém o dado final, sem
   redirecionadores. Um QR impresso continua funcionando para sempre.
5. **Offline e instalável:** após a primeira visita, gerar e ler funcionam sem rede.
6. **Auditável:** código aberto (MIT); o build produz um único `index.html`
   autocontido, sem CDN em runtime.
7. **Simples por padrão, poderoso sob demanda:** o fluxo principal é
   conteúdo → gerar → baixar; a personalização é opcional e fica recolhida.

## 5. Escopo atual (recursos)

### 5.1 Gerar
- 21 tipos de conteúdo: Texto, Link, Wi-Fi, E-mail, Telefone, SMS, WhatsApp,
  Contato (vCard), Local, Evento, Instagram, Facebook, Telegram, YouTube, TikTok,
  X, LinkedIn, PayPal, MeCard, App/Loja e Zoom.
- Prévia do texto exato que será codificado ("Ver texto formatado").
- Fluxo em etapas: 1) Conteúdo → 2) Personalizar (opcional) → 3) Baixar.
- Detalhes: [specs/geracao.md](specs/geracao.md).

### 5.2 Personalizar
- Cores dos módulos, do fundo e dos olhos (moldura e centro separados), paletas
  prontas e fundo transparente.
- 13 formas de corpo, 3 formas de moldura de olho, centro do olho com qualquer
  forma de corpo e contorno quadrado ou circular.
- Logo central: 12 logos prontos (colorido ou monocromático) ou imagem própria.
- Molduras com legenda (cantos, borda ou faixa).
- Correção de erro automática, que sobe sozinha com logo ou formas de ícone.
- A prévia se atualiza ao vivo.
- Detalhes: [specs/personalizacao.md](specs/personalizacao.md).

### 5.3 Exportar e compartilhar
- PNG em 512, 1024, 2048 ou 4096 px; SVG vetorial.
- Compartilhar a imagem (Web Share API) ou um **link** que recria o QR com o
  mesmo estilo (dados no fragmento `#`, nunca enviados ao servidor).
- Detalhes: [specs/exportacao-e-compartilhamento.md](specs/exportacao-e-compartilhamento.md).

### 5.4 Ler
- Pela câmera ou a partir de uma imagem; modos Automático, só QR ou só barras.
- 30 simbologias (QR, Micro QR, rMQR, Data Matrix, Aztec, PDF417, EAN,
  UPC, Code 128, GS1 DataBar…).
- Resultado interpretado por tipo, com ações adequadas (abrir link, ligar, salvar
  contato, adicionar à agenda, copiar senha do Wi-Fi, conferir Pix com validação de CRC).
- Detalhes: [specs/leitura.md](specs/leitura.md).

### 5.5 App (PWA)
- Instalável (Android, desktop, iOS com instruções), offline, atalhos
  "Gerar" e "Ler", abrir imagens com o app e receber imagens compartilhadas
  de outros apps.
- Detalhes: [specs/pwa-e-offline.md](specs/pwa-e-offline.md).

### 5.6 Transparência
- Aba "Sobre" com créditos das bibliotecas e formatos suportados; página de
  Privacidade explicando cada fluxo de dados; link para o repositório.

## 6. Fora de escopo (não-objetivos)

| Não faremos | Por quê |
|---|---|
| QR dinâmico / encurtador / redirecionador | Exige servidor e cria dependência; viola os princípios 1 e 4. |
| Estatísticas de leitura (scans) | Exige rastrear quem lê; viola o princípio 2. |
| Contas, login, histórico na nuvem | Sem back-end por princípio. |
| Anúncios ou paywall | Contradiz a proposta; o projeto é gratuito e aberto. |
| Geração em lote via servidor/API | Sem back-end. (Lote local pode ser avaliado no futuro.) |

## 7. Métricas de sucesso

Por não haver analytics, o sucesso é medido **sem rastrear usuários**:

- Relatórios agregados do Google Search Console / Bing Webmaster (impressões,
  cliques, posição) — não exigem script na página.
- Métricas agregadas da hospedagem (Cloudflare), sem cookies.
- Estrelas, issues e forks no GitHub.
- Qualidade: CI verde (typecheck, testes, build) em todo PR.

Qualquer métrica nova precisa respeitar o princípio 2.

## 8. Restrições técnicas

- Tudo em um único `index.html` gerado pelo build; os únicos arquivos à parte são
  os que a plataforma exige (`sw.js`, `manifest.webmanifest`, ícones, imagens e o
  `zxing_reader.wasm`).
- Hospedagem estática (Cloudflare Workers com static assets); sem código de servidor.
- Câmera, service worker e instalação exigem HTTPS.
- Detalhes: [specs/arquitetura-e-build.md](specs/arquitetura-e-build.md).

## 9. Decisões registradas

| Decisão | Motivo |
|---|---|
| Geração via `qr-code-styling` + renderer próprio | A lib cobre as formas "conectadas"; formas de ícone (coração, estrela…) precisam de um renderer por módulo, que a lib não oferece. |
| Leitura: `BarcodeDetector` nativo → jsQR → ZXing (WASM) | O nativo é rápido mas não existe no Windows, Firefox e iOS; jsQR cobre QR em qualquer navegador; ZXing cobre as demais simbologias. |
| `.wasm` servido pela própria origem | A lib buscaria num CDN; servir localmente mantém o app offline e sem terceiros. |
| Mapa próprio (sem biblioteca) | Evita carregar script de terceiros; só as imagens dos tiles vêm do OSM, após consentimento. |
| Link compartilhável no fragmento `#` | O fragmento não é enviado ao servidor; o conteúdo continua fora de qualquer log. |
| Logo fora do link compartilhado | É imagem e incharia a URL; a UI avisa a pessoa. |
| Correção de erro "Automático" como padrão | Quem adiciona logo ou formas de ícone não sabe que isso reduz a leitura; o app compensa sozinho. |
| Personalização recolhida por padrão | Mantém o caminho principal curto (princípio 7). |
