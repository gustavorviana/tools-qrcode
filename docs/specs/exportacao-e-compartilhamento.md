# Spec — Exportação e compartilhamento

Código: `src/qr/designer.ts` (`toCanvas`, `toSVGBlob`), `src/qr/raster.ts`,
`src/qr/share.ts`, `src/app.ts` (`downloadPNG`, `downloadSVG`, `shareQR`, `shareLink`,
`renderShared`, `exitShared`).

## PNG

- Tamanhos: **512, 1024 (padrão), 2048 e 4096 px** de largura do QR. A altura
  cresce com a faixa da legenda quando há moldura.
- Rasterização com supersampling de 4×: desenha o SVG em 4× o tamanho e reduz
  com `imageSmoothingQuality = 'high'`.
- `rasterizeSVG` desfaz os `<clipPath>` da `qr-code-styling`, trocando-os por
  grupos preenchidos com um stroke fino. Isso elimina as linhas claras entre
  módulos vizinhos. Só a rasterização é afetada; o SVG exportado continua intacto.
- Com fundo transparente, o canvas não é preenchido e o PNG sai com alfa.
- Arquivo: `qrcode.png`.

## SVG

- O último SVG final (QR + moldura) é baixado como está, vetorial, em `qrcode.svg`.

## Compartilhar imagem

- Gera o PNG no tamanho escolhido e usa `navigator.share({ files })`.
- Sem suporte a compartilhar arquivos, cai para o download do PNG.
- Cancelar o compartilhamento não mostra erro.

## Ampliar

- Tocar no QR abre um modal. A largura exibida depende do tamanho escolhido
  (220, 300, 380 ou 460 px, limitada a 88vw). O modal tem os botões Baixar PNG
  e Compartilhar; Esc fecha.

## Link compartilhável

Formato: `https://qr.tools.grviana.com.br/#q=<texto>&<opções>`

- Os dados ficam no **fragmento** (`#`), que o navegador não envia ao servidor.
- Só entra o que difere do padrão (`SHARE_DEFAULTS`), para manter a URL curta.
- Na leitura, o app também aceita `?q=…` na query. Cada valor é validado; um valor
  inválido é ignorado e o padrão é usado no lugar.

| Parâmetro | Significado | Valores |
|---|---|---|
| `q` | conteúdo (obrigatório) | texto |
| `e` | correção de erro efetiva | `LOW`, `MEDIUM`, `QUARTILE`, `HIGH` |
| `fg`, `bg` | cores | hex sem `#` (3, 4, 6 ou 8 dígitos) |
| `efc`, `ecc` | cor da moldura / do centro do olho | hex |
| `bt` | fundo transparente | `1` |
| `s` | forma do corpo | chaves de `BODY` |
| `ef` | moldura do olho | chaves de `EYE_FRAME` |
| `ec` | centro do olho | `auto` + chaves de `BODY` |
| `qs` | contorno | `square`, `circle` |
| `fr` | moldura | `none`, `corners`, `border`, `label` |
| `cap` | legenda (só se `fr` ≠ `none` e ≠ `ESCANEIE`) | texto |
| `sz` | tamanho do PNG | `512`, `1024`, `2048`, `4096` |

- **O logo nunca entra** (é imagem). Com logo ativo, a UI avisa que ele não vai no link.
- Compartilhamento: usa `navigator.share({ url })`; sem ele, copia para a área de
  transferência ("Link copiado!").

### Abrir um link compartilhado

- Na inicialização e em `hashchange`, se houver `q`, o app aplica as opções,
  gera o QR e mostra a visualização **"QR Code compartilhado"**. As abas ficam
  ocultas e o conteúdo aparece interpretado, como no leitor.
- **Criar o meu QR Code** (`exitShared`): limpa o hash, os campos e a
  personalização (volta a tudo padrão, para as opções do link não vazarem no
  próximo QR) e abre a aba Gerar.
- Se o conteúdo for inválido ou grande demais, o app segue no modo normal, sem erro.

## Testes

`tests/share.test.ts` (serialização e validação do link) e `tests/raster.test.ts`.
