# PROGRESS — 001-playwright-e2e-branches

State: PLANNED

## Timeline
| Data/hora | Papel | State | Evidência |
|---|---|---|---|
| 2026-06-26 | planner | PLANNED | PLAN.md criado; pre-flight aprovado pelo usuário (Opção A — bookmark 404) |

## Decisões
- Teste que falha na branch `e2e/failing`: `POST /api/articles/:slug/bookmark` → 404 natural
  (endpoint não implementado); assertion espera 201. Decisão do usuário (Opção A).
- Teste stale Jest (`server.spec.ts`) não será alterado nesta slice (escopo da Fase 2).
- `webServer` Playwright usará `npx nx serve api`; exige Postgres + DATABASE_URL local.

## Arquivos alterados
-

## Comandos e resultados
| Comando | Resultado |
|---|---|

## Riscos residuais / pendências
- `main.ts` não exporta `app` → testes requerem servidor real rodando (webServer ou manual)
- `DATABASE_URL` obrigatório para subir a API nos testes
- Versão mínima de Node para `@playwright/test` a verificar antes de instalar
