# QR Utils

> **Gere e leia QR Codes sem que nada saia do seu navegador.**

Webapp (PWA) para gerar e ler **QR Codes** com **processamento 100% local**: nenhum dado é enviado a servidores, não há rastreadores nem cadastro. O código é aberto e o build empacota tudo num **único `index.html` self-contained** — em runtime não há CDN nem dependências externas. Funciona **offline** após o primeiro acesso.

A **única exceção** é o **mapa opcional** do tipo *Localização*: só **depois de você autorizar** ("Escolher no mapa"), ele usa o **OpenStreetMap** para carregar as imagens do mapa e, ao buscar por endereço, envia o texto digitado ao geocodificador (Nominatim). Todo o resto — inclusive gerar/ler QR Codes e a opção "usar localização atual" — continua no seu dispositivo.

## Recursos

- **Gerar** QR Code a partir de links, textos, e-mail, telefone, Wi-Fi, SMS, WhatsApp, contato (vCard), localização e evento de calendário (com atalhos prontos).
- **Localização**: escolher o ponto num **mapa** (OpenStreetMap, opt-in), **buscar por endereço** ou usar a **localização atual** do dispositivo.
- Ajuste de **nível de correção de erro** (L/M/Q/H) e **tamanho** (em "Opções avançadas").
- **Baixar PNG** e **compartilhar** a imagem gerada.
- **Ler** QR Code pela **câmera** ou a partir de uma **imagem**, com **visualização por tipo** (contato, Wi-Fi, localização, etc.) e ações adequadas (ligar, salvar contato, abrir no mapa, adicionar à agenda…).
- **Copiar** o conteúdo lido e **abrir** links diretamente.
- **Instalável**: banner de instalação no Android/desktop e instruções no iOS; funciona offline após a primeira visita.
- **Privacidade**: nada sai do dispositivo — nenhum dado é enviado a servidores. Exceção: o **mapa opcional** de Localização usa o OpenStreetMap apenas após seu **consentimento explícito**.

## Desenvolvimento

Requer [Node.js](https://nodejs.org/). Na pasta do projeto:

```bash
npm install          # instala as dependências (jsQR + esbuild + typescript)
npm run build        # gera dist/index.html self-contained
npm run typecheck    # checagem de tipos (tsc --noEmit)
npm run preview      # build + servidor local em dist/ (localhost:5000)
npm run preview:online  # build + servidor + túnel HTTPS (testar no celular)
```

- **`npm run preview`** — teste no desktop, em `http://localhost:5000`.
- **`npm run preview:online`** — faz o build, serve e abre um **túnel HTTPS temporário** (cloudflared); use a URL `https://…trycloudflare.com` que aparecer para abrir **no celular** e testar câmera, instalação e offline. Ctrl+C encerra tudo. É só um túnel de teste — não é publicação.

Câmera, service worker e instalação exigem **HTTPS ou localhost** — por isso, no celular, use o `preview:online` (não funciona por `http://IP-da-rede` nem por `file://`).

## Estrutura do projeto

O código é **TypeScript** com organização orientada a objetos:

```
src/
  index.html      Template HTML (marcadores para CSS e JS)
  styles.css      Estilos
  main.ts         Ponto de entrada (instancia a App)
  app.ts          Classe App — controlador da interface
  qr/
    types.ts      Tipos do domínio (Ecl, ModuleShape, FrameStyle, QrCode)
    designer.ts   Classe QRDesigner — envelopa a qr-code-styling; cor, formas,
                  logo, moldura, render SVG e exportação (PNG/SVG)
    reader.ts     Classe QRReader — leitura (BarcodeDetector + jsQR)
public/           Assets copiados para o build (sw.js, manifest, ícones)
build.mjs         Bundla/minifica e inlina tudo num único dist/index.html
tsconfig.json     Configuração do TypeScript (usada por `npm run typecheck`)
dist/             Saída do build (gerada; publicada no deploy)
```

O [esbuild](https://esbuild.github.io/) transpila o TypeScript no build (`npm run build`); `npm run typecheck` roda o `tsc --noEmit` para checagem de tipos.

## Deploy (Cloudflare Pages)

O app está publicado em **[qr.tools.grviana.com.br](https://qr.tools.grviana.com.br/)**. Configuração no Cloudflare Pages:

- **Build command:** `npm run build`
- **Build output directory:** `dist`

## Detalhes técnicos

- **Geração + personalização** (`QRDesigner`, `src/qr/designer.ts`): envelopa a [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling) (MIT), que codifica e desenha o código (formas contínuo/arredondado/pontos/elegante, cores, logo central). Sobre o SVG da lib, o `QRDesigner` compõe a **moldura própria** (cantos/borda/faixa + legenda) via `applyExtension`, produzindo o **SVG final** (vetorial) e exportando para PNG/SVG.
- **Leitura** (`QRReader`, `src/qr/reader.ts`): usa a API nativa [`BarcodeDetector`](https://developer.mozilla.org/docs/Web/API/BarcodeDetector) quando disponível (rápida, em Android/macOS) e cai automaticamente para o [`jsQR`](https://github.com/cozmo/jsQR) (MIT) — JavaScript puro que funciona em qualquer navegador, inclusive Chrome/Edge/Firefox no Windows desktop, onde o `BarcodeDetector` não existe.
- **Mapa** (`App`, `src/app.ts`): seletor de localização implementado **do zero** (projeção Web Mercator, arrastar e zoom), **sem biblioteca de mapas**. Apenas as imagens dos tiles vêm do [OpenStreetMap](https://www.openstreetmap.org/) e a busca de endereço usa o [Nominatim](https://nominatim.org/) — ambos só após o usuário abrir o mapa. Nenhum script de terceiros é carregado.
- **Build** (`build.mjs`): o [esbuild](https://esbuild.github.io/) transpila e empacota o TypeScript (`src/main.ts`, com o jsQR) e o CSS, minifica e inlina tudo no template, produzindo um `dist/index.html` self-contained — nenhum arquivo JS externo é carregado em runtime.

## Compatibilidade

| Recurso | Suporte |
|---|---|
| Gerar QR Code | Todos os navegadores modernos |
| Ler por câmera / imagem | Todos os navegadores modernos (nativo quando disponível, senão jsQR) |
| Instalar como app / offline | Navegadores com suporte a PWA e service workers |

## Licença

Veja [LICENSE](LICENSE).
