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
  'ui-no-data-imports': {
    violating: {
      path: 'apps/web/app/employees/page.tsx',
      source: `import { db } from '@xforge/db'
export default function Page() { return null }
`,
    },
    clean: {
      path: 'apps/web/app/employees/page.tsx',
      source: `import { useListEmployees } from '@xforge/api-client'
export default function Page() { return null }
`,
    },
  },

  // A second violating case for the same guard: a page under apps/web must
  // still be caught even though the sibling API mount is exempt. Without this,
  // the exemption could be widened to all of apps/web and no fixture would notice.
  'ui-no-data-imports-page': {
    violating: {
      path: 'apps/web/app/dashboard/page.tsx',
      source: `import { emergencyContact } from '@xforge/db/schema'
export default function Page() { return null }
`,
    },
    clean: {
      path: 'apps/web/app/api/[[...route]]/route.ts',
      source: `import { createMemoryDriver, setDriver } from '@xforge/db'
setDriver(createMemoryDriver())
`,
    },
  },

  'module-boundaries': {
    violating: {
      path: 'modules/payroll/application/commands/approve.ts',
      source: `import { employeeRepo } from '@xforge/modules/hr/infrastructure/repository'
`,
    },
    clean: {
      path: 'modules/payroll/application/commands/approve.ts',
      source: `import { getEmployment } from '@xforge/modules/hr/application/queries'
`,
    },
  },

  'kernel-independence': {
    violating: {
      path: 'packages/policy/src/evaluate.ts',
      source: `import { payrollRun } from '@xforge/modules/payroll/domain/model'
`,
    },
    clean: {
      path: 'packages/policy/src/evaluate.ts',
      source: `import { scopeOf } from '@xforge/organisation'
`,
    },
  },

  'route-policy-declaration': {
    violating: {
      path: 'modules/payroll/contract/routes.ts',
      source: `export const approveRun = createRoute({
  method: 'post',
  path: '/v1/payroll-runs/{id}/approve',
  operationId: 'approvePayrollRun',
})
`,
    },
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
  },

  'country-branching-in-core': {
    violating: {
      path: 'modules/payroll/domain/rules/contributions.ts',
      source: `export function rate(country: string) {
  if (country === 'MY') return 0.11
  return 0
}
`,
    },
    clean: {
      path: 'packages/localisation/my/payroll.ts',
      source: `export const jurisdiction = 'MY'
export const rulePacks = []
`,
    },
  },

  'money-float': {
    violating: {
      path: 'modules/payroll/domain/rules/payslip-amount.ts',
      source: `export const net = (g: number, d: number) => (g - d).toFixed(2)
`,
    },
    clean: {
      path: 'modules/payroll/domain/rules/payslip-amount.ts',
      source: `import { minorUnits } from '@xforge/money'
export const net = (g: bigint, d: bigint) => g - d
`,
    },
  },

  'server-action-business-mutation': {
    violating: {
      path: 'apps/web/app/employees/actions.ts',
      source: `'use server'
export async function save(input: unknown) {
  await repository.update(input)
}
`,
    },
    clean: {
      path: 'apps/web/app/employees/actions.ts',
      source: `'use server'
export async function revalidate() {
  return null
}
`,
    },
  },

  'job-sdk-in-domain': {
    violating: {
      path: 'modules/payroll/application/commands/release.ts',
      source: `import { task } from '@trigger.dev/sdk'
`,
    },
    clean: {
      path: 'modules/payroll/application/commands/release.ts',
      source: `import { enqueue } from '@xforge/jobs'
`,
    },
  },

  'effective-dated-recorded-at': {
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
  },

  'no-wall-clock-in-modules': {
    violating: {
      path: 'modules/payroll/domain/rules/period.ts',
      source: `export const today = () => new Date()
`,
    },
    clean: {
      path: 'modules/payroll/domain/rules/period.ts',
      source: `import { businessToday } from '@xforge/time'
export const today = (le: string) => businessToday(le)
`,
    },
  },

  'ai-tool-no-data-access': {
    violating: {
      path: 'packages/ai/tools/leave.ts',
      source: `import { db } from '@xforge/db'
`,
    },
    clean: {
      path: 'packages/ai/tools/leave.ts',
      source: `import { getLeaveBalance } from '@xforge/modules/hr/application/queries'
`,
    },
  },

  'legal-entity-binding': {
    violating: {
      path: 'modules/payroll/infrastructure/repository/runs.ts',
      source: `export async function listRuns(period: string) {
  return []
}
`,
    },
    clean: {
      path: 'modules/payroll/infrastructure/repository/runs.ts',
      source: `export async function listRuns(legalEntityId: string, period: string) {
  return []
}
`,
    },
  },

  'platform-access-outside-admin': {
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
  },

  'no-forged-tenant-context': {
    violating: {
      path: 'modules/hr/index.ts',
      source: `import { withTenant } from '@xforge/db'
const ctx = { tenantId: req.body.tenantId } as VerifiedTenantContext
export const go = () => withTenant(ctx, async () => 1)
`,
    },
    clean: {
      path: 'modules/hr/index.ts',
      source: `import { withTenant } from '@xforge/db'
import type { VerifiedTenantContext } from '@xforge/tenancy'
export const go = (ctx: VerifiedTenantContext) => withTenant(ctx, async () => 1)
`,
    },
  },

  // The angle-bracket assertion, which reads nothing like the `as` form and is
  // exactly what someone reaches for once the `as` form starts failing builds.
  'no-forged-tenant-context-angle': {
    violating: {
      path: 'apps/web/app/api/route.ts',
      source: `const ctx = <VerifiedTenantContext>{ tenantId: header }
export const go = () => ctx
`,
    },
    // A generic argument is not an assertion, and confusing the two would make
    // the guard unusable in exactly the files that handle tenant contexts.
    clean: {
      path: 'apps/web/app/api/route.ts',
      source: `async function load(): Promise<VerifiedTenantContext> {
  return resolve()
}
`,
    },
  },

  'tenancy-primitives-confined': {
    violating: {
      path: 'modules/payroll/application/run.ts',
      source: `import { hasActiveMembership } from '@xforge/db'
export const go = (t: string, p: string) => hasActiveMembership(d, t, p, new Date())
`,
    },
    clean: {
      path: 'modules/payroll/application/run.ts',
      source: `import { withTenant } from '@xforge/db'
export const go = (ctx: VerifiedTenantContext) => withTenant(ctx, async () => 1)
`,
    },
  },

  'db-access-outside-repository': {
    violating: {
      path: 'modules/hr/application/commands/add-contact.ts',
      source: `import { withTenant } from '@xforge/db'
export const add = (ctx) => withTenant(ctx, async (sql) => sql\`insert into x\`)
`,
    },
    // The repository is exactly where this belongs, and must not be flagged.
    clean: {
      path: 'modules/hr/infrastructure/repository/emergency-contact.ts',
      source: `import { withTenant } from '@xforge/db'
export const list = (ctx) => withTenant(ctx, async (sql) => sql\`select 1\`)
`,
    },
  },
}
