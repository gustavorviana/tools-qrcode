# Documentação do produto

Aqui fica o **porquê** e o **como** de cada util do QR Utils. O README da raiz
continua sendo o guia de desenvolvimento.

- `prd/NNN-nome.md`: o quê e por quê (problema, objetivos, requisitos, aceite).
- `specs/NNN-nome.md`: como funciona (módulos, dados, fluxos, erros, testes, decisões).
- O PRD e a spec de uma util têm o **mesmo número** e se referenciam no cabeçalho.
- Modelos: [prd/_template.md](prd/_template.md) e [specs/_template.md](specs/_template.md).

## Índice

| # | Util | PRD | Spec | Status |
|---|---|---|---|---|
| 000 | Produto / arquitetura | [PRD-000](prd/000-qr-utils.md) | [SPEC-000](specs/000-arquitetura.md) | Implementado |
| 001 | Geração | [PRD-001](prd/001-geracao.md) | [SPEC-001](specs/001-geracao.md) | Implementado |
| 002 | Personalização | [PRD-002](prd/002-personalizacao.md) | [SPEC-002](specs/002-personalizacao.md) | Implementado |
| 003 | Exportação e compartilhamento | [PRD-003](prd/003-exportacao-compartilhamento.md) | [SPEC-003](specs/003-exportacao-compartilhamento.md) | Implementado |
| 004 | Leitura | [PRD-004](prd/004-leitura.md) | [SPEC-004](specs/004-leitura.md) | Implementado |
| 005 | PWA e offline | [PRD-005](prd/005-pwa-offline.md) | [SPEC-005](specs/005-pwa-offline.md) | Implementado |
| 006 | Privacidade | [PRD-006](prd/006-privacidade.md) | [SPEC-006](specs/006-privacidade.md) | Implementado |

## Convenções

- IDs de requisito usam o prefixo da util: `APP`, `GEN`, `CUS`, `EXP`, `LER`, `PWA`, `PRV`.
  A seção "Testes" da spec aponta quais IDs cada teste cobre.
- Status: `Rascunho` → `Aprovado` → `Em implementação` → `Implementado`.
- Mudou o comportamento? Atualize o PRD e a spec no mesmo PR, com a data em "Atualizado em".
- Util nova: copie os modelos com o próximo número livre.
