# Spec — Privacidade e fluxos de dados

Esta spec é a referência técnica da página "Privacidade" do app (`#view-privacy`
em `src/index.html`). Se uma mudança alterar qualquer linha da tabela abaixo, a
página do app precisa ser atualizada no mesmo PR.

## Onde cada dado é processado

| Dado | Onde é processado | Sai do dispositivo? |
|---|---|---|
| Conteúdo digitado para gerar | navegador | Não |
| QR gerado (SVG/PNG) | navegador | Só se a pessoa baixar ou compartilhar |
| Quadros da câmera / imagem lida | navegador (nativo, jsQR, ZXing WASM) | Não; nada é armazenado |
| Logo enviado | navegador (data URL) | Não |
| Localização atual | Geolocation API do navegador | Não |
| Tiles do mapa | `tile.openstreetmap.org` | **Sim**, só após "Escolher no mapa"; o pedido revela a região visualizada e o IP |
| Busca de endereço | `nominatim.openstreetmap.org` | **Sim**, o texto digitado, só quando a pessoa busca |
| Link compartilhado | fragmento `#` da URL | Não vai ao servidor; fica visível para quem recebe o link e para o app usado para compartilhar |
| Preferência "dispensar instalação" | `localStorage` | Não |
| Acesso ao site | Cloudflare | IP em logs da hospedagem, como em qualquer site |

## Regras

1. **Sem back-end de aplicação.** O servidor só entrega arquivos estáticos.
2. **Sem cookies, analytics, pixels ou scripts de terceiros.** O HTML final não
   carrega nenhum `<script src>` externo; JS e CSS são inline.
3. **Recursos externos só com consentimento explícito** e explicados na página de
   Privacidade. Hoje o único é o mapa (OSM/Nominatim).
4. **Nenhum dado lido é enviado a terceiros para "enriquecer" o resultado.**
   Exemplo: a URL do Pix dinâmico não é acessada nem exibida.
5. Novas dependências de runtime devem ser embutidas no bundle ou servidas pela
   própria origem (ex.: `zxing_reader.wasm`).
6. Qualquer medição futura (ex.: SEO) deve usar fontes agregadas externas, como
   Search Console ou métricas da hospedagem, sem instrumentar a página.
