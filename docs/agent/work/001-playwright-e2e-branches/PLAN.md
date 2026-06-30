# PLAN — 001-playwright-e2e-branches

## Status
State: PLANNED

## Objetivo
Criar duas branches Git com suíte Playwright (API testing): `e2e/failing` com
pelo menos um teste E2E falhando de forma honesta (endpoint de bookmark inexistente
→ 404 natural), e `e2e/passing` com todos os testes passando contra os endpoints
atuais da API.

## Escopo
- Incluído:
  - Instalar `@playwright/test` como devDependency
  - Criar `playwright.config.ts` na raiz com `webServer` apontando para `npx nx serve api`
  - Criar `e2e/playwright/` com specs cobrindo os endpoints existentes da API:
    health check, register, login, get article, list articles, get tags
  - Spec de bookmark que documenta a feature faltante (branch `e2e/failing`)
  - Branch `e2e/passing`: mesmo setup, teste de bookmark removido/skipado
  - Adicionar target `playwright` em `e2e/project.json`
  - README de pré-requisitos (`DATABASE_URL`, `JWT_SECRET`, Postgres rodando)
- Fora de escopo:
  - Corrigir o teste stale Jest/axios existente em `e2e/src/server/server.spec.ts`
    (responsabilidade da Fase 2 — rede de segurança)
  - Implementar o endpoint de bookmark (Fase 4 — §4.5)
  - Testes Playwright de browser (UI) — apenas API testing via `request` fixture
  - Configuração de CI
  - Upgrade de Nx ou TypeScript
- files_owned:
  - `playwright.config.ts`
  - `e2e/playwright/`
  - `e2e/project.json`
  - `package.json` (somente linha de devDependency `@playwright/test`)

## Origem e fase
- Fase (ROADMAP): 5 — Qualidade (antecipada por decisão explícita do usuário;
  o ROADMAP.md permite ordem flexível exceto Fase 2 antes de Fase 3)
- Documento/bloco de origem: GUIA-DE-REFATORACAO.md §5.6 e §11
- context_sources:
  - skills: []
  - design: null
- affects_design_system_core: false

## Dados, segurança e compliance
- Dados envolvidos / sensibilidade: dados fictícios de teste apenas (username,
  email, password gerados no teste — nunca dados reais)
- Permissões / minimização / mascaramento: testes usam `JWT_SECRET='superSecret'`
  (fallback de desenvolvimento conforme §3 do guia) — nunca exfiltrar em logs de CI
- Auditoria / log: nenhum dado sensível nos assertions ou outputs de teste
- Revisão humana: não requerida (risk_category B)

## API, entidades e integrações
- Endpoints cobertos nos testes:
  - `GET /api` — health check
  - `POST /api/users` — register
  - `POST /api/users/login` — login
  - `GET /api/articles` — list articles
  - `GET /api/tags` — list tags
  - `POST /api/articles/:slug/bookmark` — **somente na branch `e2e/failing`**
    (esperado: 201, real: 404 → teste falha intencionalmente)
- Integrações externas: nenhuma
- Banco: Postgres real (via `DATABASE_URL`); testes de Playwright não mockam o banco

## Critérios de aceite
- [ ] `@playwright/test` instalado e importável sem conflito com as dependências atuais
- [ ] `playwright.config.ts` configurado com `baseURL` e `webServer` (start automático da API)
- [ ] Branch `e2e/passing`: `npx playwright test` passa com 0 falhas em todos os specs
      (exceto bookmark — removido/skipado nesta branch)
- [ ] Branch `e2e/failing`: `npx playwright test` falha exatamente no teste de bookmark
      (`POST /api/articles/:slug/bookmark` → 404, assertion espera status 201);
      os demais testes passam
- [ ] Specs cobrem no mínimo: health check, register, login, list articles, list tags
- [ ] README de pré-requisitos documentado em `e2e/playwright/README.md`
- [ ] Nenhum dado sensível real nos arquivos de teste
- [ ] Teste stale Jest (`server.spec.ts`) não alterado
- [ ] Documentação e riscos atualizados.

## Operational path & risk
- risk_category: B   # gatilho: touches_executable_code + touches_build_deploy (package.json, e2e/project.json)
- operational_path: standard_path_B

## Model Profile
```yaml
risk_category: B
planner:   { tier: standard, effort: medium }
generator: { tier: standard, effort: high }
evaluator: { tier: standard, effort: medium }
reviewer:  { tier: standard, effort: low }
cross_family_evaluator: false
budget_max_usd: 0.50
rationale: |
  Categoria B: toca código executável (tests) e build (package.json). Sem fronteira
  de auth/secrets — os testes consomem a API como cliente. Generator high porque
  envolve config Playwright + múltiplos specs. Evaluator medium para confirmar
  que failing falha e passing passa de forma reproduzível. Reviewer low: sem
  superfície de segurança nova.
```

## Deterministic gates (a rodar antes de READY)
- build (`npx nx build api` — API compila sem erro)
- lint (`npx nx lint e2e` — specs sem violação)
- typecheck (`npx tsc --noEmit` no diretório e2e — types corretos)
- unit_tests (`npx nx test api` — testes unit existentes não regridem)

## Condições de parada
- `@playwright/test` conflitar com versão do Node ou Nx instalados → parar e
  reportar conflito com versões exatas
- `webServer` não conseguir subir a API por falta de `DATABASE_URL` ou Postgres →
  documentar como pré-requisito; não bloquear o plano (configurar `reuseExistingServer: true`)
- Descoberta de que `e2e/project.json` precisa de mudança arquitetural além de
  adicionar um target Playwright → parar e abrir issue `needs-decision`
- Qualquer mudança necessária fora de `files_owned`

## Riscos e pendências
- Risco: `main.ts` não exporta `app` — o `webServer` do Playwright vai iniciar
  o servidor real via `npx nx serve api`, o que exige Postgres + migrações rodando.
  Testes só executam com infraestrutura local completa.
- Risco: versão de `@playwright/test` pode precisar de Node >= 18; verificar
  `.nvmrc` ou `engines` antes de instalar.
- Pendência: a branch `e2e/failing` deve existir ANTES da `e2e/passing` para
  deixar claro que a `passing` é a "correção" (remoção do teste de bookmark).
