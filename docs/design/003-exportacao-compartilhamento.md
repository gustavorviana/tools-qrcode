# DESIGN-003 — Exportação e compartilhamento

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-003](../spec/003-exportacao-compartilhamento.md) |
| **Módulos** | `src/qr/designer.ts`, `src/qr/raster.ts`, `src/qr/share.ts`, `src/app.ts` |
| **Atualizado em** | 2026-09-30 |

## 1. Resumo
- **SVG:** exportado como está.
- **PNG:** o SVG é ajustado por `rasterizeSVG` (desfaz os clip-paths e força a resolução), desenhado em 4× e reduzido com suavização alta.
- **Compartilhar imagem:** Web Share API com o arquivo PNG.
- **Link:** o conteúdo e as opções fora do padrão vão para o fragmento `#` (`buildShareQuery`). Ao abrir, `parseShareQuery` valida cada valor e o app recria o QR numa view dedicada.

## 2. Módulos e dependências
- `designer.ts`: `toCanvas(px)`, `toSVGBlob()`.
- `raster.ts`: `rasterizeSVG(svg, w, h)`, puro.
- `share.ts`: `buildShareQuery`, `parseShareQuery`, `SHARE_DEFAULTS`, `PNG_SIZES`; valida formas contra os registros de `shapes.ts`.
- `app.ts`: `downloadPNG`, `downloadSVG`, `shareQR`, `shareLink`, `setPngSize`, `openModal`, `closeModal`, `renderShared`, `initShared`, `exitShared`, `toggleShareView`.

## 3. Modelo de dados
Link: `<origin><pathname>#q=<texto>&<opções>`. Também é aceito em `?q=` na query.

| Parâmetro | Campo | Padrão (omitido) | Validação |
|---|---|---|---|
| `q` | texto | obrigatório | — |
| `e` | ECL efetivo | `MEDIUM` | `LOW\|MEDIUM\|QUARTILE\|HIGH` |
| `fg` / `bg` | cores | `0f172a` / `ffffff` | hex de 3, 4, 6 ou 8 dígitos |
| `efc` / `ecc` | cores dos olhos | ausentes | hex |
| `bt` | fundo transparente | ausente | `1` |
| `s` | corpo | `solid` | chaves de `BODY` |
| `ef` | moldura do olho | `auto` | chaves de `EYE_FRAME` |
| `ec` | centro do olho | `auto` | `auto` + chaves de `BODY` |
| `qs` | contorno | `square` | `square\|circle` |
| `fr` | moldura | `none` | `none\|corners\|border\|label` |
| `cap` | legenda | `ESCANEIE` | só se `fr` ≠ `none` |
| `sz` | PNG | `1024` | `512\|1024\|2048\|4096` |
| `lg` | logo pronto | ausente | nomes de `LOGOS` (`src/qr/logos.ts`) |
| `lc` | logo colorido (só com `lg`) | ausente = monocromático | `1` |

```ts
interface ShareState { text; ecl; fg; bg; eyeFrameColor?; eyeCenterColor?; bgTransparent; shape; eyeFrame; eyeCenter; qrShape; frame; caption; size }
interface ShareParams { text: string; /* demais campos opcionais */ }
```

## 4. Componentes
```ts
class QRDesigner {
  toCanvas(px: number): Promise<HTMLCanvasElement>
  toSVGBlob(): Blob
}
function rasterizeSVG(svg: string, w: number, h: number): string
function buildShareQuery(s: ShareState): string
function parseShareQuery(raw: string): ShareParams | null
```

## 5. Fluxos
**PNG**
1. `toCanvas(px)`: escala `px/1000`. A altura acompanha a faixa da legenda.
2. `rasterizeSVG` troca `shape-rendering` por `geometricPrecision`, troca cada `<rect clip-path>` por um `<g>` com as formas do clip e um stroke de 1 da mesma cor, e força `width`/`height` do `<svg>` externo para 4× o alvo.
3. Carrega como `data:image/svg+xml` num `<img>`, desenha no canvas 4× (pinta o fundo se não for transparente) e reduz para o alvo com `imageSmoothingQuality = 'high'`.
4. Faz o download de `qrcode.png` via `toDataURL`.

**Compartilhar imagem:** gera o PNG → `toBlob` → `File` → se `navigator.canShare({ files })`, chama `navigator.share`; senão faz o download.

**Compartilhar link:** `buildShareURL(lastText)` → `navigator.share({ url })`. Se não existir ou falhar (exceto `AbortError`), copia para a área de transferência com o toast "Link copiado!".

**Abrir link (home):** em `init()` e em `hashchange`, `parseShareQuery(hash || search)`. Se válido, `renderShared()` aplica as opções (ou o padrão), gera o SVG, injeta em `#sharePreview`, chama `renderDecoded` em `#shareDetail`, esconde `#homeMain` e ativa `view-share`. O link é sempre gerado como `/#q=…`, de qualquer página.

**Sair do link:** `exitShared()` navega para `/` (página limpa, sem o `#q=…`), o que também descarta as opções do link.

## 6. UI
- Etapa 3 `#step3`: prévia clicável, `#pngSize`, "Baixar PNG", "Baixar SVG", "Compartilhar imagem", "Compartilhar link do QR", o aviso `#shareLinkNote` (só com logo de imagem própria), o aviso `#eclNote` (correção elevada por causa do logo; ver DESIGN-002), `#qrMeta` e o divisor-sanfona "Avançado" (`details.divider-toggle`, o mesmo visual do "Mais tipos" da home, fechado por padrão) com o seletor `#genEcl`.
- Modal `#qrModal`: largura 220, 300, 380 ou 460 px conforme o tamanho (máximo 88vw); fecha com ✕, com o fundo ou com Esc.
- View `#view-share`: QR, conteúdo interpretado e o botão "Criar o meu QR Code".

## 7. Permissões e manifest
- A área de transferência é usada só no gesto do usuário (copiar o link).
- A Web Share API não exige declaração.

## 8. Erros e casos de borda
| Situação | Comportamento |
|---|---|
| Falha ao rasterizar | toast "Falha ao exportar PNG" |
| Navegador sem `canShare` de arquivos | download do PNG |
| Usuário cancela o compartilhamento | silencioso |
| Falha ao copiar o link | toast "Não foi possível copiar" |
| Link sem `q` | ignorado; app normal |
| Valor inválido no link | trocado pelo padrão |
| Hex de 5 ou 7 dígitos | rejeitado |
| Conteúdo do link grande demais | segue o app normal, sem erro |
| Legenda igual ao padrão ou sem moldura | `cap` omitido |
| Logo pronto ativo | entra como `lg=<nome>` (+ `lc=1` se colorido); ao abrir, é redesenhado com as cores do link |
| Logo de imagem própria | não entra no link; aviso visível |

## 9. Testes
| Teste | Cobre |
|---|---|
| `share.test.ts` › `buildShareQuery` | EXP-F05, EXP-N05 |
| `share.test.ts` › `parseShareQuery`, round-trip | EXP-F06, EXP-N03 |
| `raster.test.ts` | EXP-F01, EXP-N01 |
| roteiro manual | EXP-F02 a EXP-F04, EXP-F07, EXP-N04 |

## 10. Plano de implementação
Concluído. Marcos: `9f0177b` (opções no link), `a44e7f6` (tamanho de exportação).

## 11. Decisões e alternativas descartadas
- **Fragmento `#` em vez de query:** o fragmento não vai ao servidor nem aos logs.
- **Omitir padrões:** URLs menores; o padrão é a fonte de verdade (`SHARE_DEFAULTS`).
- **Supersampling 4× + desfazer clip-path:** o `crispEdges` da lib deixava vãos de 1 px com módulos de tamanho fracionário.
- **Logo pronto pelo nome, imagem própria fora do link:** o site já tem os logos prontos, então basta o nome (poucos bytes). Uma imagem enviada viraria um data URL que incharia a URL além do limite prático dos mensageiros.
