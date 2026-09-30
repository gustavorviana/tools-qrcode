# DESIGN-002 — Personalização do QR Code

| | |
|---|---|
| **Status** | Implementado |
| **Spec** | [SPEC-002](../spec/002-personalizacao.md) |
| **Módulos** | `src/qr/designer.ts`, `src/qr/generator.ts`, `src/qr/shapes.ts`, `src/qr/customRenderer.ts`, `src/qr/matrix.ts`, `src/qr/logos.ts`, `src/qr/frames.ts`, `src/qr/caption.ts`, `src/qr/ecl.ts`, `src/app.ts` |
| **Atualizado em** | 2026-09-30 |

## 1. Resumo
O `QrGenerator` codifica sempre com a `qr-code-styling` e escolhe um de dois backends de desenho:
- **`lib`**: formas conectadas, desenhadas pela própria lib.
- **`custom`**: o renderer próprio desenha uma forma isolada por módulo a partir da matriz extraída da lib.

As formas, os logos e as molduras são registros consultados por chave, sem `switch` por forma. A moldura embute o SVG do QR num SVG externo. O `App` reage a cada controle e redesenha com debounce de 120 ms.

## 2. Módulos e dependências
| Módulo | Papel |
|---|---|
| `designer.ts` | fachada `QRDesigner` (estado + `toSVG`) |
| `generator.ts` | `QrGenerator.generate()`: opções da lib, escolha do backend |
| `shapes.ts` | registros `BODY`, `EYE_FRAME`; `LIB_EYE_FRAME`, `LIB_EYE_CENTER`, `CUSTOM_ONLY_CENTER` |
| `customRenderer.ts` | `renderCustomQr(matrix, opts)`, puro |
| `matrix.ts` | `extractMatrix(qr)`: único acesso ao interno `_qr` da lib |
| `logos.ts` | registro `LOGOS`, `logoSvg`, `logoDataUrl` |
| `frames.ts`, `caption.ts` | `Frame` e subclasses, `createFrame`, layout da legenda |

## 3. Modelo de dados
```ts
type Ecl = 'LOW' | 'MEDIUM' | 'QUARTILE' | 'HIGH';
type ModuleShape = 'solid' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
  | 'diamond' | 'heart' | 'star' | 'plus' | 'x' | 'cross' | 'circle';
type EyeFrameShape = 'auto' | 'square' | 'rounded' | 'circle';
type EyeCenterShape = 'auto' | ModuleShape;
type FrameStyle = 'none' | 'corners' | 'border' | 'label';
interface QrColors { fg: string; bg: string; eyeFrame?: string; eyeCenter?: string }
interface QrRender { svg: string; size: number; moduleCount: number }
interface FramedSvg { svg: string; width: number; height: number }
interface BodyShapeDef { name; label; backend: 'lib' | 'custom'; lib?; autoEye?; draw: DrawFn }
interface LogoDef { name: string; label: string; bg: string; bgSvg?: string; glyph: Glyph }
```
Constantes: `BASE = 1000` (lado lógico) e `UNIT = 1000/34`. Zona de silêncio de `4·UNIT` (`3,5·UNIT` no contorno circular). O logo ocupa 40% do lado; no backend `custom`, os módulos sob ele ficam ocultos com margem de 2 módulos.

## 4. Componentes
```ts
class QRDesigner {
  text; ecl; colors; shape; eyeFrameShape; eyeCenterShape; bgTransparent; qrShape; logo; frame
  readonly hasLogo: boolean; readonly ready: boolean; readonly info: QrInfo
  toSVG(): Promise<string>
}
const registerBody: (d: BodyShapeDef) => void
const registerEyeFrame: (d: EyeFrameDef) => void
function eyeCenterOptions(): CenterOption[]
const centerNeedsCustom: (s: EyeCenterShape) => boolean
function renderCustomQr(matrix: QrMatrix, opt: CustomRenderOptions): string
function logoSvg(def: LogoDef, style?: LogoStyle): string
const createFrame: (style: FrameStyle, caption?: string) => Frame
abstract class Frame { apply(qr: QrRender, colors: FrameColors): FramedSvg; captionHeight(size: number): number }
const splitTwoLines: (s: string) => string[]
```
No `App`: `setColor`, `setHex`, `applyPreset`, `setBgTransparent`, `setEyeColor`, `setEyeHex`, `setShape`, `setEyeFrameShape`, `setEyeCenterShape`, `setQrShape`, `setLogoPreset`, `setLogoMono`, `onLogo`, `removeLogo`, `setFrame`, `setCaption`, `setCustomTab`, `effectiveEcl` (privado).

## 5. Fluxos
**Geração (`QrGenerator.generate`)**
1. `custom = BODY[shape].backend === 'custom' || centerNeedsCustom(eyeCenterShape)`.
2. Monta as opções da lib: `qrShape` (forçado para `square` se `custom`), margem, ECL, formas de olho (`auto` usa o `lib` do corpo), cores e logo (só no backend `lib`).
3. Gera o SVG da lib e lê `moduleCount`.
4. Se `custom`: `renderCustomQr(extractMatrix(qr), …)` e descarta o SVG da lib. Se não, usa o SVG da lib sem o prólogo XML.
5. `Frame.apply(qr, colors)` produz o SVG final.

**Correção de erro efetiva (`resolveEcl` em `src/qr/ecl.ts`, chamada por `effectiveEcl`)**
- Automático: `MEDIUM`; `QUARTILE` se o corpo ou o centro forem `custom`; `HIGH` se houver logo.
- Manual: respeita a escolha, mas com logo e nível L ou M sobe para `QUARTILE` e devolve `raised: true`, que exibe o aviso `#eclNote` (CUS-F14).

**Logo:** um logo pronto vira `logoDataUrl(logoSvg(def, { mono, fg, bg }))`. No modo mono, é refeito a cada mudança de `fg`, `bg` ou transparência. Imagem própria: `FileReader.readAsDataURL`, que desmarca o logo pronto.

**Ao vivo:** todo setter chama `liveUpdate()`, que só age se `live` estiver ligado e aplica debounce de 120 ms antes de `regenerate()`.

## 6. UI
`<details class="accordion">` "Personalizar (opcional)", fechado por padrão, com as abas `#custTabs`. A correção de erro (`#genEcl`) e o aviso `#eclNote` ficam na etapa Baixar, dentro do divisor "Avançado" ([DESIGN-003](003-exportacao-compartilhamento.md)), onde a pessoa vê o QR e o aviso juntos:

| Aba | Controles |
|---|---|
| Cor | `#c_fg`, `#c_bg` (+hex), `#bgTransp`, `#c_ef`, `#c_ec`, `#colorPresets` |
| Formas | `#shapeOpts`, `#eyeFrameOpts`, `#eyeCenterOpts` (gerados dos registros com prévia SVG), `#qrShapeOpts` |
| Logo | `#logoMono`, `#logoPresets` (gerado de `LOGOS`), "Escolher imagem", "Remover logo" |
| Moldura | `#frameOpts`, `#c_caption` (visível se moldura ≠ nenhuma) |

## 7. Permissões e manifest
Nenhuma. A imagem do logo é escolhida por `<input type="file" accept="image/*">`.

## 8. Erros e casos de borda
| Situação | Comportamento |
|---|---|
| Hex inválido digitado | ignorado até ficar válido (3 ou 6 dígitos) |
| Hex de 3 dígitos | expandido para 6 |
| Fundo transparente | seletor de fundo desativado; o logo mono usa o fundo do QR |
| Contorno circular + corpo `custom` | o contorno vira quadrado |
| Centro ícone + corpo `lib` | força o backend `custom` |
| Logo com correção manual L/M | sobe para Q e mostra `#eclNote` |
| Legenda longa | até 2 linhas equilibradas; a fonte cai de 3 até 1,9 unidade |
| Legenda com `<`, `&`, `"` | escapada no SVG |

## 9. Testes
| Teste | Cobre |
|---|---|
| `shapes.test.ts` | CUS-F05 a CUS-F07, CUS-N05 |
| `customRenderer.test.ts` | CUS-F03 a CUS-F07, CUS-F10 |
| `libEye.integration.test.ts` | CUS-F07 (centro ícone com corpo lib), CUS-F09 |
| `logos.test.ts` | CUS-F09 |
| `frames.test.ts` | CUS-F11 |
| `ecl.test.ts` | CUS-F12, CUS-F14, CUS-N03 (regra de `resolveEcl`) |
| roteiro manual (leitura com câmera; aviso `#eclNote`) | CUS-N03, CUS-F13, CUS-F14 |

## 10. Plano de implementação
Concluído. Marcos: `9f0177b` (personalização ao vivo), `547427b` (formas e cores de olho, fundo transparente), `d499d13` (logos prontos, correção automática, monocromático).

## 11. Decisões e alternativas descartadas
- **Dois backends em vez de só o renderer próprio:** a lib já desenha bem as formas conectadas; o renderer próprio cobre só o que ela não faz.
- **Matriz lida do interno `_qr` da lib**, isolada em `matrix.ts`: evita um segundo codificador. Se a lib mudar, só esse arquivo quebra.
- **Registros em vez de `switch`:** adicionar uma forma não exige tocar em UI, gerador nem validação do link.
- **Correção automática como padrão:** quem adiciona logo não sabe que precisa de H.
- **Logo mono como padrão:** combina com qualquer paleta sem a pessoa ajustar nada.
