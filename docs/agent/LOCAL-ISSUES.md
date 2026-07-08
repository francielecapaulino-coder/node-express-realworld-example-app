# 🎯 Issue Tracking Log

> The `LOCAL-XXX` registry below (LOCAL-001..006) is a historical record from before GitHub
> Issues were enabled on this repo (`has_issues: true` since 2026-07-03) — kept for context,
> not actively maintained. **GitHub Issues are the source of truth**:
> https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues.
> The table further down mirrors every scope item to its issue, for anyone reading this repo
> without GitHub access.

**Project**: Node.js Express RealWorld Example App
**Environment**: Node.js v22.23.1, macOS 25.5.0

## ✅ COMPLETED (historical record)

| ID | Status | Title | Owner | Priority | Created | Completed |
|----|--------|-------|--------|----------|---------|------------|
| LOCAL-001 | ✅ DONE | Node.js Version Not Compatible | Coda | High | 2026-07-01 | 2026-07-01 |
| LOCAL-002 | ✅ DONE | Stryker Not Working in Node.js v21 | Coda | High | 2026-07-01 | 2026-07-01 |
| LOCAL-003 | ✅ DONE | Fix Test Failures After Node.js Upgrade | Coda | High | 2026-07-01 | 2026-07-01 |
| LOCAL-004 | ✅ DONE | Fix Integration Tests for Full Coverage | Coda | High | 2026-07-01 | 2026-07-01 |
| LOCAL-005 | ✅ DONE | Complete E2E Tests with Playwright | Coda | Medium | 2026-07-01 | 2026-07-01 |
| LOCAL-006 | ✅ DONE | Docker Containerization + Compose Setup | Coda | Medium | 2026-07-01 | 2026-07-01 |

Note: LOCAL-006 was previously listed as "READY"/not started, but `Dockerfile`, `compose.yml`
and `scripts/validate_docker_logs.py` were already implemented and committed — the status here
was stale and has been corrected.

## ✅ Scope delivered — tracked as GitHub Issues

Every item from the original scope document is closed. One issue per scope item
(or per bug found while delivering one), each with full context — problem
statement, acceptance criteria, and a closing comment summarizing what shipped
— on the issue itself.

| Issue | Title | Scope item | Approach / notes |
|---|---|---|---|
| [#2](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/2) | Fix rate-limit integration test to trigger a real 429 | Rate limiting on `/api/users/login` + integration test | |
| [#3](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/3) | Un-skip and fix contract integration tests | Integration tests for the current contract | |
| [#4](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/4) | Upgrade Express 4->5 and Nx 17->23 | Update to the most recent framework version | |
| [#5](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/5) | OpenAPI spec missing article/profile/tag routes | Document current API contract with OpenAPI/Swagger | |
| [#6](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/6) | Run Stryker to completion, report mutation score | Mutation testing, cover to 95% | Iterative: 15% → 33% → 66.77% → 78.01% → 99.07% → **100%**. Killed remaining survivors with targeted regression tests instead of weakening assertions. |
| [#7](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/7) | Fix docker log validation script | Python script validates Docker startup/exit logs | |
| [#8](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/8) | Harden TypeScript typing (enable strict mode) | Migrate to TypeScript | Repo was already 100% TS, so re-scoped to `strict: true` + removing ~22 production `any` usages. `/code-review` (8 parallel finder agents) caught a real regression it introduced, fixed same session. |
| [#9](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/9) | Split article monolith into comment/favorite/bookmark modules | Split monolithic layers into independent files | `/code-review` twice: once after the split, once after a follow-up dedup pass (shared `AUTHOR_SELECT`/`mapRelationArticle` helper, `authorMapper` reuse in `comment.service.ts`). |
| [#10](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/10) | Generate missing Prisma migration for the bookmark relation | Bookmarking feature (schema already had the relation, migration never generated) | |
| [#11](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/11) | Add CI pipeline (build, lint, test) via GitHub Actions | (implied by issue-tracking/testing-strategy scope items — no CI existed before) | `/code-review` found the CI itself had a redundant typecheck step and silently skipped the `e2e` Nx project; fixed same session. |

A final full-session `/code-review` (`6690d17...HEAD`) covering issues #6/#8/#9/#10/#11 together
found two stale OpenAPI response schemas (fixed) and that `documentação/` — despite the internal
guide saying it must never be committed — had been committed two sessions earlier; untracked and
added to the versioned `.gitignore` (the local `.git/info/exclude` the guide specified doesn't
propagate to other clones/CI, which is itself now documented as a corrected roadmap item).

## Going forward

1. Open a GitHub issue before starting work (use the templates in `.github/ISSUE_TEMPLATE/`,
   documented in `CONTRIBUTING.md`).
2. Reference the issue number in every commit, e.g. `fix(rate-limit): trigger real 429 in integration test (#2)`.
3. Close the issue when the PR merges, with a comment summarizing what shipped.
