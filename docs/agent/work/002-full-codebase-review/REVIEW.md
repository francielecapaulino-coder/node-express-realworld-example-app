# REVIEW — 002-full-codebase-review

State: DONE

Revisão de código módulo-por-módulo de todo o projeto, comparando com o
estado anterior em `24770be`. Cada módulo passou por 5 ângulos de revisão
(correctness, security/invariants, cross-file tracer, cleanup/reuse/efficiency,
altitude/architecture) antes da correção.

Compare completo: https://github.com/francielecapaulino-coder/node-express-realworld-example-app/compare/24770be...90c1b4b

## Commits

| Commit | Módulo | Resumo |
|---|---|---|
| `0177ff3` | article/ | vazamento de senha/email via `include` irrestrito; `updateArticle` apagando tags em updates parciais |
| `1e811e5` | comment/favorite/bookmark | vazamento residual de campos internos; 404 ausente em artigo inexistente |
| `954de41` | profile/tag | mesmo vazamento; 404 quebrado (400 genérico); auto-follow permitido; mapper duplicado |
| `27912b4` | middleware | DoS de cardinalidade em métricas; endpoints de métricas públicos; double-count; classificação de erro frágil (`.name` em vez de `instanceof`) |
| `04d0b7e` | config/infra | tipagem solta do `HttpException` permitindo payloads inconsistentes; crash no startup com `LOG_LEVEL`/`PORT` inválidos; Swagger e métricas expostos |
| `65c75ac` | prisma | `onDelete: Cascade` apagando conteúdo de outros usuários; `updatedAt` nunca atualizado; `seed.ts` engolindo erros |
| `72d764f` | auth/ | `updateUser` sem checagem de unicidade; `JWT_SECRET` com fallback inseguro; `getCurrentUser` gerando token novo a cada leitura |
| `ba9eef5` | Docker | migrations não aplicadas automaticamente no boot do container |
| `90c1b4b` | article/ (race condition) | `connectOrCreate`/`upsert` de tags não são atômicos sob concorrência |

## Validação automatizada (repetida a cada commit)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` (app + spec) | sem erros de tipo |
| `npx jest` | 222 testes, 24 suítes, 100% passando |
| `npx nx build api` | build de produção OK |
| `npx nx run-many --target=lint --all` | sem erros (só warnings pré-existentes de estilo) |
| CI (GitHub Actions) | verde nos 9 pushes |

## Testes de regressão manuais (API real, banco seedado, sem mocks)

| # | Fluxo testado | Resultado |
|---|---|---|
| 1 | Registro com senha < 8 caracteres | 422 `password is too short` |
| 2 | Registro válido | 201 |
| 3 | Registro com email duplicado | 422 `email has already been taken` |
| 4 | Login válido / senha incorreta | 200 / 403 |
| 5 | `GET /user` reutiliza o token existente (não gera um novo) | confirmado |
| 6 | Criar artigo com tags novas concorrentes | 201 (valida fix da race condition) |
| 7 | Resposta de artigo/favorite/bookmark sem vazar senha/id interno | confirmado |
| 8 | Auto-follow bloqueado | 422 `can't follow yourself` |
| 9 | Favoritar/bookmark artigo inexistente | 404 |
| 10 | `/api/metrics` sem token / token errado | 401 nos dois casos |
| 11 | Swagger docs disponível em dev | 200 |
| 12 | Rate limit de registro (10/15min) | bloqueou corretamente no 11º request |

## Validação de infraestrutura

- Migration `restrict_user_delete_and_auto_updated_at` gerada e aplicada ao banco local.
- `docker build` + `docker compose up` testado ponta a ponta contra um Postgres
  vazio: as 6 migrations foram aplicadas automaticamente no boot do container
  antes do servidor subir.
- `npx prisma db seed` rodado com sucesso até o fim, populando 60 usuários /
  201 artigos / 2016 comentários / 69 tags.

## Mutation testing (Stryker)

Rodado após esta revisão para confirmar o score real (meta do escopo: 95%):

```
npm run test:mutation:ci
```

Primeira rodada: **98.01%** (978 killed, 6 timeout, 17 survived, 3 no coverage, 5
errors de 1078 mutantes, em 22min35s) — já acima da meta de 95%. Os 17 survivors
ficavam em 4 arquivos:
| Arquivo | Score | Survivors |
|---|---|---|
| `http-exception.model.ts` | 50.00% | 1 |
| `token.utils.ts` | 50.00% | 3 |
| `auth.service.ts` | 94.62% | 9 |
| `profile.service.ts` | 92.73% | 4 |

Commit `7aa6ba2` fechou todos os 17: removido código morto em
`checkUserUniqueness` (o guard interno era inalcançável — os dois call sites já
garantiam pelo menos um de email/username antes de chamar), e adicionados testes
para: fronteira de senha de 8 caracteres, uniqueness check com só email (só
username já era coberto), trimming em `updateUser`, igualdade estrita (não
`toMatchObject` parcial) no shape de erro de conflito, as 3 branches de
`getJwtSecret`, e a asserção exata de `findUnique` em `unfollowUser` (que
`followUser` já tinha).

**Score final confirmado: 100.00%** (992 killed, 6 timeout, 0 survived, 0 no
coverage, 6 errors de 1078 mutantes, em 23min22s).

Relatório completo: `reports/mutation/mutation.json` (não commitado, gerado localmente).

## Pendências

- Nenhuma issue aberta no GitHub relacionada a esta revisão (todas as #12–#19
  foram fechadas com referência ao commit que as corrigiu).
