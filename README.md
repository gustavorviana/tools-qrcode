# QR Utils

> **Gere e leia QR Codes sem que nada saia do seu navegador.**

Webapp (PWA) para gerar e ler **QR Codes** com **processamento 100% local**: nenhum dado é enviado a servidores, não há rastreadores nem cadastro. O código é aberto e o build empacota tudo num **único `index.html` self-contained** — em runtime não há CDN nem dependências externas. Funciona **offline** após o primeiro acesso.

## Recursos

- **Gerar** QR Code a partir de links, textos, e-mail, telefone, Wi-Fi, SMS (com atalhos prontos).
- Ajuste de **nível de correção de erro** (L/M/Q/H) e **tamanho**.
- **Baixar PNG** e **compartilhar** a imagem gerada.
- **Ler** QR Code pela **câmera** ou a partir de uma **imagem**.
- **Copiar** o conteúdo lido e **abrir** links diretamente.
- **Instalável**: banner de instalação no Android/desktop e instruções no iOS; funciona offline após a primeira visita.
- **Privacidade**: nada sai do dispositivo — nenhum dado é enviado a servidores.

## Desenvolvimento

Requer [Node.js](https://nodejs.org/). Na pasta do projeto:

```bash
npm install          # instala as dependências (jsQR + esbuild)
npm run build        # gera dist/index.html self-contained
npm run preview      # build + servidor local em dist/ (localhost:5000)
npm run preview:online  # build + servidor + túnel HTTPS (testar no celular)
```

- **`npm run preview`** — teste no desktop, em `http://localhost:5000`.
- **`npm run preview:online`** — faz o build, serve e abre um **túnel HTTPS temporário** (cloudflared); use a URL `https://…trycloudflare.com` que aparecer para abrir **no celular** e testar câmera, instalação e offline. Ctrl+C encerra tudo. É só um túnel de teste — não é publicação.

Câmera, service worker e instalação exigem **HTTPS ou localhost** — por isso, no celular, use o `preview:online` (não funciona por `http://IP-da-rede` nem por `file://`).

## Estrutura do projeto

```
src/
  index.html   Template HTML (marcadores para CSS e JS)
  styles.css   Estilos
  qrcode.js    Gerador de QR Code (implementado do zero)
  reader.js    Leitor de QR Code (BarcodeDetector + jsQR)
  app.js       Interface e integração
public/        Assets copiados para o build (sw.js, manifest, ícones)
build.mjs      Bundla/minifica e inlina tudo num único dist/index.html
dist/          Saída do build (gerada; publicada no deploy)
```

## Deploy (Cloudflare Pages)

O app está publicado em **[qr.tools.grviana.com.br](https://qr.tools.grviana.com.br/)**. Configuração no Cloudflare Pages:

- **Build command:** `npm run build`
- **Build output directory:** `dist`

## Detalhes técnicos

- **Geração** (`src/qrcode.js`): implementação própria do algoritmo QR (ISO/IEC 18004) em modo byte/UTF-8, com codificação Reed-Solomon, seleção automática de versão (1–40) e escolha da melhor máscara. Suporta acentuação e qualquer texto UTF-8. Sem dependências.
- **Leitura** (`src/reader.js`): usa a API nativa [`BarcodeDetector`](https://developer.mozilla.org/docs/Web/API/BarcodeDetector) quando disponível (rápida, em Android/macOS) e cai automaticamente para o [`jsQR`](https://github.com/cozmo/jsQR) (MIT) — JavaScript puro que funciona em qualquer navegador, inclusive Chrome/Edge/Firefox no Windows desktop, onde o `BarcodeDetector` não existe.
- **Build** (`build.mjs`): o [esbuild](https://esbuild.github.io/) empacota `app.js` (com o jsQR) e o CSS, minifica e inlina tudo no template, produzindo um `dist/index.html` self-contained — nenhum arquivo JS externo é carregado em runtime.

## Compatibilidade

| Recurso | Suporte |
|---|---|
| Gerar QR Code | Todos os navegadores modernos |
| Ler por câmera / imagem | Todos os navegadores modernos (nativo quando disponível, senão jsQR) |
| Instalar como app / offline | Navegadores com suporte a PWA e service workers |

## Licença

Veja [LICENSE](LICENSE).
