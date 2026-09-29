# Spec — Personalização

Código: `src/qr/designer.ts` (fachada), `src/qr/generator.ts`, `src/qr/shapes.ts`,
`src/qr/customRenderer.ts`, `src/qr/matrix.ts`, `src/qr/logos.ts`, `src/qr/frames.ts`,
`src/qr/caption.ts`, `src/app.ts`.

A etapa 2 ("Personalizar", opcional) fica recolhida por padrão e tem cinco abas:
**Cor, Formas, Logo, Moldura e Avançado**. Toda mudança redesenha o QR ao vivo.

## Cor

| Controle | Padrão | Regra |
|---|---|---|
| Cor dos módulos (`fg`) | `#0f172a` | seletor + campo hex (aceita 3 ou 6 dígitos) |
| Fundo (`bg`) | `#ffffff` | desativado quando o fundo é transparente |
| Fundo transparente | desligado | remove o retângulo de fundo; o PNG sai com alfa |
| Moldura do olho | herda `fg` | vira uma cor própria assim que é alterada |
| Centro do olho | herda `fg` | idem |
| Paletas | — | Clássico, Azul, Verde, Roxo, Rosa, Invertido (definem `fg` e `bg`) |

Enquanto as cores dos olhos herdam `fg`, os seletores delas acompanham a cor dos módulos.

## Formas

Registro único em `shapes.ts`: cada forma é uma entrada num `Map`. Para adicionar
uma forma, basta registrá-la; ela aparece na UI e passa a ser aceita no link
compartilhado sem outra alteração.

**Corpo (13 formas)**

| Backend | Formas | Como desenha |
|---|---|---|
| `lib` | Contínuo, Arredondado, Pontos, Elegante, Elegante+, Extra | `qr-code-styling`, com módulos conectados |
| `custom` | Círculo, Losango, Coração, Estrela, Mais, Cruz, X | renderer próprio (`customRenderer.ts`), uma forma isolada por módulo a partir da matriz |

- **Moldura do olho:** Automático (combina com o corpo), Quadrado, Arredondado, Círculo.
- **Centro do olho:** Automático ou qualquer forma do corpo. Um centro em forma de
  ícone (losango, coração, estrela, mais, X, cruz) força o renderer `custom` mesmo
  com um corpo `lib`; caso contrário a lib o desenharia como quadrado.
- **Contorno:** Quadrado ou Círculo. O círculo só vale no backend `lib`; no
  `custom`, o contorno é sempre quadrado.

Zona de silêncio: 4 unidades (3,5 no contorno circular), com `UNIT = 1000/34`.
O espaço lógico é de 1000×1000 e o SVG é vetorial.

## Logo

- **12 logos prontos:** WhatsApp, Facebook, Instagram, Telegram, Telefone, E-mail,
  SMS, Wi-Fi, Link, Contato, Local e Evento.
- **Monocromático** (padrão ligado): o glifo usa `fg` sobre `bg` e acompanha as
  mudanças de cor. Desligado, usa a cor da marca com o glifo branco.
- **Imagem própria:** qualquer `image/*`, lida como data URL localmente (nada é
  enviado). Escolher uma imagem própria desmarca o logo pronto.
- O logo ocupa 40% do lado do QR, e os módulos atrás dele são ocultados.
- O logo **não** entra no link compartilhado (ver
  [exportacao-e-compartilhamento.md](exportacao-e-compartilhamento.md)).

## Moldura

| Estilo | Desenho |
|---|---|
| Nenhuma | só o QR |
| Cantos + legenda | colchetes nos quatro cantos |
| Borda + legenda | borda arredondada em volta do QR e da legenda |
| Faixa + legenda | faixa preenchida com a legenda em cor invertida |

- Legenda: padrão `ESCANEIE`, no máximo 45 caracteres.
- Layout (`caption.ts`): quebra em até 2 linhas equilibradas pela largura
  estimada. Prefere quebrar em espaço e parte uma palavra dominante se for
  preciso. A fonte vai de 3 a 1,9 unidade antes de aceitar overflow.
- A moldura trata o QR como caixa-preta: embute o SVG do QR (`QrRender`) num SVG
  externo (`frames.ts`).

## Correção de erro (Avançado)

| Seleção | Nível efetivo |
|---|---|
| **Automático** (padrão) | M; Q se o corpo ou o centro do olho for `custom`; H se houver logo |
| Baixa / Média | respeitado, mas sobe para Q se houver logo |
| Alta (Q) / Máxima (H) | respeitado |

O nível efetivo é o que aparece em "correção X" e o que vai no link compartilhado.

## Testes

`shapes.test.ts`, `customRenderer.test.ts`, `logos.test.ts`, `frames.test.ts` e
`libEye.integration.test.ts` (integração com a lib).
