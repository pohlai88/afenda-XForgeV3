/**
 * Guard mutation fixtures.
 *
 * For every guard, two fixtures:
 *   violating -- a deliberate breach the guard MUST flag
 *   clean     -- a legitimate near-miss the guard MUST NOT flag
 *
 * Both directions matter. A guard that flags everything is as useless as one
 * that flags nothing, and only the clean fixture catches the first failure mode.
 *
 * Fixtures carry a pretend `path` because most guards are path-scoped, and they
 * are plain strings rather than files on disk so the real workspace scan can
 * never accidentally pick them up.
 *
 * OWNERSHIP IS DECLARED. A fixture whose key is a guard id IS that guard's
 * primary case; any other fixture names its guard with `guardId`. The prover
 * used to infer the second kind from the key prefix, and `fixturesFor()` records
 * why that was replaced -- a guard id that became another's prefix would
 * silently steal its proof.
 *
 * THE MIGRATION WAS INCOMPLETE, and nothing said so. The contract and config
 * families gained their `guardId` declarations; these ten did not, so they were
 * matched by neither rule and ran against nothing:
 *
 *   kernel-independence-dynamic          no-control-characters-...-zero-width
 *   kernel-independence-package-name     no-control-characters-...-nul-in-markdown
 *   no-bespoke-styling-inline            no-forged-tenant-context-angle
 *   ui-no-data-imports-page              production-source-...-type-only
 *   ui-holds-no-transport-vocabulary-module
 *   transport-enters-apps-only-at-the-boundary-module
 *
 * Ten of thirty-seven, written and committed and executed by nothing, while the
 * harness reported "42 proven" -- a number that was true about the guards and
 * silent about the cases. The zero-width and NUL-in-markdown cases are the two
 * this repository paid for twice. Every one passes now that it runs.
 */

export const fixtures = {
  'ai-tool-no-data-access': {
    clean: {
      path: 'packages/ai/tools/leave.ts',
      source: `import { getLeaveBalance } from '@xforge/modules/hr/application/queries'
`,
    },
    violating: {
      path: 'packages/ai/tools/leave.ts',
      source: `import { db } from '@xforge/db'
`,
    },
  },
  'case-lives-in-the-copy': {
    // The same label, written as it should read. An acronym is TYPED as one --
    // where a translator and a screen reader can both see it -- which is the
    // distinction the guard draws: not "never uppercase", but "not in CSS".
    clean: {
      path: 'packages/design/src/components/ui/statutory.tsx',
      source: `export function Statutory() {
  return <span className="font-label text-label">EPF employee contribution</span>
}
`,
    },
    violating: {
      path: 'packages/design/src/components/ui/statutory.tsx',
      source: `export function Statutory() {
  return <span className="font-label text-label uppercase">EPF employee contribution</span>
}
`,
    },
  },

  'country-branching-in-core': {
    clean: {
      path: 'packages/localisation/my/payroll.ts',
      source: `export const jurisdiction = 'MY'
export const rulePacks = []
`,
    },
    violating: {
      path: 'modules/payroll/domain/rules/contributions.ts',
      source: `export function rate(country: string) {
  if (country === 'MY') return 0.11
  return 0
}
`,
    },
  },

  // THE ACCEPTANCE HALF, which neither guard had. Both primary fixtures put
  // their clean case on a path their guard does not govern -- `apps/admin/` and
  // `packages/localisation/` are exclusions -- so `accept` returned [] without
  // calling check, and the harness printed "accepts clean" for a question it
  // never asked. Those fixtures still pin the exclusions and are kept; these
  // ask the other question, on paths the guard really claims.
  //
  // Both clean cases exercise `isNonCallContext`, the branch that separates a
  // call from prose naming one. It was reachable from zero fixtures, so
  // deleting it left the mutation test PROVEN and the workspace scan at zero.
  'country-branching-in-core-in-scope': {
    because: 'country conditional',
    clean: {
      path: 'modules/hr/application/queries.ts',
      // A country comparison the rule does not govern, and the rule quoted in
      // prose. Neither is a country conditional in core.
      source: `// Never write: country === 'MY' -- see ADR on localisation.
export const isSupported = (country: string) => country !== ''
`,
    },
    guardId: 'country-branching-in-core',
    violating: {
      path: 'modules/hr/application/queries.ts',
      source: `export const rate = (country: string) => (country === 'SG' ? 1 : 0)
`,
    },
  },

  'db-access-outside-repository': {
    // The repository is exactly where this belongs, and must not be flagged.
    clean: {
      path: 'modules/hr/infrastructure/repository/emergency-contact.ts',
      source: `import { withTenant } from '@xforge/db'
export const list = (ctx) => withTenant(ctx, async (sql) => sql\`select 1\`)
`,
    },
    violating: {
      path: 'modules/hr/application/commands/add-contact.ts',
      source: `import { withTenant } from '@xforge/db'
export const add = (ctx) => withTenant(ctx, async (sql) => sql\`insert into x\`)
`,
    },
  },

  'effective-dated-recorded-at': {
    clean: {
      path: 'packages/db/schema/employment.ts',
      source: `export const employment = pgTable('employment', {
  id: uuid().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
}
`,
    },
    violating: {
      path: 'packages/db/schema/employment.ts',
      source: `export const employment = pgTable('employment', {
  id: uuid().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
}
`,
    },
  },

  // THE SHAPE THIS REPOSITORY ACTUALLY WRITES, which the primary fixture above
  // does not: three arguments, a table-extras callback, a chained `.enableRLS()`,
  // and a SECOND declaration after it. The old block pattern ended a table at a
  // `}` in column zero, so against the real schema it produced one match that
  // swallowed the following table and skipped the two after that -- while
  // passing the single-argument fixture. `valid_from` is the vocabulary too:
  // `effective_from` appears in no source file here.
  'effective-dated-recorded-at-multi-arg': {
    because: 'recorded_at',
    clean: {
      path: 'packages/db/src/schema/index.ts',
      source: `export const employment = pgTable(
  'employment',
  {
    tenantId: uuid('tenant_id').notNull(),
    validFrom: timestamp('valid_from').notNull(),
    recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  },
  (t) => [index('employment_tenant_idx').on(t.tenantId)]
).enableRLS()

export const tenant = pgTable('tenant', { id: uuid().primaryKey() })
`,
    },
    guardId: 'effective-dated-recorded-at',
    violating: {
      path: 'packages/db/src/schema/index.ts',
      source: `export const employment = pgTable(
  'employment',
  {
    tenantId: uuid('tenant_id').notNull(),
    validFrom: timestamp('valid_from').notNull(),
  },
  (t) => [index('employment_tenant_idx').on(t.tenantId)]
).enableRLS()

export const tenant = pgTable('tenant', { id: uuid().primaryKey() })
`,
    },
  },

  // THE CLEAN CASE CARRIES `Date.now()` ON PURPOSE. The guard's pattern was a
  // bare `now()` with nothing in front of it, so every JavaScript clock in a
  // fixture was reported as a database one -- it fired twice on a lock loop
  // measuring elapsed milliseconds. The clean fixture said nothing about that
  // case, so the harness proved the guard rejected SQL and never asked what else
  // it rejected. A mutation test that only exercises the violation is half a
  // test: it cannot tell a guard that is right from one that is merely loud.
  'fixtures-declare-their-instants': {
    clean: {
      path: 'tests/fixtures/tenancy.ts',
      source: `const FIXTURE_VALID_FROM = new Date('2020-01-01T00:00:00.000Z')
const deadline = Date.now() + 5000
await owner\`insert into m (valid_from) values (\${FIXTURE_VALID_FROM})\`
`,
    },
    violating: {
      path: 'tests/fixtures/tenancy.ts',
      source: `await owner\`insert into m (valid_from) values (now() - interval '1 second')\`
`,
    },
  },

  'fixtures-delete-only-what-they-own': {
    clean: {
      path: 'tests/fixtures/tenancy.ts',
      source: `await owner\`delete from tenant_membership where principal_id = \${id}\`
`,
    },
    violating: {
      path: 'tests/fixtures/tenancy.ts',
      source: `await owner\`delete from tenant_membership\`
`,
    },
  },

  'job-sdk-in-domain': {
    clean: {
      path: 'modules/payroll/application/commands/release.ts',
      source: `import { enqueue } from '@xforge/jobs'
`,
    },
    violating: {
      path: 'modules/payroll/application/commands/release.ts',
      source: `import { task } from '@trigger.dev/sdk'
`,
    },
  },

  'kernel-independence': {
    clean: {
      path: 'packages/policy/src/evaluate.ts',
      source: `import { scopeOf } from '@xforge/organisation'
`,
    },
    violating: {
      path: 'packages/policy/src/evaluate.ts',
      source: `import { payrollRun } from '@xforge/modules/payroll/domain/model'
`,
    },
  },

  'kernel-independence-dynamic': {
    clean: {
      path: 'packages/api/src/app.ts',
      source: `export const go = async () => await import('@xforge/policy')
`,
    },
    guardId: 'kernel-independence',
    violating: {
      path: 'packages/api/src/app.ts',
      source: `export const go = async () => await import('@xforge/hr')
`,
    },
  },

  // The shape a violation ACTUALLY takes: modules are imported by package name.
  // The original fixture used '@xforge/modules/payroll/domain/model', which
  // nothing writes, so the guard passed its mutation test while never having
  // caught a real violation.
  'kernel-independence-package-name': {
    clean: {
      path: 'packages/policy/src/evaluate.ts',
      source: `import { withTenant } from '@xforge/db'
`,
    },
    guardId: 'kernel-independence',
    violating: {
      path: 'packages/policy/src/evaluate.ts',
      source: `import { hrRoutes } from '@xforge/hr'
`,
    },
  },

  'legal-entity-binding': {
    clean: {
      path: 'modules/payroll/infrastructure/repository/runs.ts',
      source: `export async function listRuns(legalEntityId: string, period: string) {
  return []
}
`,
    },
    violating: {
      path: 'modules/payroll/infrastructure/repository/runs.ts',
      source: `export async function listRuns(period: string) {
  return []
}
`,
    },
  },

  // BY PACKAGE NAME. This used `@xforge/modules/hr/...`, a specifier nothing in
  // this repository can write and nothing resolves -- so the guard was PROVEN
  // against a shape that does not exist while being unable to see the one that
  // does. `@xforge/hr/repository` is a real declared export of modules/hr,
  // pointing straight at its persistence layer, which is precisely what law 16
  // forbids another module from reaching.
  'module-boundaries': {
    because: 'private path',
    clean: {
      path: 'modules/payroll/application/commands/approve.ts',
      source: `import { hrRoutes } from '@xforge/hr/contract'
`,
    },
    violating: {
      path: 'modules/payroll/application/commands/approve.ts',
      source: `import { list } from '@xforge/hr/repository'
`,
    },
  },

  'money-float': {
    clean: {
      path: 'modules/payroll/domain/rules/payslip-amount.ts',
      source: `import { minorUnits } from '@xforge/money'
export const net = (g: bigint, d: bigint) => g - d
`,
    },
    violating: {
      path: 'modules/payroll/domain/rules/payslip-amount.ts',
      source: `export const net = (g: number, d: number) => (g - d).toFixed(2)
`,
    },
  },

  'no-bespoke-styling': {
    // The same screen, composing a primitive. Must NOT be flagged, or the guard
    // makes the design system unusable and gets removed.
    clean: {
      path: 'apps/web/app/employees/page.tsx',
      source: `import { Stack } from '@xforge/design'
export default function Page() {
  return <Stack gap="tight">fine</Stack>
}
`,
    },
    violating: {
      path: 'apps/web/app/employees/page.tsx',
      source: `export default function Page() {
  return <div className="grid gap-4">nope</div>
}
`,
    },
  },

  'no-bespoke-styling-inline': {
    clean: {
      path: 'modules/hr/ui/contact-row.tsx',
      source: `import { Text } from '@xforge/design'
export const Row = () => <Text tone="muted">fine</Text>
`,
    },
    guardId: 'no-bespoke-styling',
    violating: {
      path: 'modules/hr/ui/contact-row.tsx',
      source: `export const Row = () => <div style={{ marginTop: 8 }}>nope</div>
`,
    },
  },
  /**
   * Built entirely from character codes, with no escape sequence anywhere.
   *
   * A fixture for a guard against mangled escapes must not itself contain one:
   * the first attempt wrote the newline as an escape, it arrived as a real line
   * break, and the module stopped parsing. That is the same defect the guard
   * exists to catch, one line after the guard was written.
   */
  'no-control-characters-in-source': {
    clean: {
      path: 'tooling/x.mjs',
      // A word boundary that survived the journey intact.
      source: `const re = /${String.fromCharCode(92)}b(now)/${String.fromCharCode(10)}`,
    },
    violating: {
      // The same regex after the escape was mangled: a literal backspace.
      path: 'tooling/x.mjs',
      source: `const re = /${String.fromCharCode(8)}(now)/${String.fromCharCode(10)}`,
    },
  },
  // A NUL in expected-text material. This is the case the scan universe used to
  // let escape: `trackedFiles()` called any NUL-bearing file binary and withheld
  // it, so the one character this guard exists to reject was also the character
  // that made a file invisible to it. Classification is now declared by path, so
  // malformed contents are a finding rather than an exemption -- and Markdown is
  // in scope precisely because that is where the real one was found.
  'no-control-characters-in-source-nul-in-markdown': {
    clean: {
      path: '.architecture/example.md',
      source: `a table row that survived intact${String.fromCharCode(10)}`,
    },
    guardId: 'no-control-characters-in-source',
    violating: {
      path: '.architecture/example.md',
      source: `a table row that did not${String.fromCharCode(0)}${String.fromCharCode(10)}`,
    },
  },
  // The wider family: invisible, legal, and able to change meaning. A
  // zero-width space splits an identifier that reads as one word.
  'no-control-characters-in-source-zero-width': {
    clean: {
      path: 'tooling/x.mjs',
      source: `const tenantId = 1${String.fromCharCode(10)}`,
    },
    guardId: 'no-control-characters-in-source',
    violating: {
      path: 'tooling/x.mjs',
      source: `const tenant${String.fromCharCode(8203)}Id = 1${String.fromCharCode(10)}`,
    },
  },

  'no-forged-tenant-context': {
    clean: {
      path: 'modules/hr/index.ts',
      source: `import { withTenant } from '@xforge/db'
import type { VerifiedTenantContext } from '@xforge/tenancy'
export const go = (ctx: VerifiedTenantContext) => withTenant(ctx, async () => 1)
`,
    },
    violating: {
      path: 'modules/hr/index.ts',
      source: `import { withTenant } from '@xforge/db'
const ctx = { tenantId: req.body.tenantId } as VerifiedTenantContext
export const go = () => withTenant(ctx, async () => 1)
`,
    },
  },

  // The angle-bracket assertion, which reads nothing like the `as` form and is
  // exactly what someone reaches for once the `as` form starts failing builds.
  'no-forged-tenant-context-angle': {
    // A generic argument is not an assertion, and confusing the two would make
    // the guard unusable in exactly the files that handle tenant contexts.
    clean: {
      path: 'apps/web/app/api/route.ts',
      source: `async function load(): Promise<VerifiedTenantContext> {
  return resolve()
}
`,
    },
    guardId: 'no-forged-tenant-context',
    violating: {
      path: 'apps/web/app/api/route.ts',
      source: `const ctx = <VerifiedTenantContext>{ tenantId: header }
export const go = () => ctx
`,
    },
  },
  /**
   * THE CLEAN SIDE CALLS `revalidateTag`, deliberately.
   *
   * A fixture whose clean side merely omitted the cache would pass a guard that
   * banned every `next/cache` import, and that guard would be wrong:
   * `revalidateTag` and `revalidatePath` DESTROY cache entries. Banning them
   * bans the cure. So the clean side reaches into next/cache and must still be
   * accepted, which is the distinction the rule actually draws.
   */
  'no-next-cache-in-business-path': {
    because: 'persistent cache boundary',
    clean: {
      path: 'modules/hr/queries.ts',
      source: `import { revalidateTag } from 'next/cache'

export async function invalidateContacts() {
  revalidateTag('emergency-contacts')
}
`,
    },
    violating: {
      path: 'modules/hr/queries.ts',
      source: `export async function listContacts(employeeId: string) {
  'use cache'
  return await repository.listByEmployee(employeeId)
}
`,
    },
  },
  'no-raw-spacing-value': {
    // The same row, naming the relationships. `p-0` is permitted: zero is the
    // absence of a spacing decision rather than one written as a number.
    clean: {
      path: 'packages/design/src/components/ui/row.tsx',
      source: `export function Row() {
  return <div className="flex gap-tight px-row-x py-control-y p-0">cell</div>
}
`,
    },
    violating: {
      path: 'packages/design/src/components/ui/row.tsx',
      source: `export function Row() {
  return <div className="flex gap-2 px-4 py-1.5">cell</div>
}
`,
    },
  },
  'no-raw-stacking-value': {
    // The same portalled surface, naming the layer it sits on. Must NOT be
    // flagged, or the guard makes every overlay unwritable and gets removed.
    clean: {
      path: 'packages/design/src/components/ui/popover.tsx',
      source: `export function Popover() {
  return <div className="layer-overlay shadow-floating">content</div>
}
`,
    },
    violating: {
      path: 'packages/design/src/components/ui/popover.tsx',
      source: `export function Popover() {
  return <div className="z-50 shadow-floating">content</div>
}
`,
    },
  },

  'no-transition-all': {
    // The curated set: colour, opacity, shadow, transform, filter. It animates
    // what should animate and touches no layout property.
    clean: {
      path: 'packages/design/src/components/ui/chip.tsx',
      source: `export function Chip() {
  return <span className="h-control transition duration-150">chip</span>
}
`,
    },
    violating: {
      path: 'packages/design/src/components/ui/chip.tsx',
      source: `export function Chip() {
  return <span className="h-control transition-all duration-150">chip</span>
}
`,
    },
  },

  'no-wall-clock-in-modules': {
    clean: {
      path: 'modules/payroll/domain/rules/period.ts',
      source: `import { businessToday } from '@xforge/time'
export const today = (le: string) => businessToday(le)
`,
    },
    violating: {
      path: 'modules/payroll/domain/rules/period.ts',
      source: `export const today = () => new Date()
`,
    },
  },

  'platform-access-outside-admin': {
    clean: {
      path: 'apps/admin/app/tenants/page.tsx',
      source: `import { withPlatformAccess } from '@xforge/tenancy'
export const all = () =>
  withPlatformAccess(
    { operation: 'admin.tenant-list', reason: 'platform console listing' },
    async () => [],
  )
`,
    },
    // The clean fixture deliberately includes an import and a doc comment
    // mentioning the symbol -- the two shapes that made this guard
    // false-positive on real code the first time it ran.
    violating: {
      path: 'modules/payroll/application/queries/summary.ts',
      source: `import { withPlatformAccess } from '@xforge/tenancy'
export const all = () =>
  withPlatformAccess(
    { operation: 'billing.usage-rollup', reason: 'monthly reporting' },
    async () => [],
  )
`,
    },
  },

  'platform-access-outside-admin-in-scope': {
    because: 'withPlatformAccess',
    clean: {
      path: 'modules/hr/application/queries.ts',
      // Named, never called: an import and a comment. A guard that cannot tell
      // those from a call site teaches people to stop reading it.
      source: `import type { withPlatformAccess } from '@xforge/db'
// withPlatformAccess( is forbidden here; the repository layer is the way in.
export const list = () => []
`,
    },
    guardId: 'platform-access-outside-admin',
    violating: {
      path: 'modules/hr/application/queries.ts',
      source: `export const all = () => withPlatformAccess(async (sql) => sql\`select 1\`)
`,
    },
  },
  'production-carries-no-fixture-identity': {
    clean: {
      path: 'apps/web/app/api/route.ts',
      source: `const tenant = process.env.DEV_TENANT_ID${String.fromCharCode(10)}`,
    },
    violating: {
      path: 'apps/web/app/api/route.ts',
      // TENANT_A's value, which the guard reads from tests/fixtures rather than
      // from a copy. If the owner ever changes it, this fixture follows.
      source: `const tenant = '11111111-1111-4111-8111-111111111111'${String.fromCharCode(10)}`,
    },
  },
  // Resolved against the REAL modules/hr manifest, which declares vitest in
  // devDependencies and hono in dependencies. Deriving from the manifest rather
  // than from a list in the guard is the property under proof: change that
  // manifest and this fixture changes meaning with it.
  'production-source-declares-what-it-imports': {
    clean: {
      path: 'modules/hr/src/thing.ts',
      source: `import { Hono } from 'hono'${String.fromCharCode(10)}`,
    },
    violating: {
      path: 'modules/hr/src/thing.ts',
      source: `import { vi } from 'vitest'${String.fromCharCode(10)}`,
    },
  },
  // The erasure case, which the guard found on its own first run: a type import
  // has no runtime existence, so a production install omitting the package
  // cannot break it.
  'production-source-declares-what-it-imports-type-only': {
    clean: {
      path: 'modules/hr/src/thing.ts',
      source: `import type { Mock } from 'vitest'${String.fromCharCode(10)}`,
    },
    guardId: 'production-source-declares-what-it-imports',
    violating: {
      path: 'modules/hr/src/thing.ts',
      source: `import { expect } from 'vitest'${String.fromCharCode(10)}`,
    },
  },

  'route-policy-declaration': {
    clean: {
      path: 'modules/payroll/contract/routes.ts',
      source: `export const approveRun = createRoute({
  method: 'post',
  path: '/v1/payroll-runs/{id}/approve',
  operationId: 'approvePayrollRun',
  policy: { permission: 'payroll.run.approve', scopeType: 'legal_entity' },
})
`,
    },
    violating: {
      path: 'modules/payroll/contract/routes.ts',
      source: `export const approveRun = createRoute({
  method: 'post',
  path: '/v1/payroll-runs/{id}/approve',
  operationId: 'approvePayrollRun',
})
`,
    },
  },

  'server-action-business-mutation': {
    clean: {
      path: 'apps/web/app/employees/actions.ts',
      source: `'use server'
export async function revalidate() {
  return null
}
`,
    },
    violating: {
      path: 'apps/web/app/employees/actions.ts',
      source: `'use server'
export async function save(input: unknown) {
  await repository.update(input)
}
`,
    },
  },
  'tenancy-primitives-confined': {
    clean: {
      path: 'modules/payroll/application/run.ts',
      source: `import { withTenant } from '@xforge/db'
export const go = (ctx: VerifiedTenantContext) => withTenant(ctx, async () => 1)
`,
    },
    violating: {
      path: 'modules/payroll/application/run.ts',
      source: `import { hasActiveMembership } from '@xforge/db'
export const go = (t: string, p: string) => hasActiveMembership(d, t, p, new Date())
`,
    },
  },

  'tokens-are-the-authority': {
    clean: {
      path: 'packages/design/src/ui.css',
      source: `/* #2563eb lives in tokens.json, not here */
.xf-button { background: var(--semantic-surface-accent); }
`,
    },
    violating: {
      path: 'packages/design/src/ui.css',
      source: `.xf-button { background: #2563eb; }
`,
    },
  },

  'transport-enters-apps-only-at-the-boundary': {
    clean: {
      path: 'apps/web/app/employees/[employeeId]/emergency-contacts.tsx',
      source: `import type { ResourceState } from '@xforge/design/state'${String.fromCharCode(10)}`,
    },
    violating: {
      path: 'apps/web/app/employees/[employeeId]/emergency-contacts.tsx',
      source: `import { ApiProblem } from '@xforge/api-client'${String.fromCharCode(10)}`,
    },
  },

  // The MODULE branch of transport vocabulary, which neither fixture above
  // reached: both violate with '@xforge/api-client', so the alternative that
  // covers business modules was never observed to reject anything. It is
  // derived from BUSINESS_MODULES rather than spelled, and these two are what
  // make that derivation proven rather than asserted.
  'transport-enters-apps-only-at-the-boundary-module': {
    clean: {
      path: 'apps/web/app/employees/[employeeId]/emergency-contacts.tsx',
      source: `import type { ResourceState } from '@xforge/design/state'${String.fromCharCode(10)}`,
    },
    guardId: 'transport-enters-apps-only-at-the-boundary',
    violating: {
      path: 'apps/web/app/employees/[employeeId]/emergency-contacts.tsx',
      source: `import { listEmergencyContacts } from '@xforge/hr'${String.fromCharCode(10)}`,
    },
  },
  'ui-holds-no-transport-vocabulary': {
    clean: {
      path: 'packages/design/src/state.ts',
      source: `import type { ReactNode } from 'react'${String.fromCharCode(10)}`,
    },
    violating: {
      path: 'packages/design/src/state.ts',
      source: `import type { Completeness } from '@xforge/api-client'${String.fromCharCode(10)}`,
    },
  },
  'ui-holds-no-transport-vocabulary-module': {
    clean: {
      path: 'packages/design/src/state.ts',
      source: `import type { ReactNode } from 'react'${String.fromCharCode(10)}`,
    },
    guardId: 'ui-holds-no-transport-vocabulary',
    violating: {
      path: 'packages/design/src/state.ts',
      source: `import type { EmergencyContact } from '@xforge/hr/repository'${String.fromCharCode(10)}`,
    },
  },

  'ui-no-data-imports': {
    clean: {
      path: 'apps/web/app/employees/page.tsx',
      source: `import { useListEmployees } from '@xforge/api-client'
export default function Page() { return null }
`,
    },
    violating: {
      path: 'apps/web/app/employees/page.tsx',
      source: `import { db } from '@xforge/db'
export default function Page() { return null }
`,
    },
  },

  // A second violating case for the same guard: a page under apps/web must
  // still be caught even though the sibling API mount is exempt. Without this,
  // the exemption could be widened to all of apps/web and no fixture would notice.
  'ui-no-data-imports-page': {
    clean: {
      path: 'apps/web/app/api/[[...route]]/route.ts',
      source: `import { createMemoryDriver, setDriver } from '@xforge/db'
setDriver(createMemoryDriver())
`,
    },
    guardId: 'ui-no-data-imports',
    violating: {
      path: 'apps/web/app/dashboard/page.tsx',
      source: `import { emergencyContact } from '@xforge/db/schema'
export default function Page() { return null }
`,
    },
  },
}
