# Documentação do produto

Esta pasta guarda o **porquê** do QR Utils: o que o produto é, para quem, quais
princípios guiam as decisões e como cada recurso funciona hoje. O README da raiz
continua sendo o guia de desenvolvimento; aqui fica a visão de produto e as
especificações.

## Estrutura

| Documento | Conteúdo |
|---|---|
| [prd.md](prd.md) | PRD do produto como existe hoje: visão, problema, público, princípios, escopo e decisões registradas. |
| [specs/geracao.md](specs/geracao.md) | Geração: tipos de conteúdo, formulários e o payload exato de cada tipo. |
| [specs/personalizacao.md](specs/personalizacao.md) | Cores, formas (corpo/olhos/contorno), logos, molduras e correção de erro. |
| [specs/exportacao-e-compartilhamento.md](specs/exportacao-e-compartilhamento.md) | PNG, SVG, compartilhar imagem e link compartilhável (formato da URL). |
| [specs/leitura.md](specs/leitura.md) | Leitor por câmera/imagem, motores de decodificação, formatos e interpretação do conteúdo (inclui Pix). |
| [specs/pwa-e-offline.md](specs/pwa-e-offline.md) | Instalação, service worker, cache offline, atalhos, abrir arquivo e share target. |
| [specs/privacidade.md](specs/privacidade.md) | Fluxos de dados, o que sai e o que não sai do dispositivo, exceções. |
| [specs/arquitetura-e-build.md](specs/arquitetura-e-build.md) | Módulos, build self-contained, testes, CI, versionamento e deploy. |

## Convenções

- Um PRD descreve **o quê e por quê**; uma spec descreve **como funciona** (regras,
  formatos, limites). Uma spec nunca contradiz o PRD: se o comportamento mudar,
  atualize os dois no mesmo PR.
- Recursos novos entram como um PRD próprio (`prd-<tema>.md`) quando têm motivação
  independente (ex.: SEO), e como spec em `specs/` quando alteram comportamento.
- Estado descrito aqui reflete o código em `main`. Cite arquivos por caminho
  (`src/qr/share.ts`) para facilitar a verificação.
