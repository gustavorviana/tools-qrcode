# SPEC-001 — Geração de QR Code

| | |
|---|---|
| **Status** | Implementado |
| **PRD** | [PRD-001](../prd/001-geracao.md) |
| **Módulos** | `src/app.ts`, `src/format.ts`, `src/qr/designer.ts`, `src/qr/generator.ts` |
| **Atualizado em** | 2026-09-29 |

## 1. Resumo
Cada tipo de conteúdo tem um grupo de campos no HTML (`.fgroup[data-fields=<tipo>]`). `App.buildContent()` lê os campos do tipo atual e monta o payload com as funções puras de `format.ts`. O `QRDesigner` codifica o payload via `qr-code-styling` e devolve um SVG. Após a primeira geração, o app entra em modo "ao vivo" para a personalização (SPEC-002).

## 2. Módulos e dependências
- `src/app.ts`: `buildContent`, `showFormatted`, `doGenerate`, `regenerate`, `renderPreview`, `backToContent` e o mapa (`loadMap`, `drawMap`, `bindMapDrag`, `mapZoom`, `searchAddress`, `useCurrentLocation`).
- `src/format.ts`: `escWifi`, `escVcard`, `icalDate`, `maskPhoneBR`, `maskPhoneWa`, `socialUrl`, `paypalUrl`, `mecard`, `zoomUrl`.
- `src/qr/designer.ts` → `generator.ts` → `qr-code-styling`.
- Externo (opt-in): `tile.openstreetmap.org`, `nominatim.openstreetmap.org`.

## 3. Modelo de dados
Payload por tipo (campos com * são obrigatórios):

| Tipo | Campos | Payload |
|---|---|---|
| Texto | texto* | texto como digitado |
| Link | URL* | URL; `https://` se não houver esquema |
| Wi-Fi | SSID*, senha, segurança, oculta | `WIFI:T:<sec>;S:<ssid>;P:<senha>;H:true;;`; sem `P:` se aberta; `\ ; , " :` escapados |
| E-mail | para*, assunto, mensagem | `mailto:<para>?subject=…&body=…` |
| Telefone | número* | `tel:<dígitos e +>` |
| SMS | número*, mensagem | `SMSTO:<número>[:<msg>]` |
| WhatsApp | número com DDI*, mensagem | `https://api.whatsapp.com/send?phone=<dígitos>[&text=<msg>]` |
| Contato | nome*, empresa, cargo, telefone, e-mail, site | vCard 3.0 (`N`, `FN`, `ORG`, `TITLE`, `TEL;TYPE=CELL`, `EMAIL`, `URL`) |
| Local | latitude*, longitude* | `geo:<lat>,<lng>` |
| Evento | título*, início*, fim, local | `VCALENDAR/VEVENT` com `DTSTART`/`DTEND` em `AAAAMMDDTHHMM00` |
| Instagram, Facebook, Telegram, YouTube, TikTok, X, LinkedIn | usuário ou link* | `instagram.com/`, `facebook.com/`, `t.me/`, `youtube.com/@`, `tiktok.com/@`, `x.com/`, `linkedin.com/in/` + usuário |
| PayPal | usuário*, valor | `https://paypal.me/<usuario>[/<valor>]` |
| MeCard | nome*, telefone, e-mail | `MECARD:N:<sobrenome>,<nome>;TEL:…;EMAIL:…;;` |
| App / Loja | link* | URL; `https://` se não houver esquema |
| Zoom | ID*, senha | `https://zoom.us/j/<id>[?pwd=<senha>]` |

Estado relevante em `App`: `currentType`, `lastText`, `lastSVG`, `live`, `liveTimer`, `renderSeq` e `map: { lat, lng, z, W, H }`.

## 4. Componentes
```ts
class App {
  showFormatted(): void
  doGenerate(): Promise<void>
  backToContent(): void
  useCurrentLocation(): void
  loadMap(): void
  mapZoom(delta: number): void
  searchAddress(): Promise<void>
  private buildContent(): string
  private regenerate(): Promise<void>
  private renderPreview(): Promise<void>
}
function socialUrl(input: string, base: string): string
function paypalUrl(user: string, amount: string): string
function mecard(name: string, tel: string, email: string): string
function zoomUrl(id: string, pwd: string): string
function maskPhoneBR(v: string): string
function maskPhoneWa(v: string): string
```

## 5. Fluxos
**Gerar**
1. O tipo vem da página (`<body data-type>`, ex.: `/wifi/`, `/zoom/`); cada página tem só os campos do seu tipo.
2. `doGenerate()` chama `regenerate()`: `buildContent()` monta o payload; se vier vazio, a etapa 3 é ocultada.
3. `designer.text = payload`, `designer.ecl = effectiveEcl()` (SPEC-002), `renderPreview()`.
4. `renderPreview()` incrementa `renderSeq`, gera o SVG e descarta o resultado se outro render tiver começado depois. Injeta o SVG em `#qrPreview` e preenche `#qrMeta`.
5. Com sucesso: `live = true`, esconde `#genContent` e mostra `#genResult`. Com payload vazio e sem erro: "Preencha os campos primeiro.".

**Localização atual:** `getCurrentPosition` com `enableHighAccuracy`, `timeout: 10000`. Preenche 6 casas decimais e recentraliza o mapa se ele estiver aberto.

**Mapa:** `loadMap()` esconde o aviso de consentimento e cria o `MapState` (coordenadas atuais ou -14.24, -51.93, zoom 4). `drawMap()` calcula os tiles visíveis em Web Mercator e cria `<img>` de `tile.openstreetmap.org/{z}/{x}/{y}.png`. O centro do mapa é a coordenada escolhida. O mapa aceita arrastar com pointer events e zoom com a roda ou os botões (2–19).

**Buscar endereço:** `GET nominatim…/search?format=jsonv2&limit=1&q=<texto>`, depois centraliza em zoom 16.

## 6. UI
- Abas de tipo `#typeChips`, campos `#genFields`, botões "Ver texto formatado" e "Gerar QR Code", prévia `#genPreview`, erro `#genErr`.
- Etapa 2/3 em `#genResult`, com o botão "← Voltar e editar conteúdo".
- Local: "Usar localização atual", o aviso `#mapConsent` com "Escolher no mapa", `#mapSearch` e `#mapWrap`.

## 7. Permissões e manifest
- **Geolocalização:** pedida pelo navegador só ao tocar em "Usar localização atual".
- Nenhuma declaração no manifesto.

## 8. Erros e casos de borda
| Situação | Comportamento |
|---|---|
| Campos obrigatórios vazios | "Preencha os campos primeiro."; sem QR |
| Latitude/longitude não numéricas | payload vazio |
| Vírgula decimal em coordenada ou valor do PayPal | convertida para ponto |
| Valor do PayPal inválido | ignorado (link sem valor) |
| Conteúdo acima da capacidade do QR | mensagem da lib em `#genErr`, etapa 3 oculta |
| Geolocalização negada ou indisponível | toast "Não foi possível obter a localização" / "Geolocalização indisponível" |
| Endereço não encontrado / erro de rede | toast "Endereço não encontrado" / "Falha na busca de endereço" |
| Renders concorrentes (digitação rápida) | só o mais recente é aplicado (`renderSeq`) |
| Telefone com máscara | payload usa só dígitos e `+` |

## 9. Testes
| Teste | Cobre |
|---|---|
| `format.test.ts` › `escWifi`, `escVcard`, `icalDate`, `icalGet`, `fmtIcalDate` | GEN-F01, GEN-N04 |
| `format.test.ts` › `maskPhoneBR`, `maskPhoneWa` | GEN-F07 |
| `format.test.ts` › `socialUrl` | GEN-F02 |
| `format.test.ts` › `paypalUrl`, `mecard`, `zoomUrl` | GEN-F03 |
| roteiro manual | GEN-F04 a GEN-F06, GEN-F08 a GEN-F11, GEN-N03 |

Lacuna: `buildContent` depende do DOM e não tem teste unitário.

## 10. Plano de implementação
Concluído. Marcos: `e58efef` (tipos base e mapa), `9f0177b` (fluxo em etapas), `333442e` (redes sociais, PayPal, MeCard, App, Zoom).

## 11. Decisões e alternativas descartadas
- **WhatsApp via `api.whatsapp.com/send`** em vez de `wa.me`: aceita `text` na query de forma consistente.
- **SMS em `SMSTO:`** em vez de `sms:`: é o formato mais reconhecido pelas câmeras.
- **Mapa próprio** em vez de Leaflet ou Google Maps: não carrega script de terceiros; só as imagens vêm do OSM.
- **Evento sem fuso (`TZID`):** mais simples; o horário é interpretado como local por quem lê.
