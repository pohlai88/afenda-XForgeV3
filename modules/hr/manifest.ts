/**
 * Module manifest -- architectural metadata only (architecture-final.md 4.2).
 *
 * `permissions` is what makes the permission-vocabulary guard bidirectional
 * (ADR-019): a code used but not declared here fails CI, and a code removed
 * without a tombstone fails CI too.
 */
export default {
  /** ADR-008: which country-pack contributions this module consumes. */
  countryContributions: [] as const,
  dependencies: [] as const,
  entities: ['emergency_contact'] as const,
  eventsConsumed: [] as const,
  eventsEmitted: [] as const,
  featureFlags: [] as const,
  id: 'hr',
  navigation: [{ id: 'hr.employees', label: 'Employees', path: '/employees' }] as const,
  optionalIntegrations: [] as const,
  /** ADR-017: effective-dated facts payroll treats as inputs. None yet. */
  payrollInputs: [] as const,
  permissions: [
    { code: 'hr.employee.read', status: 'active' },
    { code: 'hr.employee.update', status: 'active' },
  ] as const,
  version: '0.1.0',
  workflows: [] as const,
} as const
