# SKILLS — Conduit Backend

Registry of Coda skills available to this project, their role in the workflow,
and notes on skills that are needed but not yet available.

> Full prompt-by-prompt log (including non-committed content) lives in
> `documentação/PROMPTS-AND-SKILLS.md` (local-only, gitignored — doesn't exist
> in fresh clones; see `CONTRIBUTING.md`).

---

## Agent workflow prompts (reference)

| Prompt | Role | When to invoke |
|---|---|---|
| **Prompt 00** | Onboarding / Intake | First activation or after long gap — read `STATE.md` first |
| **Prompt 01** | Planner | Before any implementation — produces `PLAN.md` |
| **Prompt 02** | Builder | After `PLAN.md` is approved — implements the slice |
| **Prompt 03** | Evaluator | After implementation — validates acceptance criteria + deterministic gates |
| **Prompt 04** | Code Reviewer | After evaluation passes — reviews code quality, style, conventions, guide constraints |
| **Prompt 05** | Security Reviewer | Required for risk_category B/C/D slices — reviews security posture |
| **Prompt 06** | Closer | After code + security review pass — marks slice READY, updates `STATE.md` |

Advancement rule: **the operator explicitly invokes the next prompt**. The agent
does not self-advance between roles.

---

## Available Coda skills

| Skill | What it does | When to invoke in this project |
|---|---|---|
| `globant-qe-test-plan` | Generates an ISTQB-compliant test plan from user stories | Phase 2 (safety net) and Phase 5 (quality) — before writing any test suite |
| `globant-qe-test-scenario-designer` | Designs UI/API test scenarios (positive, negative, edge cases, test data, priority) | Before implementing any test: Playwright E2E specs, integration tests, rate-limit tests |
| `globant-qe-web-explorer` | Explores the app via browser/API and documents selectors and behaviors | `--for-automation` mode: validate real endpoint behavior before coding Playwright specs |
| `globant-qe-mcp-test-executor` | Runs documented test cases step-by-step via Playwright MCP without generating code | Post-implementation evaluation for any test suite |
| `globant-qe-bug-report-writer` | Converts raw test results into structured bug reports; consolidates bug trackers | When tests fail beyond expected; end-of-sprint defect consolidation |

---

## Skill usage per roadmap phase

| Phase | Skills to invoke (in order) |
|---|---|
| 1 — Foundation | none required |
| 2 — Safety net | `globant-qe-test-plan` → `globant-qe-test-scenario-designer` → `globant-qe-mcp-test-executor` |
| 3 — Internal refactor | `globant-qe-test-scenario-designer` (regression scenarios before touching service layer) |
| 4 — Features (rate limit + bookmark) | `globant-qe-test-scenario-designer` → `globant-qe-mcp-test-executor` → `globant-qe-bug-report-writer` |
| 5 — Quality (Playwright, Stryker) | `globant-qe-test-scenario-designer` → `globant-qe-web-explorer --for-automation` → `globant-qe-mcp-test-executor` → `globant-qe-bug-report-writer` |
| 6 — Operations | none required |

---

## Slice 001-playwright-e2e-branches — skill mapping

| Step | Prompt | Skill |
|---|---|---|
| Design test scenarios (before coding) | Prompt 01 / Planner | `globant-qe-test-scenario-designer` |
| Validate endpoint selectors | Prompt 02 / Builder | `globant-qe-web-explorer --for-automation` |
| Execute test cases post-implementation | Prompt 03 / Evaluator | `globant-qe-mcp-test-executor` |
| Report defects if extra failures found | Prompt 03 / Evaluator | `globant-qe-bug-report-writer` |
| Code review (quality, style, guide constraints) | Prompt 04 / Code Reviewer | none (manual review) |
| Security review (secrets, fixtures, posture) | Prompt 05 / Security Reviewer | none (manual review) |

---

## Skills needed but not yet available

| Missing skill | Needed capability | Current workaround |
|---|---|---|
| `opentelemetry-validator` | Assert spans/metrics/logs reach the collector correctly | Manual: Grafana UI + Prometheus query |
| `prisma-migration-reviewer` | Review Prisma migrations for destructiveness and reversibility | Manual: inspect SQL from `prisma migrate dev --create-only` |
| `conventional-commits-enforcer` | Enforce `type(scope): message #id` on every commit | Manual: configure `commitlint` (Phase 1 task) |
| `docker-compose-smoke-tester` | Start the full Compose stack and validate healthchecks automatically | `scripts/validate_docker_logs.py` (available now) |

---

## Key constraints for all skills

- **No real secrets in test fixtures.** Use `@ngneat/falso` for fake data; credentials
  must be generated at test runtime, never hardcoded.
- **`OTEL_SDK_DISABLED=true` in unit tests** — skills that generate test code must
  include this env var to avoid collector dependency.
- **No RealWorld contract changes** — skills must not add, remove, or rename API routes,
  envelopes, or error formats.
- **Files owned declared in PLAN.md** — skills must not modify files outside that list
  without a new PLAN.md.
