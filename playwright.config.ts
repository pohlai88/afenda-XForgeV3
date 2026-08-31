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
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @xforge/web exec next start -p 3100',
    url: 'http://127.0.0.1:3100/employees/33333333-3333-4333-8333-333333333333',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // The app has no credential fallback by design, so the harness supplies one
    // explicitly rather than the application defaulting to a developer database.
    env: { APP_DATABASE_URL: appUrl() },
  },
})
