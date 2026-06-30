import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration — API testing only (no browser UI).
 *
 * The API server is started via `webServer` before the tests run.
 * Set `reuseExistingServer: true` so tests work against a server
 * that was started manually (e.g. in CI or when Postgres is already up).
 *
 * Prerequisites (see e2e/playwright/README.md):
 *   - DATABASE_URL pointing to a running Postgres instance
 *   - Prisma migrations applied
 *   - JWT_SECRET (defaults to 'superSecret' in dev)
 */
export default defineConfig({
  testDir: './e2e/playwright/specs',
  testMatch: '**/*.spec.ts',

  /* Timeout per individual test (ms) */
  timeout: 30_000,

  /* Fail fast in CI; run all in dev */
  forbidOnly: !!process.env['CI'],

  /* Retry failed tests once in CI */
  retries: process.env['CI'] ? 1 : 0,

  /* Single worker to avoid parallel DB conflicts on shared test data */
  workers: 1,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    /* Base URL for all request() calls */
    baseURL: `http://localhost:${process.env['PORT'] ?? 3000}`,

    /* Extra HTTP headers sent on every request */
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },

  webServer: {
    command: 'npx nx serve api',
    port: Number(process.env['PORT'] ?? 3000),
    timeout: 60_000,
    /**
     * true  → reuse a server already running on the port (CI / manual start)
     * false → always start a fresh server
     */
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
