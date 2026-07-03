# 🎯 Local Issues Tracking — ARCHIVED

> **Superseded on 2026-07-03.** GitHub Issues were disabled on this repo when this file was
> created, so a local `LOCAL-XXX` registry was used as a workaround. GitHub Issues have since
> been enabled (`has_issues: true`) and are now the source of truth for tracking. This file is
> kept only as a historical record of LOCAL-001..006; new work is tracked at
> https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues.

**Project**: Node.js Express RealWorld Example App
**Environment**: Node.js v18.20.8, macOS 25.5.0

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

## 📋 Active work — tracked as GitHub Issues

| Issue | Title | Scope item |
|---|---|---|
| [#3](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/3) | Un-skip and fix contract integration tests | Integration tests for the current contract |
| [#4](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/4) | Upgrade Express 4->5 and Nx 17->23 | Update to the most recent framework version |
| [#5](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/5) | OpenAPI spec missing article/profile/tag routes | Document current API contract with OpenAPI/Swagger |
| [#6](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/6) | Run Stryker to completion, report mutation score | Mutation testing, cover to 95% |
| [#7](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/7) | Fix docker log validation script | Python script validates Docker startup/exit logs |

Closed: [#2](https://github.com/francielecapaulino-coder/node-express-realworld-example-app/issues/2) — rate-limit integration test now triggers a real 429.

## Going forward

1. Open a GitHub issue before starting work (use the templates in `.github/ISSUE_TEMPLATE/`).
2. Reference the issue number in every commit, e.g. `fix(rate-limit): trigger real 429 in integration test (#2)`.
3. Close the issue when the PR merges.
