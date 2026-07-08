# Contributing

## Workflow

1. **Open an issue before starting work**, using one of the templates under
   [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) (`task`, `bug_report`, or
   `feature_request`). Every template includes a **Definition of Ready** and a
   **Definition of Done** checklist — fill in the DoR before you start coding, and
   don't close the issue (or merge the PR) until the DoD is satisfied.
2. **Reference the issue number in every commit**, using
   [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <summary> (#<id>)`.
   Example: `fix(auth): restore defensive optional chaining on auth-optional routes (#8)`.
   Common scopes in this codebase: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`,
   scoped by feature area (`auth`, `article`, `comment`, `favorite`, `bookmark`, `profile`,
   `tag`, `ci`, `prisma`, `docker`, `mutation`, ...).
3. **Open a PR linked to the issue** once the DoD checklist is met.

## Before opening a PR

Run the same checks CI runs:

```shell
npx tsc --noEmit -p tsconfig.app.json   # typecheck (app)
npx nx run-many --target=lint --all     # lint (api + e2e)
npx nx test api                         # unit + integration tests (also typechecks tests)
npx nx build api                        # production build
```

If your change touches business logic under `src/app/`, also check the mutation
score didn't regress:

```shell
npm run test:mutation
```

## Schema changes

If your change touches `src/prisma/schema.prisma`, generate a versioned migration —
never let the schema drift from what's actually applied to a database:

```shell
docker compose up -d postgres
npx prisma migrate dev --schema=src/prisma/schema.prisma --name <describe_the_change>
```

Review the generated SQL under `src/prisma/migrations/` before committing it.

## What stays out of version control

`documentação/`, `harness/`, `AGENTS.md`, and `CLAUDE.md` are internal,
local-only planning/agent-context files — they must never be committed. They
are listed in `.git/info/exclude` (a local, unversioned exclude list) so an
accidental `git add -A` doesn't pick them up.
