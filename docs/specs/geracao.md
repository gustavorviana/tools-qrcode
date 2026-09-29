# Spec — Geração de QR Code

Código: `src/app.ts` (`buildContent`, `doGenerate`, `regenerate`), `src/format.ts`, `src/index.html` (`#view-gen`).

## Fluxo

1. **Conteúdo:** a pessoa escolhe o tipo nas abas (`setType`) e preenche o formulário.
   Trocar de tipo esconde a prévia e o QR anterior; os valores digitados em cada
   tipo são mantidos.
2. **Gerar QR Code** (`doGenerate`): monta o payload (`buildContent`). Se vier vazio,
   mostra "Preencha os campos primeiro.". Se vier preenchido, gera o SVG, esconde a
   etapa 1 e mostra as etapas 2 (Personalizar) e 3 (Baixar).
3. A partir daí o modo fica **ao vivo** (`live = true`): qualquer mudança de
   personalização redesenha o QR com debounce de 120 ms (`liveUpdate`).
4. **← Voltar e editar conteúdo** (`backToContent`) sai do modo ao vivo e volta à etapa 1.

**Ver texto formatado** (`showFormatted`) mostra o texto exato que será codificado,
sem gerar o QR.

A etapa 3 mostra a versão do QR, o nível de correção e o tamanho da matriz, por
exemplo: `Versão 3 · correção M · 29×29 módulos`.

## Tipos de conteúdo e payload

Campos com * são obrigatórios; sem eles o payload é vazio e o QR não é gerado.

| Tipo | Campos | Payload gerado |
|---|---|---|
| Texto | texto* | o texto como digitado |
| Link | URL* | URL; prefixa `https://` se não houver esquema |
| Wi-Fi | SSID*, senha, segurança (WPA/WEP/aberta), rede oculta | `WIFI:T:<sec>;S:<ssid>;P:<senha>;H:true;;`; `P:` é omitido se a rede for aberta, `H:true;` só se oculta; `\ ; , " :` são escapados (`escWifi`) |
| E-mail | para*, assunto, mensagem | `mailto:<para>?subject=…&body=…` (URL-encoded) |
| Telefone | número* | `tel:<dígitos e +>` |
| SMS | número*, mensagem | `SMSTO:<número>[:<mensagem>]` |
| WhatsApp | número com DDI*, mensagem | `https://api.whatsapp.com/send?phone=<dígitos>[&text=<msg>]` |
| Contato | nome*, empresa, cargo, telefone, e-mail, site | vCard 3.0 (`N`, `FN`, `ORG`, `TITLE`, `TEL;TYPE=CELL`, `EMAIL`, `URL`); a última palavra do nome vira o sobrenome; valores escapados (`escVcard`) |
| Local | latitude*, longitude* | `geo:<lat>,<lng>`; aceita vírgula decimal; rejeita valores não numéricos |
| Evento | título*, início*, fim, local | iCalendar `VCALENDAR/VEVENT` com `SUMMARY`, `LOCATION`, `DTSTART`, `DTEND` no formato `AAAAMMDDTHHMM00` (hora local, sem fuso) |
| Instagram | @usuário ou link* | `https://instagram.com/<usuario>` |
| Facebook | idem | `https://facebook.com/<usuario>` |
| Telegram | idem | `https://t.me/<usuario>` |
| YouTube | idem | `https://youtube.com/@<usuario>` |
| TikTok | idem | `https://tiktok.com/@<usuario>` |
| X | idem | `https://x.com/<usuario>` |
| LinkedIn | idem | `https://linkedin.com/in/<usuario>` |
| PayPal | usuário*, valor | `https://paypal.me/<usuario>[/<valor>]`; aceita vírgula decimal; ignora valor inválido |
| MeCard | nome*, telefone, e-mail | `MECARD:N:<sobrenome>,<nome>;TEL:…;EMAIL:…;;` |
| App / Loja | link da loja* | URL; prefixa `https://` se não houver esquema |
| Zoom | ID*, senha | `https://zoom.us/j/<id numérico>[?pwd=<senha>]` |

Redes sociais (`socialUrl`): um link completo `http(s)://…` é usado como está; caso
contrário remove `@` e espaços e anexa à base.

## Máscaras de entrada

- Telefone, SMS, telefone do contato e MeCard: máscara BR `(11) 99999-9999` ou
  `(11) 9999-9999` (`maskPhoneBR`).
- WhatsApp: dígitos além dos 11 nacionais viram DDI, `+55 (11) 99999-9999` (`maskPhoneWa`).
- O payload sempre usa só dígitos (e `+`), nunca a máscara.

## Localização (tipo Local)

- **Usar localização atual:** Geolocation API do navegador, alta precisão, timeout
  de 10 s. Não envia nada para a rede.
- **Escolher no mapa** (opt-in): mapa próprio em Web Mercator, com arrastar,
  zoom de 2 a 19 e roda do mouse. As imagens dos tiles vêm de
  `tile.openstreetmap.org`. O centro do mapa preenche latitude e longitude com
  6 casas decimais. Sem coordenadas prévias, abre no centro do Brasil
  (-14.24, -51.93, zoom 4).
- **Buscar endereço:** envia o texto digitado ao Nominatim (`limit=1`) e centraliza
  o mapa em zoom 16.
- Regras de privacidade: [privacidade.md](privacidade.md).

## Erros

- Payload vazio: "Preencha os campos primeiro.".
- Falha da lib ao codificar (ex.: conteúdo grande demais para a versão 40): a
  mensagem da exceção aparece em `#genErr` e a etapa 3 fica oculta.

## Testes

`tests/format.test.ts` cobre escapes, máscaras, datas iCal, `socialUrl`,
`paypalUrl`, `mecard` e `zoomUrl`. A montagem em `buildContent` depende do DOM e
não tem teste unitário.
