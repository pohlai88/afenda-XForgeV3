import type { Metric } from '../metric-row'
import type { BackdatedChange, EntityHeadcount } from './dashboard-view'

/**
 * Representative data for the dashboard, in ONE place.
 *
 * WHY THIS EXISTS AND WHAT IT IS NOT. The three panels need aggregates that no
 * operation returns yet — headcount per legal entity, joiners and leavers in a
 * window, and employment rows whose `recorded_at` is later than their
 * `effective_from`. Those are contracts still to be authored, and the screen is
 * being built first on purpose (law 2).
 *
 * It is shared by the route and by the stories deliberately. Two sets of sample
 * data is the second-source defect in its most tempting form: they agree while
 * one person maintains both, and the story stops showing what the screen shows
 * on the day one of them is edited.
 *
 * The route that renders this is DEVELOPMENT ONLY and says on the page that the
 * figures are not real. A dashboard of invented numbers with nothing marking
 * them as invented is worse than no dashboard.
 *
 * The shape is drawn from ADR-009's own worked example: a Malaysian group with
 * a Singapore entity, and one person employed by two of them at once.
 */

export const SAMPLE_AS_OF = '2026-09-04'

export const SAMPLE_METRICS: readonly Metric[] = [
  {
    baseline: 'than last month',
    delta: { text: '+6', trend: 'success' },
    label: 'On the books',
    value: '128',
  },
  { baseline: 'starting this month', label: 'Joining', value: '9' },
  {
    baseline: 'leaving this month',
    delta: { text: '+2', trend: 'danger' },
    label: 'Leaving',
    value: '4',
  },
  // No delta: a count that should be zero has no meaningful "than last month".
  { baseline: 'employees with no period on file today', label: 'Unassigned', value: '3' },
]

export const SAMPLE_ENTITIES: readonly EntityHeadcount[] = [
  {
    countryCode: 'MY',
    employees: 86,
    legalEntityId: '22222222-2222-4222-8222-222222222222',
    name: 'Afenda Sdn Bhd',
    timeZone: 'Asia/Kuala_Lumpur',
  },
  {
    countryCode: 'MY',
    employees: 31,
    legalEntityId: 'a51e0001-0000-4000-8000-000000000003',
    name: 'Afenda Services Sdn Bhd',
    timeZone: 'Asia/Kuala_Lumpur',
  },
  {
    // The entity that makes a tenant-level timezone wrong: same group, same
    // instant, and on some days a different civil date.
    countryCode: 'SG',
    employees: 11,
    legalEntityId: '55555555-5555-4555-8555-555555555555',
    name: 'Afenda Holdings Pte Ltd',
    timeZone: 'Asia/Singapore',
  },
]

export const SAMPLE_BACKDATED: readonly BackdatedChange[] = [
  {
    // ADR-016's worked case: effective the 1st, keyed in on the 20th.
    effectiveFrom: '2026-08-01',
    employeeId: '11111111-1111-4111-8111-111111111111',
    fullName: 'Siti binti Rahman',
    jobTitle: 'Payroll Manager',
    legalEntityName: 'Afenda Sdn Bhd',
    recordedAt: '2026-08-20T09:14:00.000Z',
  },
  {
    // ADR-009's mid-month transfer, recorded three weeks late: the half of the
    // month at the new entity was paid by the old one.
    effectiveFrom: '2026-08-16',
    employeeId: '44444444-4444-4444-8444-444444444444',
    fullName: 'Siti binti Rahman',
    jobTitle: 'Group Financial Controller',
    legalEntityName: 'Afenda Holdings Pte Ltd',
    recordedAt: '2026-09-02T02:31:00.000Z',
  },
  {
    effectiveFrom: '2026-09-03',
    employeeId: '88888888-8888-4888-8888-888888888888',
    fullName: 'Lim Wei Ming',
    jobTitle: 'Site Supervisor',
    legalEntityName: 'Afenda Services Sdn Bhd',
    recordedAt: '2026-09-04T01:05:00.000Z',
  },
]
