# ROADMAP — Conduit Backend

> Fonte: `documentação/GUIA-DE-REFATORACAO.md` §15 (arquivo local-only, gitignored —
> não existe em clones novos; ver `CONTRIBUTING.md`).
> Ordem obrigatória: Fase 2 (rede de segurança) ANTES das refatorações (Fase 3).
> As demais fases são flexíveis em sequência interna.

---

## Fase 1 — Fundação
**Objetivo:** estabelecer a infraestrutura de rastreabilidade e processo do time.

### Incluído
- Criar templates de issues GitHub (bug, feature, needs-decision) + DoR/DoD documentados no repo
- Configurar `.gitignore` para `documentação/`, `harness/`, `AGENTS.md`, `CLAUDE.md` [DONE]
- Definir e documentar bleeding branch (Conventional Commits automáticos)
- Conventional Commits configurados e validados (commitlint ou similar)

### Fora de escopo desta fase
- Qualquer mudança de código de produto

### Critérios de aceite
- [ ] Templates de issue funcionando no GitHub
- [ ] DoR/DoD documentados e acessíveis no repo
- [ ] `.git/info/exclude` configurado localmente; itens proibidos não aparecem em `git status`
- [ ] Conventional Commits em uso nos próximos commits

### Status
`PLANNED`

---

## Fase 2 — Rede de segurança
**Objetivo:** fixar o contrato atual como rede de segurança ANTES de qualquer refatoração.

### Incluído
- Documentar contrato atual em OpenAPI 3 (`swagger-jsdoc` + `swagger-ui-express` ou equivalente)
- Decisão §4.4: refatorar `main.ts` → `app.ts` (export) + `server.ts` (listen) **OU** bootstrap no e2e
- Introduzir `supertest` e harness de integração contra Postgres de teste
- Testes de contrato (todos os endpoints `/api`) verificando rotas, envelopes e formato de erro
- Corrigir e2e stale (`Hello API` → `API is running on /api`)
- Incluir endpoints de bookmark na spec OpenAPI quando §4.5 estiver concluído

### Fora de escopo desta fase
- Mudanças de comportamento; novas features; refatoração interna

### Decisão bloqueante (pending_decision antes de iniciar)
- Estratégia do harness de integração: `app.ts/server.ts` export vs bootstrap e2e

### Critérios de aceite
- [ ] Spec OpenAPI gerada e servida em `/api/docs` (ou equivalente)
- [ ] Suite de testes de contrato verde cobrindo todos os endpoints atuais
- [ ] `supertest` funcionando contra Postgres de teste
- [ ] e2e corrigido e verde

### Status
`PLANNED`

---

## Fase 3 — Refino interno
**Objetivo:** melhorar a qualidade interna sem alterar comportamento externo.

### Incluído
- **§4.1** — Habilitar `strict` TypeScript progressivamente; remover `any`/`@ts-ignore` em
  `article.service.ts` e `main.ts`; tipar error handler
- **§4.2** — Extrair `comment.service.ts` + `comment.controller.ts` e
  `favorite.service.ts` + `favorite.controller.ts` de `article.service.ts` (652 linhas);
  registrar novos controllers em `routes.ts`
- **§4.3** — Remover `try/catch … next(error)` boilerplate de todos os controllers;
  substituir por wrapper `asyncHandler` (ou `express-async-errors`); preservar as 3
  ramificações do error handler global

### Fora de escopo desta fase
- Novas features; mudança de contrato; upgrade de framework

### Critérios de aceite
- [ ] Build verde com `strict` habilitado; sem `@ts-ignore` desnecessários
- [ ] `article.service.ts` reduzido a lógica de artigos; `comment.*` e `favorite.*` separados
- [ ] Nenhum `try/catch` boilerplate nos controllers; comportamento idêntico verificado por testes de contrato

### Status
`PLANNED`

---

## Fase 4 — Features
**Objetivo:** adicionar rate limiting e bookmarking ao contrato da API.

### Incluído
- **§4.4** — `express-rate-limit` em `POST /api/users/login`; testes de integração que
  acionam o limite (HTTP 429) e verificam headers; depende de decisão §4.4 (Fase 2)
- **§4.5** — `POST /api/articles/:slug/bookmark` (auth required); nova relação M:N
  `User.bookmarks ↔ Article.bookmarkedBy` (join `_UserBookmarks`); migração Prisma
  versionada; implementar em `bookmark.service.ts` + `bookmark.controller.ts`

### Ponto de permissão (decidir antes de §4.5)
- Incluir `DELETE /api/articles/:slug/bookmark` por simetria com favoritos?

### Fora de escopo desta fase
- Qualquer outro endpoint novo; upgrade de framework

### Critérios de aceite
- [ ] Rate limit configurável; teste de integração prova 429 ao exceder; login intacto no caminho feliz
- [ ] Usuário autenticado pode marcar/desmarcar bookmark; envelope idêntico ao de favoritos
- [ ] Migração Prisma aplicável de forma limpa e reversível
- [ ] OpenAPI atualizado com endpoints de bookmark

### Status
`PLANNED`

---

## Fase 5 — Qualidade
**Objetivo:** garantir cobertura profunda, E2E e detecção de mutações.

### Incluído
- **§5.7** — StrykerJS: meta **95%** de cobertura de mutação; ampliar unit tests
  (tag.service, create/get/update/feed de artigos atualmente sem cobertura)
- **§5.6** — E2E Playwright (API): fluxos ponta-a-ponta sobre a API REST;
  **obrigatório: manter duas branches** —
  - `e2e/failing` — branch com teste funcional **quebrando** (documenta defeito)
  - `e2e/passing` — branch com teste funcional **passando**
- Testes de integração adicionais cobrindo: auth, artigos, comentários, favoritos, bookmark, rate limit

### Fora de escopo desta fase
- Observabilidade; deploy; novas features

### Critérios de aceite
- [ ] StrykerJS rodando; score >= 95% nos módulos cobertos
- [ ] Playwright: suite E2E cobrindo fluxos principais (register → login → create article → comment → favorite → bookmark)
- [ ] Branch `e2e/failing` existente com pelo menos 1 teste quebrando documentado
- [ ] Branch `e2e/passing` com todos os testes passando
- [ ] Tag service com testes reais (não `test.todo`)

### Status
`PLANNED`

---

## Fase 6 — Operação
**Objetivo:** containerizar, observar e automatizar o ambiente de produção/CI.

### Incluído
- **§5.3** — Docker Compose: serviço `api` + **PostgreSQL** + stack **LGTM**
  (Loki/Grafana/Tempo/Mimir); variáveis `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`;
  migrações `prisma migrate deploy` na subida
- **§8** — Observabilidade: OpenTelemetry/Prometheus (contador por endpoint → Mimir);
  logs de boot/shutdown → Loki; traces → Tempo
- **§12** — Script Python: sobe via Compose, valida logs de inicialização/encerramento,
  retorna sucesso/falha, derruba stack; utilizável em CI local
- **§5.10** — Upgrades de framework (Express 5, Prisma 5+, Nx atual, Node LTS) —
  **ponto de permissão**: planejar via issue e só executar com aprovação

### Fora de escopo desta fase
- Novas features de API

### Critérios de aceite
- [ ] `docker compose up` sobe API + Postgres + LGTM sem intervenção manual
- [ ] Métricas visíveis no Grafana; logs no Loki; traces no Tempo
- [ ] Script Python passa em CI local
- [ ] `dist/`, `coverage/`, `.env` não commitados

### Status
`PLANNED`
