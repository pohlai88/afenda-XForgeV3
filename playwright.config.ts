import { defineConfig, devices } from '@playwright/test'
import { appUrl } from './tests/fixtures/local-database'

/**
 * Flagship E2E for the spine phase.
 *
 * Runs against the real Next.js app and the real Hono mount -- no mocks, and
 * since tenancy slice 1, a real PostgreSQL behind the non-owner app_user role.
 * The mocks proved the UI could be finished before the backend existed; this
 * proves the two halves actually meet, on the path that ships.
 */
export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: false,
  globalSetup: './e2e/global-setup.ts',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  reporter: process.env.CI ? 'line' : [['list']],
  retries: 0,
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  webServer: {
    // The preflight refuses an occupied port and names the process holding it.
    // With reuse off, Playwright would otherwise report only that the port is
    // busy -- true, and not the two-hour diagnosis it cost the first time.
    command:
      'node tooling/e2e/preflight-port.mjs 3100 && pnpm --filter @xforge/web exec next start -p 3100',
    // The app has no credential fallback by design, so the harness supplies one
    // explicitly rather than the application defaulting to a developer database.
    env: { APP_DATABASE_URL: appUrl() },
    /**
     * NEVER reuse a server, locally or in CI.
     *
     * This was `!process.env.CI`, and a `next start` left over from a manual
     * measurement held port 3100 for two hours. Every Playwright run in that
     * window reused it, so the E2E stage tested a build from BEFORE the two
     * rebuilds that had happened since -- while reporting "5 flagship E2E specs
     * passed" each time. They did pass, on a stale artefact, because not one of
     * them depended on anything the rebuilds changed. The first spec that read a
     * stylesheet found the server returning Internal Server Error for a chunk
     * whose filename no longer existed.
     *
     * `pnpm verify` runs `build` and then `e2e`. Reusing a server started before
     * the build means the gate's own artefact is not what was tested, which is
     * the "a check that did not run is not a check that passed" failure wearing
     * a different costume. A fresh start costs about a second.
     */
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://127.0.0.1:3100/employees/33333333-3333-4333-8333-333333333333',
  },
  workers: 1,
})
