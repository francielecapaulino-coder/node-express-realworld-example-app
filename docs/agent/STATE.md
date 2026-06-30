# STATE

State: PLANNED
Current phase: 5 — Qualidade (antecipada)
Last completed phase: none
Active work unit: docs/agent/work/001-playwright-e2e-branches

## Briefing — o que o próximo agente faz primeiro
1. Ler `docs/agent/OPERATING-GUIDE.md` e este `STATE.md`.
2. Ler `docs/agent/work/001-playwright-e2e-branches/PLAN.md` e `PROGRESS.md`.
3. Acionar o **Prompt 02 — Implementar** para executar a slice `001-playwright-e2e-branches`.

## Próxima ação segura
Implementar a slice `001-playwright-e2e-branches`: instalar `@playwright/test`,
criar `playwright.config.ts`, criar specs em `e2e/playwright/`, criar as duas
branches (`e2e/failing` e `e2e/passing`) conforme o PLAN.md.

## Não faça
- Não inventar requisitos de produto.
- Não escolher stack sem contexto.
- Não escrever código de produto antes de uma unidade de trabalho ser planejada.
- Não usar segredos/credenciais/dados sensíveis reais.
- Não commitar `documentação/`, `harness/`, `AGENTS.md`, `CLAUDE.md`.
- Não alterar o contrato RealWorld (rotas, envelopes, formato de erro) sem permissão.
- Não mudar arquitetura/schema Prisma além do previsto em §4/§5 do guia sem abrir issue `needs-decision`.
