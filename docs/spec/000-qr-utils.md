# SPEC-000 — QR Utils (produto)

| | |
|---|---|
| **Status** | Implementado |
| **Design** | [DESIGN-000](../design/000-arquitetura.md) |
| **Módulo** | `src/`, `build.mjs`, `public/`, `.github/workflows/` |
| **Atualizado em** | 2026-09-30 |

Spec guarda-chuva: define a visão e os princípios que valem para todas as utils.
Cada util tem a sua spec (001 a 008).

## 1. Problema
Quem precisa gerar ou ler um QR Code costuma cair em ferramentas que:
- enviam o conteúdo (senha de Wi-Fi, contato, dados de pagamento) para um servidor;
- geram QR "dinâmico" que aponta para um redirecionador e para de funcionar quando o plano gratuito acaba;
- pedem cadastro ou cobram por recursos básicos (SVG, logo, cores);
- carregam anúncios, rastreadores e scripts de terceiros;
- não funcionam sem internet.

## 2. Objetivos
- Gerar e ler QR Codes **sem que nada saia do navegador**.
- Ser gratuito, sem cadastro, sem anúncios e sem rastreamento.
- Funcionar offline e ser instalável como app.
- Ser auditável: código aberto (MIT) e tudo servido pela própria origem, sem CDN nem scripts de terceiros.
- Manter o fluxo principal curto (conteúdo → gerar → baixar) e a personalização opcional.

## 3. Cenários de uso
- Estou montando a recepção do escritório, quero um QR do Wi-Fi e **não quero digitar a senha num site qualquer**; espero gerar no navegador e imprimir.
- Tenho um pequeno negócio e quero um QR do WhatsApp com a cor e o logo da marca; espero baixar um PNG grande e um SVG para a gráfica, sem pagar.
- Recebi um print com um QR de Pix; quero **conferir o recebedor e o valor antes de pagar**.
- Estou sem sinal num evento e preciso ler um código; espero que o app instalado funcione offline.

## 4. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| APP-F01 | Gerar QR Code a partir de vários tipos de conteúdo ([SPEC-001](001-geracao.md)) | Must |
| APP-F02 | Personalizar a aparência do QR ([SPEC-002](002-personalizacao.md)) | Should |
| APP-F03 | Exportar e compartilhar o QR ([SPEC-003](003-exportacao-compartilhamento.md)) | Must |
| APP-F04 | Ler QR Code e código de barras ([SPEC-004](004-leitura.md)) | Must |
| APP-F05 | Instalar como app e usar offline ([SPEC-005](005-pwa-offline.md)) | Should |
| APP-F06 | Explicar à pessoa quais dados saem do dispositivo ([SPEC-006](006-privacidade.md)) | Must |
| APP-F07 | Seção "Sobre" com créditos das bibliotecas e link para o repositório | Could |
| APP-F08 | Site multipágina: home com cards e uma página indexável por tipo ([SPEC-007](007-site-multipagina.md)) | Must |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| APP-N01 | Local-first: nenhum conteúdo gerado ou lido é enviado a servidores. |
| APP-N02 | Sem cookies, analytics, pixels ou scripts de terceiros. |
| APP-N03 | Recursos externos só com consentimento explícito (hoje: o mapa do OSM). |
| APP-N04 | QR estático: o código contém o dado final e nunca expira. |
| APP-N05 | Tudo servido pela própria origem: HTML estático por página, um `app.js` e um `app.css` compartilhados (mais o `phone.js`, só nas páginas com telefone), sem CDN em runtime ([SPEC-007](007-site-multipagina.md)). |
| APP-N06 | Interface em pt-BR, responsiva e usável no celular. |
| APP-N07 | Hospedagem apenas estática; sem código de servidor. |
| APP-N08 | Todo PR para `main` passa typecheck, testes e build no CI, e a pipeline de release roda typecheck e testes de novo na `main` antes do deploy (falhou → não publica). |

## 6. Configurações
Não há configurações globais. O único dado persistido é `installDismissed` ([SPEC-005](005-pwa-offline.md)).

## 7. Critérios de aceite
Os requisitos APP-F01 a APP-F08 delegam às specs das utils; o aceite deles é o aceite de cada spec.

| ID | Requisito | Critério | Verificação |
|---|---|---|---|
| AC-APP-F07.1 | APP-F07 | Quando a pessoa abre `/#sobre`, a home deve mostrar os créditos das bibliotecas e o link para o repositório. | `site.test.ts` (existência do `#sobre`) + manual |
| AC-APP-N01.1 | APP-N01 | Quando a pessoa gera e lê um QR com a aba Rede aberta, o app não deve fazer nenhuma requisição fora da origem. | manual (DevTools) |
| AC-APP-N02.1 | APP-N02, APP-N05 | Nenhum HTML em `dist/` deve carregar `<script src>` ou `<link rel="stylesheet">` de outra origem. | `site.test.ts` |
| AC-APP-N03.1 | APP-N03 | Ver AC-PRV-F03.1. | — |
| AC-APP-N04.1 | APP-N04 | Dado um QR gerado, quando ele é lido, o texto obtido deve ser o dado final (sem redirecionador). | manual |
| AC-APP-N05.1 | APP-N01, APP-N05 | Quando a rede está desligada após a primeira visita, o app deve abrir, gerar e ler. | manual |
| AC-APP-N06.1 | APP-N06 | Em 360 px de largura, nenhuma página deve ter rolagem horizontal. | manual |
| AC-APP-N08.1 | APP-N08 | Quando um PR para `main` é aberto, o CI deve rodar typecheck, testes e build, e o merge deve ficar bloqueado se algum falhar (branch protection em `main`). | CI |

## 8. Fora de escopo
- QR dinâmico, encurtador ou qualquer redirecionador próprio.
- Contas, login, histórico ou sincronização entre dispositivos.
- Backend, API pública ou processamento no servidor.
- Monetização (anúncios, planos pagos).
- Idiomas além do pt-BR nesta fase.

## 9. Questões em aberto
- **Como medir sucesso sem rastrear?** Provisório: Google Search Console, Bing Webmaster, métricas agregadas da Cloudflare e estrelas/issues no GitHub.
- **Visibilidade na busca:** tratada no [SPEC-007](007-site-multipagina.md); acompanhar pelo Search Console.
