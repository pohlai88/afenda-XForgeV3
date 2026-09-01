import { fileURLToPath } from 'node:url'
import type { Alias } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/**
 * Workspace aliases, stated once and consumed by both Vitest configs -- the
 * ordinary suite and the architecture qualification suite. Duplicating them
 * would let the two drift, and a suite resolving a different module than the
 * application does is the exact failure this repository keeps having.
 *
 * EXACT-MATCH regexes, not prefix strings.
 *
 * This was an object keyed by module specifier, and the ordering mattered:
 * '@xforge/db' is a prefix of '@xforge/db/postgres', so the general entry had
 * to come second or it swallowed the specific one. A comment said so. Then a
 * linter sorted the keys alphabetically, put the general entry first, and every
 * suite that imports the Postgres driver stopped resolving.
 *
 * The comment was correct and unenforceable -- a sorter does not read prose.
 * Anchoring each pattern removes the ordering constraint altogether, which is
 * better than restoring an order something else can rearrange.
 */
const exact = (specifier: string, target: string): Alias => ({
  find: new RegExp(`^${specifier.replace(/[/\\-]/g, '\\$&')}$`),
  replacement: r(target),
})

export const aliases: Alias[] = [
  exact('@xforge/api', './packages/api/src/index.ts'),
  exact('@xforge/api-client', './packages/api-client/src/index.ts'),
  exact('@xforge/api-client/mocks', './packages/api-client/src/mocks.ts'),
  exact('@xforge/db', './packages/db/src/index.ts'),
  exact('@xforge/db/postgres', './packages/db/src/postgres-driver.ts'),
  exact('@xforge/fixtures/local-database', './tests/fixtures/local-database.ts'),
  exact('@xforge/fixtures/rls-checks', './tests/fixtures/rls-checks.ts'),
  exact('@xforge/fixtures/tenancy', './tests/fixtures/tenancy.ts'),
  exact('@xforge/hr', './modules/hr/index.ts'),
  exact('@xforge/hr/repository', './modules/hr/infrastructure/repository/emergency-contact.ts'),
  exact('@xforge/policy', './packages/policy/src/index.ts'),
  exact('@xforge/tenancy', './packages/tenancy/src/index.ts'),
  exact('@xforge/ui', './packages/ui/src/index.tsx'),
  exact('@xforge/ui/contracts', './packages/ui/src/contracts.ts'),
  exact('@xforge/ui/runtime', './packages/ui/src/runtime.ts'),
  exact('@xforge/ui/state', './packages/ui/src/state.ts'),
]
