# Playwright E2E Tests — Conduit API

API-level end-to-end tests using [Playwright](https://playwright.dev/).
These tests **do not open a browser** — they use Playwright's `APIRequestContext`
to make HTTP requests directly against the running API server.

---

## Prerequisites

### 1. Node version

Requires **Node >= 18**. The project ships with Node 22 via nvm:

```bash
nvm use v22.23.1
```

### 2. Postgres database running

The API needs a live Postgres instance with migrations applied.

**Option A — Docker Compose (recommended):**

```bash
# Start only the database
docker compose up -d postgres

# Apply migrations
npx prisma migrate deploy --schema src/prisma/schema.prisma
```

**Option B — existing local Postgres:**

Set `DATABASE_URL` in your shell before running tests:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/conduit_dev"
npx prisma migrate deploy --schema src/prisma/schema.prisma
```

### 3. Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | none | PostgreSQL connection string |
| `JWT_SECRET` | No | `superSecret` | Dev/test default (§3 of refactoring guide) |
| `PORT` | No | `3000` | API port |
| `NODE_ENV` | No | `development` | Set to `test` if you want to suppress pretty logs |

> ⚠️ **Never use production credentials in tests.**
> All test users are generated at runtime with unique names — they do not use
> any real data.

---

## Running the tests

```bash
# Install Playwright browsers (first time only — not strictly needed for API tests)
npx playwright install --with-deps chromium

# Run all specs (starts API server automatically via webServer config)
npx playwright test

# Run a specific spec file
npx playwright test e2e/playwright/specs/auth.spec.ts

# Run with UI (useful for debugging)
npx playwright test --ui

# Run without starting the server (if API is already running on :3000)
PORT=3000 npx playwright test
```

---

## Branch behaviour

| Branch | Expected outcome |
|---|---|
| `e2e/passing` | All tests **pass** (0 failures) |
| `e2e/failing` | All tests pass **except** `bookmark.spec.ts`, which fails with 404 |

The `bookmark.spec.ts` test documents the contract for `POST /api/articles/:slug/bookmark`
which is not yet implemented (planned for Phase 4 — §4.5 of the refactoring guide).

---

## Test file structure

```
e2e/playwright/
  specs/
    health.spec.ts      — GET / health check
    auth.spec.ts        — POST /api/users (register) + POST /api/users/login
    articles.spec.ts    — GET /api/articles (list, pagination, field shape)
    tags.spec.ts        — GET /api/tags
    bookmark.spec.ts    — POST /api/articles/:slug/bookmark  ← fails on e2e/failing
  support/
    api-helpers.ts      — shared helpers (generateUserCredentials, registerUser, loginUser)
  tsconfig.json         — TypeScript config for Playwright specs
  README.md             — this file
playwright.config.ts    — Playwright configuration (at project root)
```

---

## CI integration (future — Phase 1/6)

When CI is configured, add this step after the build:

```yaml
- name: Run Playwright E2E tests
  run: npx playwright test
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
    CI: true
```

The `CI=true` flag enables `forbidOnly` (fails if `.only` is left in tests) and
enables one retry on failure.
