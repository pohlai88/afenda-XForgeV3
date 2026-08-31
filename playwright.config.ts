import { defineConfig, devices } from '@playwright/test'

/**
 * Flagship E2E for the spine phase.
 *
 * Runs against the real Next.js app and the real Hono mount -- no mocks. The
 * mocks proved the UI could be finished before the backend existed; this proves
 * the two halves actually meet.
 */
export default defineConfig({
  testDir: './e2e',
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
  },
})
