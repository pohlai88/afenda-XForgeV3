import { defineConfig, devices } from '@playwright/test'
import { EMPLOYEE } from '@xforge/fixtures/employee'
import { appUrl } from '@xforge/fixtures/local-database'
import { TENANT_A } from '@xforge/fixtures/tenancy'
import { E2E_ORIGIN, E2E_PORT } from './tooling/e2e/config.ts'

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
    baseURL: E2E_ORIGIN,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // The preflight names whoever holds the port. It runs only when Playwright's
      // own URL probe does NOT pre-empt it -- see the note in that file; for the
      // pre-empted case the same diagnosis is available as `pnpm e2e:port`.
      command: `pnpm -s e2e:port && pnpm --filter @xforge/web exec next start -p ${E2E_PORT}`,
      // The app has no credential fallback by design, so the harness supplies one
      // explicitly rather than the application defaulting to a developer database.
      // DEV_TENANT_ID joined it for the same reason: the composition root used to
      // carry the fixture tenant as a literal default, which is the fixture
      // becoming production configuration. The owner is TENANT_A and it is passed
      // from here, so one fact has one definition.
      // XFORGE_DEV_PRINCIPAL is enabled HERE and nowhere by default: `next start`
      // runs with NODE_ENV=production, so the suite exercises the shipped artefact
      // and needs the stub explicitly rather than by inference from the build mode.
      env: {
        APP_DATABASE_URL: appUrl(),
        DEV_TENANT_ID: TENANT_A,
        XFORGE_DEV_PRINCIPAL: 'enabled',
      },
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
      url: `${E2E_ORIGIN}/employees/${EMPLOYEE}`,
    },
  ],
  workers: 1,
})
