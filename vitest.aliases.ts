import { fileURLToPath } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/**
 * Workspace aliases, stated once.
 *
 * Two Vitest configs consume them -- the ordinary suite and the architecture
 * qualification suite. Duplicating them would let the two drift, and a suite
 * resolving a different module than the application does is the exact failure
 * this phase is built to prevent.
 *
 * More specific entries first: '@xforge/db/postgres' must not be swallowed by
 * the '@xforge/db' prefix.
 */
export const aliases = {
  '@xforge/api-client/mocks': r('./packages/api-client/src/mocks.ts'),
  '@xforge/api-client': r('./packages/api-client/src/index.ts'),
  '@xforge/api': r('./packages/api/src/index.ts'),
  '@xforge/db/postgres': r('./packages/db/src/postgres-driver.ts'),
  '@xforge/db': r('./packages/db/src/index.ts'),
  '@xforge/policy': r('./packages/policy/src/index.ts'),
  '@xforge/tenancy': r('./packages/tenancy/src/index.ts'),
  '@xforge/fixtures/local-database': r('./tests/fixtures/local-database.ts'),
  '@xforge/fixtures/tenancy': r('./tests/fixtures/tenancy.ts'),
  '@xforge/hr/repository': r('./modules/hr/infrastructure/repository/emergency-contact.ts'),
  '@xforge/hr': r('./modules/hr/index.ts'),
}
