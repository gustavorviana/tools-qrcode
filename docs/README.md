# Documentação do produto

Aqui fica o **porquê** e o **como** de cada util do QR Utils. O README da raiz
continua sendo o guia de desenvolvimento.

- `spec/NNN-nome.md`: o quê e por quê (problema, objetivos, requisitos, aceite).
- `design/NNN-nome.md`: como funciona (módulos, dados, fluxos, erros, testes, decisões).
- Nomenclatura do Spec-Driven Development: a **spec** é a fonte da verdade funcional; o **design** (plan) deriva dela.
- A spec e o design de uma util têm o **mesmo número** e se referenciam no cabeçalho.
- `tasks/NNN-nome.md`: tarefas ordenadas, cada uma ligada a requisitos e critérios. Obrigatório para mudanças novas; as utils já implementadas registram os marcos na seção "Plano de implementação" do design.
- [constitution.md](constitution.md): princípios que valem para todas as utils.
- Modelos: [spec/_template.md](spec/_template.md), [design/_template.md](design/_template.md) e [tasks/_template.md](tasks/_template.md).

## Índice

| # | Util | Spec | Design | Status |
|---|---|---|---|---|
| 000 | Produto / arquitetura | [SPEC-000](spec/000-qr-utils.md) | [DESIGN-000](design/000-arquitetura.md) | Implementado |
| 001 | Geração | [SPEC-001](spec/001-geracao.md) | [DESIGN-001](design/001-geracao.md) | Implementado |
| 002 | Personalização | [SPEC-002](spec/002-personalizacao.md) | [DESIGN-002](design/002-personalizacao.md) | Implementado |
| 003 | Exportação e compartilhamento | [SPEC-003](spec/003-exportacao-compartilhamento.md) | [DESIGN-003](design/003-exportacao-compartilhamento.md) | Implementado |
| 004 | Leitura | [SPEC-004](spec/004-leitura.md) | [DESIGN-004](design/004-leitura.md) | Implementado |
| 005 | PWA e offline | [SPEC-005](spec/005-pwa-offline.md) | [DESIGN-005](design/005-pwa-offline.md) | Implementado |
| 006 | Privacidade | [SPEC-006](spec/006-privacidade.md) | [DESIGN-006](design/006-privacidade.md) | Implementado |
| 007 | Site multipágina e SEO | [SPEC-007](spec/007-site-multipagina.md) | [DESIGN-007](design/007-site-multipagina.md) | Implementado |
| 008 | Integração com o Viana Utils | [SPEC-008](spec/008-viana-utils.md) | [DESIGN-008](design/008-viana-utils.md) | Implementado |

## Convenções

- IDs de requisito usam o prefixo da util: `APP`, `GEN`, `CUS`, `EXP`, `LER`, `PWA`, `PRV`, `WEB`, `VIA`.
  Critérios de aceite usam `AC-<ID do requisito>.<n>` (ex.: `AC-LER-F07.2`). A seção "Testes" do design aponta quais IDs cada teste cobre.
- IDs nunca são renumerados; item removido fica marcado como descontinuado.
- Ambiguidade não resolvida fica marcada `[NEEDS CLARIFICATION: ...]` até ser decidida.
- Status: `Rascunho` → `Aprovado` → `Em implementação` → `Implementado`.
- Mudou o comportamento? Atualize a spec primeiro, depois o design e as tasks, no mesmo PR, com a data em "Atualizado em".
- Util nova: copie os modelos com o próximo número livre.
