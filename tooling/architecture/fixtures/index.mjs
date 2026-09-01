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

  'fixtures-declare-their-instants': {
    clean: {
      path: 'tests/fixtures/tenancy.ts',
      source: `const FIXTURE_VALID_FROM = new Date('2020-01-01T00:00:00.000Z')
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

  'module-boundaries': {
    clean: {
      path: 'modules/payroll/application/commands/approve.ts',
      source: `import { getEmployment } from '@xforge/modules/hr/application/queries'
`,
    },
    violating: {
      path: 'modules/payroll/application/commands/approve.ts',
      source: `import { employeeRepo } from '@xforge/modules/hr/infrastructure/repository'
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
      source: `import { Stack } from '@xforge/ui'
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
      source: `import { Text } from '@xforge/ui'
export const Row = () => <Text tone="muted">fine</Text>
`,
    },
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
    violating: {
      path: 'apps/web/app/api/route.ts',
      source: `const ctx = <VerifiedTenantContext>{ tenantId: header }
export const go = () => ctx
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
  'stylesheet-names-roles-not-primitives': {
    clean: {
      path: 'packages/ui/src/ui.css',
      source: `/* --space-5 is a primitive; this rule names the role instead */
.xf-card { padding: var(--component-card-padding); gap: var(--semantic-space-stack); }
`,
    },
    violating: {
      path: 'packages/ui/src/ui.css',
      source: `.xf-card { padding: var(--space-5); }
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
      path: 'packages/ui/src/ui.css',
      source: `/* #2563eb lives in tokens.json, not here */
.xf-button { background: var(--semantic-accent-default); }
`,
    },
    violating: {
      path: 'packages/ui/src/ui.css',
      source: `.xf-button { background: #2563eb; }
`,
    },
  },

  'transport-enters-apps-only-at-the-boundary': {
    clean: {
      path: 'apps/web/app/employees/[employeeId]/emergency-contacts.tsx',
      source: `import type { ResourceState } from '@xforge/ui/state'${String.fromCharCode(10)}`,
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
      source: `import type { ResourceState } from '@xforge/ui/state'${String.fromCharCode(10)}`,
    },
    violating: {
      path: 'apps/web/app/employees/[employeeId]/emergency-contacts.tsx',
      source: `import { listEmergencyContacts } from '@xforge/hr'${String.fromCharCode(10)}`,
    },
  },
  'ui-holds-no-transport-vocabulary': {
    clean: {
      path: 'packages/ui/src/state.ts',
      source: `import type { ReactNode } from 'react'${String.fromCharCode(10)}`,
    },
    violating: {
      path: 'packages/ui/src/state.ts',
      source: `import type { Completeness } from '@xforge/api-client'${String.fromCharCode(10)}`,
    },
  },
  'ui-holds-no-transport-vocabulary-module': {
    clean: {
      path: 'packages/ui/src/state.ts',
      source: `import type { ReactNode } from 'react'${String.fromCharCode(10)}`,
    },
    violating: {
      path: 'packages/ui/src/state.ts',
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
    violating: {
      path: 'apps/web/app/dashboard/page.tsx',
      source: `import { emergencyContact } from '@xforge/db/schema'
export default function Page() { return null }
`,
    },
  },
}
