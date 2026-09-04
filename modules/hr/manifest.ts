/**
 * Module manifest -- architectural metadata only (architecture-final.md 4.2).
 *
 * `permissions` names the codes this module OWNS and their lifecycle status
 * (ADR-019). `tests/unit/permission-vocabulary.test.ts` is what makes that
 * load-bearing: it holds this list, the `PERMISSIONS` registry in
 * `packages/policy` and the `policy` declaration on every route contract to
 * each other, so a code demanded by a route with no owner here, a registry
 * entry no module claims, or a retired code still being demanded is a failure
 * rather than a divergence nobody can see.
 *
 * WHAT IS NOT ENFORCED, because the sentence that used to stand here claimed it
 * was: there is no committed vocabulary snapshot, so a code removed from all
 * three places at once passes. The tombstone half of ADR-019 is not built. The
 * previous header asserted "a code removed without a tombstone fails CI too"
 * while NOTHING read this file at all -- a named control that had never been a
 * control, which is the more expensive kind of stale comment because it buys
 * confidence rather than merely being wrong.
 *
 * Every other field below is declarative and has no reader yet. They are the
 * module's own statement of what it is, and they are worth keeping accurate for
 * the same reason -- but nothing here should be cited as a check.
 */
export default {
  /** ADR-008: which country-pack contributions this module consumes. */
  countryContributions: [] as const,
  dependencies: [] as const,
  /**
   * ADR-009's three levels plus the payroll scope they hang from. `person`,
   * `employee` and `employment` are separate entities and not one row with a
   * history table, because one person employed by two legal entities in one
   * period is the case a single row cannot represent -- and it resolves
   * silently into one blended payslip rather than loudly into an error.
   */
  entities: ['emergency_contact', 'employee', 'employment', 'legal_entity', 'person'] as const,
  eventsConsumed: [] as const,
  eventsEmitted: [] as const,
  featureFlags: [] as const,
  id: 'hr',
  navigation: [{ id: 'hr.employees', label: 'Employees', path: '/employees' }] as const,
  optionalIntegrations: [] as const,
  /**
   * ADR-017: effective-dated facts payroll treats as inputs.
   *
   * `employment` is the one, and it is THE one -- ADR-009 puts the payroll
   * engine's signature at `calculatePayroll(employmentSnapshot, ...)` precisely
   * so that a person spanning two legal entities in a period produces two runs
   * rather than one ambiguous answer. Declared now that the entity exists;
   * nothing consumes this field yet because no payroll module does.
   */
  payrollInputs: ['employment'] as const,
  permissions: [
    { code: 'hr.employee.onboard', status: 'active' },
    { code: 'hr.employee.read', status: 'active' },
    { code: 'hr.employee.transfer', status: 'active' },
    { code: 'hr.employee.update', status: 'active' },
    { code: 'hr.legal_entity.read', status: 'active' },
  ] as const,
  version: '0.2.0',
  workflows: [] as const,
} as const
