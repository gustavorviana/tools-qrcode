# SPEC-005 — App instalável e offline (PWA)

| | |
|---|---|
| **Status** | Implementado |
| **Design** | [DESIGN-005](../design/005-pwa-offline.md) |
| **Módulo** | `public/manifest.webmanifest`, `public/sw.js`, `src/app.ts` |
| **Atualizado em** | 2026-09-30 |

## 1. Problema
Uma ferramenta de QR é usada em momentos pontuais, muitas vezes sem internet boa (evento, loja, viagem). Instalar um app nativo só para isso é pesado, e os apps das lojas geralmente vêm com anúncios e permissões demais. Abrir o site toda vez depende de conexão.

## 2. Objetivos
- Instalar o site como app, com ícone na tela inicial e janela própria.
- Funcionar offline depois da primeira visita, inclusive a leitura de códigos de barras.
- Integrar com o sistema: atalhos, abrir imagens com o app e receber imagens compartilhadas.
- Atualizar sozinho a cada release, sem servir versão velha.

## 3. Cenários de uso
- Uso o app com frequência e quero abrir direto na tela de leitura: seguro o ícone e toco no atalho "Ler".
- Recebi uma foto com QR na galeria: toco em Compartilhar → QR Utils e o app já mostra o conteúdo.
- Estou num lugar sem sinal e preciso gerar o QR do Wi-Fi: o app instalado funciona.

## 4. Requisitos funcionais
| ID | Requisito | Prioridade |
|---|---|---|
| PWA-F01 | Manifesto com nome, ícones (incluindo maskable), screenshots e `display: standalone` | Must |
| PWA-F02 | Barra de instalação no Android/desktop (prompt nativo) e instruções no iOS | Should |
| PWA-F03 | Dispensar a barra de instalação e lembrar a escolha | Should |
| PWA-F04 | Cartão "Instalar como app" na seção Sobre da home, oculto quando já instalado ou dentro do Viana Utils ([SPEC-008](008-viana-utils.md)) | Could |
| PWA-F05 | Atalhos "Criar" e "Ler" no ícone do app | Could |
| PWA-F06 | Abrir imagens com o app (`file_handlers`) e ler o código | Could |
| PWA-F07 | Receber imagens compartilhadas por outros apps (`share_target`) e ler o código | Should |
| PWA-F08 | Service worker com cache offline do app e do `.wasm` | Must |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| PWA-N01 | Com o app instalado e sem rede, gerar e ler funcionam. |
| PWA-N02 | Cada build com conteúdo diferente troca o cache (versão + hash de JS, CSS e páginas); o HTML é revalidado por ETag a cada navegação. |
| PWA-N03 | Uma falha em um arquivo do precache não impede o cache dos demais. |
| PWA-N04 | O único dado persistido é a preferência `installDismissed`. |
| PWA-N05 | Exige HTTPS (ou `localhost`). |

## 6. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| `installDismissed` (`localStorage`) | ausente | `'1'` após dispensar |
| Versão do cache | versão do build + hash do conteúdo | `qr-utils-<versão>-<hash>` |

## 7. Critérios de aceite
| ID | Requisito | Critério | Verificação |
|---|---|---|---|
| AC-PWA-F01.1 | PWA-F01 | O Lighthouse deve reconhecer o app como instalável. | manual (Lighthouse) |
| AC-PWA-F02.1 | PWA-F02 | Quando o navegador dispara `beforeinstallprompt`, a barra de instalação deve aparecer; no iOS, devem aparecer as instruções. | manual |
| AC-PWA-F03.1 | PWA-F03, PWA-N04 | Depois que a pessoa dispensa a barra, ela não deve voltar em novas visitas, e `installDismissed` deve ser `'1'`. | manual |
| AC-PWA-F04.1 | PWA-F04 | Com o app já instalado ou dentro do Viana Utils, o cartão "Instalar como app" não deve aparecer. | manual |
| AC-PWA-F05.1 | PWA-F05 | O atalho "Ler" deve abrir direto em `/ler/`, e o "Criar" deve abrir na home. | manual |
| AC-PWA-F06.1 | PWA-F06 | Quando a pessoa abre uma imagem com o app, o conteúdo lido deve aparecer. | manual |
| AC-PWA-F07.1 | PWA-F07 | Quando a pessoa compartilha uma imagem da galeria para o app, o conteúdo lido deve aparecer. | manual |
| AC-PWA-F08.1 | PWA-F08, PWA-N01 | Com o app instalado e a rede desligada, o app deve abrir, gerar um QR e ler um código de barras por imagem. | manual |
| AC-PWA-F08.2 | PWA-F08 | Ao abrir qualquer página (ex.: `/whatsapp/`), o service worker deve ser registrado a partir de `/sw.js` com escopo `/`, sem nenhum 404. | manual (DevTools → Application) |
| AC-PWA-N02.1 | PWA-N02 | Depois de um deploy com conteúdo diferente, recarregar o app deve mostrar a nova versão. | manual |
| AC-PWA-N03.1 | PWA-N03 | Quando um arquivo do precache falha, os demais devem ser cacheados mesmo assim. | manual (DevTools) |

## 8. Fora de escopo
- Publicação nas lojas (Play Store, App Store).
- Notificações push e sincronização em segundo plano.
- Aviso de "nova versão disponível" (ver Questões em aberto).
- Persistir qualquer dado além de `installDismissed`.

## 9. Questões em aberto
- **Aviso de "nova versão disponível"?** Provisório: não; o HTML é revalidado a cada navegação.
- **Ícone `apple-touch-icon` em SVG:** o iOS não usa SVG para esse ícone. Provisório: manter; avaliar um PNG 180 px.
