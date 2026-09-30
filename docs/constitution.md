# Constituição do QR Utils

| | |
|---|---|
| **Status** | Rascunho |
| **Atualizado em** | 2026-09-30 |

Princípios que valem para todas as utils. Uma spec ou design que contrarie um deles precisa de um ADR que justifique a exceção.
A coluna "Origem" aponta os requisitos que já expressavam o princípio; eles continuam valendo nas specs, com os mesmos IDs.

| ID | Princípio | Origem |
|---|---|---|
| C-01 | **Local-first.** Nenhum conteúdo gerado ou lido sai do dispositivo. | APP-N01, GEN-N01, CUS-N01, LER-N01, PRV-N01 |
| C-02 | **Sem terceiros.** Sem cookies, analytics, pixels, CDN ou scripts de outra origem; dependências de runtime são embutidas ou servidas pela própria origem. | APP-N02, APP-N05, PRV-N02, PRV-N04, WEB-N02 |
| C-03 | **Exceção só com consentimento.** Qualquer requisição externa exige ação explícita da pessoa e está documentada na página Privacidade (hoje, só o mapa do OSM). | APP-N03, GEN-N03, PRV-F03 |
| C-04 | **QR estático.** O código contém o dado final e nunca depende de redirecionador. | APP-N04 |
| C-05 | **Offline.** Tudo o que gera ou lê funciona sem rede após a primeira visita. | PWA-N01, WEB-N05, LER-N03 |
| C-06 | **Hospedagem estática.** Sem código de servidor; o HTML sai pronto do build. | APP-N07, WEB-N04 |
| C-07 | **pt-BR e celular primeiro.** Interface em pt-BR, legível a partir de 360 px. | APP-N06, WEB-N06 |
| C-08 | **Qualidade no CI.** Todo PR para `main` passa typecheck, testes e build. | APP-N08 |
| C-09 | **Lógica pura é testada.** Formato de payload, interpretação, formas e link compartilhado ficam em funções puras com teste automatizado. | seções "Testes" dos designs |
| C-10 | **Spec viva.** Mudança de comportamento atualiza a spec primeiro, depois o design e as tasks, no mesmo PR; a página Privacidade acompanha qualquer mudança nos fluxos de dados. | PRV-N03, [README](README.md) |
