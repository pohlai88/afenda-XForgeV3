/**
 * Module manifest -- architectural metadata only (architecture-final.md 4.2).
 *
 * `permissions` is what makes the permission-vocabulary guard bidirectional
 * (ADR-019): a code used but not declared here fails CI, and a code removed
 * without a tombstone fails CI too.
 */
export default {
  id: 'hr',
  version: '0.1.0',
  dependencies: [] as const,
  optionalIntegrations: [] as const,
  permissions: [
    { code: 'hr.employee.read', status: 'active' },
    { code: 'hr.employee.update', status: 'active' },
  ] as const,
  navigation: [{ id: 'hr.employees', path: '/employees', label: 'Employees' }] as const,
  entities: ['emergency_contact'] as const,
  eventsEmitted: [] as const,
  eventsConsumed: [] as const,
  workflows: [] as const,
  /** ADR-008: which country-pack contributions this module consumes. */
  countryContributions: [] as const,
  /** ADR-017: effective-dated facts payroll treats as inputs. None yet. */
  payrollInputs: [] as const,
  featureFlags: [] as const,
} as const
