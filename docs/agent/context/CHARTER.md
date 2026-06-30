# CHARTER — Conduit Backend

## Identidade
**Nome:** Conduit Backend (node-express-realworld-example-app)
**Objetivo:** Refatorar, testar e operar o backend Node/Express/Prisma da API
RealWorld (Conduit), tornando-o robusto, bem testado, observável e rastreável —
sem alterar o contrato público da API.

## Personas
- **Desenvolvedor(a) backend** — principal usuário deste repositório; executa,
  testa e evoluiu o código.
- **Equipe/time** — revisa PRs, segue DoR/DoD, usa GitHub Issues para rastrear
  trabalho.

## Escopo do projeto
O backend é uma **API REST pura** (sem frontend próprio). Toda evolução deve:
1. **Preservar o contrato RealWorld** (rotas, envelopes, formato de erro) — §3 do guia.
2. **Seguir o GUIA-DE-REFATORACAO.md** como documento-fonte de verdade.
3. **Abrir issue antes de codar**; todo commit referencia `#<id>`.
4. **Usar Conventional Commits** em todos os commits.

## Módulos principais
| Módulo | Caminho | Status atual |
|---|---|---|
| article (controller + service) | `src/app/routes/article/` | PARTIAL — service monolítico (652 linhas) |
| auth | `src/app/routes/auth/` | PARTIAL — sem rate limiting |
| profile | `src/app/routes/profile/` | PARTIAL |
| tag | `src/app/routes/tag/` | PARTIAL — teste é `test.todo` |
| main (entry point) | `src/main.ts` | PARTIAL — não exporta `app` |
| e2e | `e2e/` | COMPLETE-STALE — teste stale (`Hello API`) |

## Riscos e controles exigidos
| Risco | Controle |
|---|---|
| `main.ts` não exporta `app` | Refator app/server (decisão §4.4) antes de supertest |
| `JWT_SECRET` fallback `'superSecret'` | Nunca remover sem atualizar testes |
| `DATABASE_URL` sem fallback | Postgres + migrações obrigatórios para rodar |
| Bookmark = nova migração Prisma | Gerar migração versionada; nunca `db push` |
| `strict` desligado + `any`/`@ts-ignore` | Habilitar progressivamente (§4.1) |
| e2e stale (`Hello API`) | Corrigir na fase de rede de segurança |
| Itens que nunca devem ser commitados | `documentacao/`, `harness/`, `AGENTS.md`, `CLAUDE.md` → `.git/info/exclude` local |

## Stack e restrições
- **Linguagem:** TypeScript 5.2.2 (`strict` desligado; alvo: habilitar em §4.1)
- **Runtime/web:** Express 4.18.2 (upgrade para Express 5 é ponto de permissão — §5.10)
- **ORM/Banco:** Prisma 4.16.2 + PostgreSQL
- **Monorepo:** Nx 17.2.6
- **Auth:** express-jwt 8.4.1 (HS256, header `Token`/`Bearer`)
- **Testes:** Jest 29.7.0 + ts-jest + jest-mock-extended (unit); supertest (a introduzir)
- **E2E:** Playwright API (e2e/ — a corrigir e expandir)
- **Lint/format:** ESLint 8.48 + Prettier 2.6 (`singleQuote: true`)
- **Docker:** Dockerfile single-stage (sem Compose — a adicionar)
- **CI:** nenhum atualmente (a definir)
- **Commits:** Conventional Commits com `#<id>`

## Arquitetura — invariantes (não alterar sem permissão)
- Estrutura por feature (`article/`, `auth/`, `profile/`, `tag/`) + padrão
  controller → service → Prisma (+ mapper/util).
- Contrato RealWorld: rotas, métodos, auth por rota, envelopes `{ article }`,
  `{ articles, articlesCount }`, `{ user }`, `{ profile }`, `{ comment(s) }`,
  `{ tags }`, formato de erro `{ errors: { campo: ["msg"] } }`.
- Estratégia de auth (express-jwt, `req.auth.user.id: number`, payload `{ user: { id } }`).
- Singleton PrismaClient (`src/prisma/prisma-client.ts`).
- IDs inteiros; slug `${slugify(title)}-${id}`.
- Flag `demo` nos filtros de consulta.

## Definition of Done (por slice)
- Critérios de aceite do PLAN.md satisfeitos.
- Testes de contrato verdes (sem regressão de API).
- Integração coberta (incluindo 429 para rate limit quando aplicável).
- Cobertura de mutação na meta (95% — StrykerJS) quando aplicável.
- Migração aplicável e reversível quando há mudança de schema.
- Conventional Commits com `#<id>` em todos os commits.
- Prompts/skills registrados em `documentacao/` (não commitado).
- Evidência registrada em PROGRESS.md e REVIEW.md.
- Riscos residuais explícitos.
