# Registro de Prompts e Habilidades — Conduit Backend

> **§17 do GUIA-DE-REFATORACAO.md** — este arquivo documenta, por etapa realizada ou
> planejada, o prompt acionado, as skills do Coda utilizadas ou necessárias, e comentários
> para os demais membros da equipe.
>
> ⚠️  Este arquivo **NUNCA deve ser commitado** (ver §13 do guia).
> Adicionado ao `.git/info/exclude` local.

---

## Ciclo do agente — visão geral

O workflow do agente segue uma máquina de estados linear com sete papéis:

```
Prompt 00 — Onboarding / Intake
Prompt 01 — Planner       → gera PLAN.md
Prompt 02 — Builder       → implementa
Prompt 03 — Evaluator     → valida critérios de aceite + deterministic gates
Prompt 04 — Code Reviewer → revisa qualidade, estilo, convenções, restrições do guia
Prompt 05 — Security Reviewer → revisa postura de segurança
Prompt 06 — Closer        → registra READY, atualiza STATE.md
```

Cada prompt é acionado explicitamente pelo operador. O agente NÃO avança de papel
sozinho; exige confirmação ou resultado do passo anterior.

---

## Etapas realizadas até agora

### Etapa 0 — Onboarding / Intake (Prompt 00)

**Data:** 2026-06-26
**Status:** ✅ concluído

**Prompt acionado:**
```
[Prompt 00 — Onboarding]
Você é um agente de engenharia de software sendo ativado pela primeira vez neste
repositório. Seu objetivo é estabelecer ou retomar o contexto do projeto com segurança.
[... instruções completas do Prompt 00 conforme recebido pelo operador]
```

**O que foi feito:**
- Detectou primeira ativação (ausência de `docs/agent/STATE.md`).
- Analisou `documentação/GUIA-DE-REFATORACAO.md` (Path A — documentação).
- Auditou estrutura do código: `src/`, `e2e/`, `package.json`, `tsconfig` (Path C — código).
- Materializou contexto em `docs/agent/`:
  - `OPERATING-GUIDE.md` — contrato de trabalho do agente
  - `STATE.md`           — estado corrente + briefing para próximo agente
  - `context/CHARTER.md` — identidade, módulos, riscos, stack
  - `context/ROADMAP.md` — seis fases mapeadas do guia
  - `context/SOURCES.md` — fontes de verdade registradas

**Skills Coda utilizadas:** nenhuma (intake manual via análise de documentação + código)

**Skills Coda que poderiam ter sido usadas:**
| Skill | Quando usar |
|---|---|
| `globant-qe-test-plan` | Gerar plano de testes ISTQB formal a partir das user stories do guia |
| `globant-qe-test-scenario-designer` | Projetar cenários de teste para cada fase do roadmap antes de implementar |

**Comentários para a equipe:**
- O guia §2 corrige premissas do documento-fonte externo (ex.: TypeScript `strict` foi
  re-escopado para "endurecer tipagem", não migração completa). Ler §2 antes de planejar.
- `documentação/`, `harness/`, `AGENTS.md`, `CLAUDE.md` **nunca commitados** — adicionar
  ao `.git/info/exclude` em cada máquina de desenvolvimento.
- O e2e stale (`Hello API`) não foi corrigido nesta etapa — é responsabilidade da Fase 2.

---

### Etapa 1 — Planejamento: branches Playwright (Prompt 01)

**Data:** 2026-06-26
**Status:** ✅ concluído (PLAN.md criado, aguardando implementação)

**Prompt acionado:**
```
[Prompt 01 — Planner]
Você é o planner desta unidade de trabalho. Leia STATE.md, OPERATING-GUIDE.md e
ROADMAP.md. Crie um PLAN.md completo para a slice indicada, incluindo:
escopo, risk_category, operational_path, model profile, deterministic gates,
critérios de aceite, condições de parada e arquivos owned.

Intenção da slice: "branch com testes funcionais quebrando e branch com testes
funcionais passando usando Playwright"
```

**Decisão do operador registrada:**
> Teste que falha na branch `e2e/failing`: **Opção A** —
> `POST /api/articles/:slug/bookmark` → 404 natural (endpoint não implementado).
> Assertion espera 201. Falha honesta documenta feature ausente.

**Artefatos gerados:**
- `docs/agent/work/001-playwright-e2e-branches/PLAN.md`
- `docs/agent/work/001-playwright-e2e-branches/PROGRESS.md`
- `docs/agent/STATE.md` atualizado (fase 5 antecipada)

**Risk category:** B (toca código executável + `package.json`; não cruza fronteira auth)
**Operational path:** `standard_path_B`

**Skills Coda utilizadas:** nenhuma (planning manual)

**Skills Coda necessárias para implementar esta slice:**
| Skill | Papel | Quando acionar |
|---|---|---|
| `globant-qe-test-scenario-designer` | builder | Antes de escrever os specs — projetar cenários positivos/negativos/edge com dados de teste, prioridade e pontos de validação |
| `globant-qe-web-explorer` | builder | Modo `--for-automation`: validar seletores e comportamentos dos endpoints antes de codificar os specs |
| `globant-qe-mcp-test-executor` | evaluator | Rodar os casos de teste documentados passo a passo via Playwright MCP sem gerar código de automação |

**Comentários para a equipe:**
- A Fase 5 foi antecipada por decisão explícita do operador. As Fases 1–4 seguem
  pendentes (ver ROADMAP.md).
- A branch `e2e/failing` deve ser criada **antes** da `e2e/passing` para evidenciar
  que a passante é a resolução.
- `@playwright/test` requer Node >= 14; o container Docker usa `node:lts-alpine`
  (Node 20) — sem problema. Localmente checar `node -v` antes de rodar.
- O teste stale Jest (`e2e/src/server/server.spec.ts`) não é alterado nesta slice.

---

### Etapa 2 — Implementação: LGTM Stack + Observabilidade (Prompt 02 / Builder)

**Data:** 2026-06-26
**Status:** ✅ concluído

**Prompt acionado:**
```
[Solicitação direta do operador — sem Prompt 02 formal]
"Add LGTM stack into Compose, validate each artifact has a counter metric on
each endpoint that increases by one for each call, a log for startup and when
exiting the app and traces are enabled."
```

> ⚠️ **Nota para equipe:** esta etapa foi acionada por solicitação direta, não
> via Prompt 02 formal. Em produção, o Prompt 02 deveria ter sido acionado com
> referência ao PLAN.md correspondente. Ver seção "Lacunas" abaixo.

**Artefatos gerados / modificados:**

| Arquivo | Tipo | O que faz |
|---|---|---|
| `compose.yml` | novo | Stack completa: `postgres:15-alpine` + `grafana/otel-lgtm:latest` + `api` |
| `src/telemetry.ts` | novo | OTel SDK bootstrap (traces + metrics + logs via OTLP HTTP) |
| `src/logger.ts` | novo | Instância `pino` compartilhada (JSON em prod, pretty em dev) |
| `src/app/middleware/http-metrics.middleware.ts` | novo | Counter `http_requests_total` por endpoint/método/status |
| `src/main.ts` | modificado | Importa telemetry primeiro; startup/exit logs; SIGTERM/SIGINT handlers |
| `Dockerfile` | modificado | Multi-stage build (builder → runtime); antes esperava `dist/` pré-compilado |
| `package.json` | modificado | +`@opentelemetry/*` (9 pacotes) + `pino` + `pino-pretty` |

**Stack LGTM implementada:**
```
grafana/otel-lgtm  (single container — Grafana Labs)
  ├─ Prometheus  :9090  — métricas
  ├─ Loki               — logs
  ├─ Tempo              — traces distribuídos
  ├─ Grafana     :3001  — dashboards (datasources pré-configurados)
  └─ OTel Collector :4317 (gRPC) / :4318 (HTTP)
```

**Invariantes verificadas contra §3 do guia:**
- ✓ Contrato RealWorld preservado (nenhuma rota alterada)
- ✓ Auth strategy intacta (não tocada)
- ✓ Singleton PrismaClient não alterado
- ✓ `JWT_SECRET` fallback preservado

**Skills Coda utilizadas:** nenhuma (implementação direta)

**Skills Coda que poderiam ter sido usadas:**
| Skill | Quando usar |
|---|---|
| `globant-qe-test-scenario-designer` | Antes: projetar cenários de teste para validar as métricas/logs/traces |
| `globant-qe-mcp-test-executor` | Depois: executar testes manuais via Playwright MCP validando o comportamento observado no Grafana |

**Comentários para a equipe:**
- `OTEL_SDK_DISABLED=true` desabilita toda instrumentação OTel (útil em testes unitários
  que não devem depender de um collector rodando).
- `grafana/otel-lgtm` é uma imagem de **desenvolvimento local** — não usar em produção;
  para produção configurar Loki/Tempo/Mimir/Grafana separadamente.
- O Dockerfile foi convertido para multi-stage. O comando `npx nx docker-build api`
  (que esperava `dist/` pré-compilado) ainda funciona passando `--build-arg`; mas
  `docker compose up --build` agora é suficiente.
- Migrações Prisma **não rodam automaticamente** no container. Executar manualmente:
  ```bash
  docker compose exec api npx prisma migrate deploy
  ```
- `pino-pretty` está em `dependencies` (não só `devDependencies`) porque é
  referenciado em `src/logger.ts` como transport target. Se preferir reduzir o bundle,
  mover para devDependencies e garantir que `NODE_ENV=production` sempre esteja
  definido no container.

---

### Etapa 3 — Script de validação Docker / logs (Prompt 02 / Builder)

**Data:** 2026-06-26
**Status:** ✅ concluído

**Prompt acionado:**
```
[Solicitação direta do operador]
"Python script start the app in Docker and validate the startup log and
exit log work."
```

**Artefato gerado:**
- `scripts/validate_docker_logs.py`

**O que o script faz:**
1. Verifica se o Docker daemon está acessível.
2. Constrói a imagem `conduit-api:test` se não existir (ou com `--build`).
3. Sobe um container com `OTEL_SDK_DISABLED=true` + `DATABASE_URL` dummy.
4. Aguarda log JSON `msg="server started"` com campos `port` e `env`.
5. Envia SIGTERM via `docker stop`.
6. Aguarda log JSON `msg="server shutting down"` com campo `signal`.
7. Remove o container (`docker rm -f`) em bloco `finally`.
8. Imprime relatório e retorna exit code `0` (passou) ou `1` (falhou).

**Executar:**
```bash
# Primeira vez (constrói a imagem)
python3 scripts/validate_docker_logs.py --build

# Execuções subsequentes (reutiliza imagem existente)
python3 scripts/validate_docker_logs.py

# Com timeout estendido (ex.: CI lento)
python3 scripts/validate_docker_logs.py --build --timeout 60
```

**Skills Coda utilizadas:** nenhuma

**Skills Coda necessárias/recomendadas:**
| Skill | Quando usar |
|---|---|
| `globant-qe-mcp-test-executor` | Executar casos de teste do script via Playwright MCP em vez de subprocesso Python (alternativa para ambientes com MCP disponível) |

**Comentários para a equipe:**
- O script usa apenas stdlib Python (`subprocess`, `threading`, `json`, `argparse`) —
  sem dependências externas. Roda com Python 3.9+.
- `OTEL_SDK_DISABLED=true` garante que o shutdown seja rápido (< 2 s) sem precisar
  de um collector ativo.
- O script pode ser integrado em CI como passo de smoke test pós-build:
  ```yaml
  # .github/workflows/ci.yml (exemplo)
  - name: Validate Docker startup/exit logs
    run: python3 scripts/validate_docker_logs.py --build --timeout 60
  ```
- Para validar o stack LGTM completo (compose), usar `docker compose up --build` e
  apontar o script para a porta 3000 — isso requer ajuste para não usar `--rm` e
  esperar a healthcheck do postgres.

---

## Etapas pendentes

### Etapa P1 — Implementar branches Playwright (Prompt 02)

**Status:** ⏳ pendente
**Slice:** `docs/agent/work/001-playwright-e2e-branches/PLAN.md`

**Prompt a acionar:**
```
[Prompt 02 — Builder]
Leia docs/agent/STATE.md, docs/agent/OPERATING-GUIDE.md e
docs/agent/work/001-playwright-e2e-branches/PLAN.md.

Implemente a slice 001-playwright-e2e-branches:
1. Instale @playwright/test como devDependency.
2. Crie playwright.config.ts na raiz com webServer apontando para npx nx serve api.
3. Crie e2e/playwright/ com specs cobrindo: health check, register, login,
   list articles, list tags.
4. Crie a branch e2e/failing com spec de bookmark (POST /api/articles/:slug/bookmark)
   que falha com 404.
5. Crie a branch e2e/passing com o spec de bookmark removido/skipado.
6. Adicione target playwright em e2e/project.json.
7. Documente pré-requisitos em e2e/playwright/README.md.

Respeite os files_owned definidos no PLAN.md. Não altere e2e/src/server/server.spec.ts.
```

**Skills Coda recomendadas (acionar antes de implementar):**
```
# 1. Projetar cenários antes de codificar
[Acionar: globant-qe-test-scenario-designer]
User stories: health check, register, login, list articles, list tags, bookmark (faltante).
Gerar cenários positivos, negativos e edge cases com dados de teste e prioridade.

# 2. Validar seletores/endpoints antes de automatizar (modo --for-automation)
[Acionar: globant-qe-web-explorer --for-automation]
Validar comportamento real dos endpoints contra a API rodando localmente.
Produz validated-test-cases.md para consumo pelo Builder.

# 3. Executar casos de teste após implementação
[Acionar: globant-qe-mcp-test-executor]
Executar os casos documentados em validated-test-cases.md passo a passo via
Playwright MCP. Não gera código — valida comportamento real.
```

---

### Etapa P2 — Avaliação: branches Playwright (Prompt 03)

**Status:** ⏳ pendente (depende de P1)

**Prompt a acionar:**
```
[Prompt 03 — Evaluator]
Leia docs/agent/work/001-playwright-e2e-branches/PLAN.md e PROGRESS.md.

Verifique os critérios de aceite:
- [ ] @playwright/test instalado e importável sem conflito.
- [ ] playwright.config.ts configurado com baseURL e webServer.
- [ ] Branch e2e/passing: npx playwright test passa com 0 falhas.
- [ ] Branch e2e/failing: npx playwright test falha exatamente no teste de bookmark.
- [ ] Specs cobrem: health check, register, login, list articles, list tags.
- [ ] README de pré-requisitos em e2e/playwright/README.md.
- [ ] Nenhum dado sensível real nos arquivos de teste.
- [ ] Teste stale Jest (server.spec.ts) não alterado.

Execute os deterministic gates definidos no PLAN.md:
- build  : npx nx build api
- lint   : npx nx lint e2e
- typecheck: npx tsc --noEmit (e2e)
- unit_tests: npx nx test api

Registre evidências no PROGRESS.md.
```

**Skills Coda recomendadas:**
```
# Gerar relatório de resultados de teste após execução
[Acionar: globant-qe-bug-report-writer]
Modo padrão (write): converter resultados dos testes Playwright em relatório
estruturado de bugs. Usar se falhas forem encontradas além do esperado.
```

---

### Etapa P3 — Revisão de código: branches Playwright (Prompt 04)

**Status:** ⏳ pendente (depende de P2)

**Prompt a acionar:**
```
[Prompt 04 — Code Reviewer]
Leia docs/agent/work/001-playwright-e2e-branches/PLAN.md e PROGRESS.md.

Revise o código produzido pelo Builder verificando:
1. **Estilo e convenções:** os arquivos novos seguem o padrão dos existentes
   (indentação, nomenclatura de variáveis, imports, comentários)?
2. **Restrições do guia (§3):** nenhuma invariante foi violada (rotas, envelopes,
   auth, schema Prisma, singleton PrismaClient)?
3. **Escopo:** o Builder modificou apenas os files_owned declarados no PLAN.md?
   Se arquivos fora do escopo foram alterados, justificar.
4. **Qualidade dos specs Playwright:**
   - Cada spec tem um único propósito claro?
   - Dados de teste são gerados em runtime (sem valores fixos/previsíveis)?
   - Asserções são específicas (evitar `toBeTruthy()` sem contexto)?
   - Timeouts explícitos onde necessário?
5. **Documentação:** README de pré-requisitos está completo e correto?
6. **Ausência de `console.log` de debug** deixado nos specs.

Registre resultado no PROGRESS.md (approved / changes_requested + lista de itens).
```

**Skills Coda recomendadas:** nenhuma (revisão manual)

**Comentários para a equipe:**
- O Code Reviewer é um papel separado do Evaluator: o Evaluator valida
  *se funciona* (critérios de aceite + gates); o Code Reviewer valida *como foi
  implementado* (qualidade interna, convenções, escopo).
- Em slices de baixo risco (risk_category A), Code Review pode ser simplificado
  ao checklist dos itens 2 e 3 acima.
- O revisor pode ser o mesmo agente instanciado em sessão nova (sem memória do
  Builder) para garantir perspectiva independente.

---

### Etapa P4 — Revisão de segurança: branches Playwright (Prompt 05)

**Status:** ⏳ pendente (depende de P3)

**Prompt a acionar:**
```
[Prompt 05 — Security Reviewer]
Leia docs/agent/work/001-playwright-e2e-branches/PLAN.md.
Risk category: B.

Verifique:
1. Os specs não contêm credenciais, tokens JWT ou dados sensíveis reais
   (somente dados fictícios gerados no teste).
2. As fixtures de teste não expõem DATABASE_URL, JWT_SECRET ou segredos de prod.
3. Nenhum arquivo de teste grava credenciais em logs ou artefatos.
4. O README não instrui o uso de dados reais.

Registre resultado no PROGRESS.md (approved / rejected + justificativa).
```

> ℹ️ **Nota:** Para risk_category B, a revisão de segurança é streamlined.
> Não são exigidos >= 4 gates (isso se aplica a C/D). O revisor pode ser
> o mesmo modelo do generator.

---

### Etapa P5 — Fechamento: branches Playwright (Prompt 06)

**Status:** ⏳ pendente (depende de P4)

**Prompt a acionar:**
```
[Prompt 06 — Closer]
Leia docs/agent/work/001-playwright-e2e-branches/PLAN.md e PROGRESS.md.

Confirme que todos os critérios de aceite estão satisfeitos e que os
deterministic gates passaram (Evaluator), a revisão de código foi aprovada
(Code Reviewer) e a revisão de segurança foi aprovada (Security Reviewer).

Atualize:
- PROGRESS.md → State: READY
- docs/agent/STATE.md → last_completed_phase atualizado; active_work_unit: none
- docs/agent/context/ROADMAP.md → marcar slice 001 como DONE na Fase 5
- Este arquivo (PROMPTS-AND-SKILLS.md) → marcar etapas P1–P5 como concluídas

Emita o bloco Handoff final indicando que a slice está READY.
```

---

### Etapas futuras (fases 1–4 ainda não iniciadas)

| Fase | Descrição | Prompt sugerido | Skills recomendadas |
|---|---|---|---|
| 1 — Fundação | Templates GitHub Issues, DoR/DoD, `.git/info/exclude` | Prompt 01 → 02 → 04 | nenhuma |
| 2 — Rede de segurança | OpenAPI, testes de contrato, decisão `app` export | Prompt 01 → 02 → 03 → 04 | `globant-qe-test-plan`, `globant-qe-test-scenario-designer` |
| 3 — Refino interno | TypeScript strict, split monólito, async error handler | Prompt 01 → 02 → 03 → 04 → 05 | `globant-qe-test-scenario-designer` |
| 4 — Features | Rate limiting + testes, Bookmark + migração Prisma | Prompt 01 → 02 → 03 → 04 → 05 | `globant-qe-test-scenario-designer`, `globant-qe-mcp-test-executor` |
| 5 — Qualidade | StrykerJS 95%, Playwright E2E completo | Prompt 01 → 02 → 03 → 04 | `globant-qe-test-scenario-designer`, `globant-qe-mcp-test-executor`, `globant-qe-bug-report-writer` |
| 6 — Operação | Docker Compose full, CI, upgrades de framework | Prompt 01 → 02 → 03 → 04 → 05 | nenhuma específica |

---

## Registry de skills — resumo

### Skills Coda disponíveis e seu papel neste projeto

| Skill | Descrição | Quando acionar no Conduit |
|---|---|---|
| `globant-qe-test-plan` | Gera plano de testes ISTQB-compliant a partir de user stories | Fase 2 (rede de segurança) e Fase 5 (qualidade) — antes de implementar suítes de teste |
| `globant-qe-test-scenario-designer` | Projeta cenários UI/API com casos positivos, negativos e edge cases | Antes de qualquer implementação de testes: Playwright E2E, integração, rate limit |
| `globant-qe-web-explorer` | Explora a aplicação via browser/API, documenta seletores e comportamentos | Modo `--for-automation`: validar endpoints antes de codificar specs Playwright |
| `globant-qe-mcp-test-executor` | Executa casos de teste documentados via Playwright MCP sem gerar código | Avaliação pós-implementação de qualquer suíte de testes |
| `globant-qe-bug-report-writer` | Converte resultados de teste em relatórios estruturados de bugs | Quando testes falham além do esperado; consolidação de defeitos entre sprints |

### Skills necessárias mas ainda não disponíveis no Coda

| Skill ausente | Funcionalidade necessária | Alternativa atual |
|---|---|---|
| `opentelemetry-validator` | Validar que spans/métricas/logs chegam corretamente ao collector | Manual: consultar Grafana UI + Prometheus queries |
| `prisma-migration-reviewer` | Revisar migrations Prisma quanto a destrutividade e reversibilidade | Manual: revisão humana do SQL gerado por `prisma migrate dev` |
| `conventional-commits-enforcer` | Garantir que commits seguem o padrão `type(scope): description #id` | Manual: lint de commit via `commitlint` (a configurar na Fase 1) |
| `docker-compose-smoke-tester` | Subir stack via Compose e validar healthchecks automaticamente | `scripts/validate_docker_logs.py` (criado na Etapa 3) |

---

## Comentários gerais para a equipe

### Para desenvolvedores onboarding neste repositório

1. **Leia `documentação/GUIA-DE-REFATORACAO.md` inteiro antes de codificar.**
   Especialmente §2 (correções críticas) e §3 (invariantes).

2. **Nunca use `git add .`** — há arquivos nesta pasta que não devem ser commitados.
   Configure `.git/info/exclude` local:
   ```
   documentação/
   harness/
   AGENTS.md
   CLAUDE.md
   ```

3. **Toda mudança referencia uma issue GitHub** com `#<id>` no commit.
   Formato: `feat(auth): add rate limiting #42`

4. **Não altere o contrato RealWorld** (rotas, envelopes, formato de erro) sem abrir
   issue `needs-decision` e aguardar aprovação.

5. **`DATABASE_URL` sem fallback** — nada funciona sem Postgres + migrações aplicadas.
   Use `docker compose up postgres` para subir só o banco, depois `npx prisma migrate dev`.

### Para revisores de PR

- Verificar que `compose.yml`, `src/telemetry.ts`, `src/logger.ts` e
  `src/app/middleware/http-metrics.middleware.ts` não foram alterados sem PLAN.md
  correspondente.
- Verificar que `OTEL_SDK_DISABLED=true` está presente em qualquer teste unitário que
  instancie a aplicação (para não depender de collector ativo).
- O `Dockerfile` agora é multi-stage — validar que `docker compose up --build` completa
  com sucesso antes de aprovar PRs que alterem `package.json` ou `src/`.

### Para CI/CD (quando for configurado — Fase 1/6)

```yaml
# Smoke test recomendado como passo pós-build:
- name: Validate Docker startup/exit logs
  run: python3 scripts/validate_docker_logs.py --build --timeout 60

# Rodar testes unitários:
- name: Unit tests
  run: npx nx test api

# Lint + typecheck:
- name: Lint
  run: npx nx lint api
- name: Typecheck
  run: npx tsc --noEmit
```

---

*Última atualização: 2026-06-26 — Etapas 0, 1, 2, 3 concluídas.*
