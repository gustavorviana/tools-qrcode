# PRD-005 — App instalável e offline (PWA)

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-005](../specs/005-pwa-offline.md) |
| **Módulo** | `public/manifest.webmanifest`, `public/sw.js`, `src/app.ts` |
| **Atualizado em** | 2026-09-29 |

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
| PWA-F04 | Cartão "Instalar como app" na seção Sobre da home, oculto quando já instalado ou dentro do Viana Utils ([PRD-008](008-viana-utils.md)) | Could |
| PWA-F05 | Atalhos "Gerar" e "Ler" no ícone do app | Could |
| PWA-F06 | Abrir imagens com o app (`file_handlers`) e ler o código | Could |
| PWA-F07 | Receber imagens compartilhadas por outros apps (`share_target`) e ler o código | Should |
| PWA-F08 | Service worker com cache offline do app e do `.wasm` | Must |

## 5. Requisitos não funcionais
| ID | Requisito |
|---|---|
| PWA-N01 | Com o app instalado e sem rede, gerar e ler funcionam. |
| PWA-N02 | Cada release troca o cache; o HTML é revalidado por ETag a cada navegação. |
| PWA-N03 | Uma falha em um arquivo do precache não impede o cache dos demais. |
| PWA-N04 | O único dado persistido é a preferência `installDismissed`. |
| PWA-N05 | Exige HTTPS (ou `localhost`). |

## 6. Configurações
| Configuração | Padrão | Faixa |
|---|---|---|
| `installDismissed` (`localStorage`) | ausente | `'1'` após dispensar |
| Versão do cache | versão do build | `qr-utils-<versão>` |

## 7. Critérios de aceite
- [ ] O Lighthouse reconhece o app como instalável.
- [ ] Após instalar e desligar a rede, o app abre, gera um QR e lê um código de barras por imagem.
- [ ] O atalho "Ler" abre direto em `/ler/`.
- [ ] Compartilhar uma imagem da galeria para o app mostra o conteúdo lido.
- [ ] Após um deploy, recarregar o app mostra a nova versão.
- [ ] Após dispensar a barra, ela não volta em novas visitas.

## 8. Questões em aberto
- **Aviso de "nova versão disponível"?** Provisório: não; o HTML é revalidado a cada navegação.
- **Ícone `apple-touch-icon` em SVG:** o iOS não usa SVG para esse ícone. Provisório: manter; avaliar um PNG 180 px.
