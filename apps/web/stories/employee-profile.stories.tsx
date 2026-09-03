import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  EmployeeProfile,
  type ProfileEmployment,
} from '../app/employees/[employeeId]/employee-profile'

/**
 * The employee record, in the states an effective-dated system actually
 * produces — including the three the directory deliberately refuses to name.
 */

const employee = {
  employeeNumber: 'MY-0001',
  fullName: 'Siti binti Rahman',
  legalEntity: {
    countryCode: 'MY',
    name: 'Afenda Sdn Bhd',
    registrationNumber: '201901234567 (1234567-A)',
    timeZone: 'Asia/Kuala_Lumpur',
  },
  preferredName: 'Siti',
}

const period = (over: Partial<ProfileEmployment> = {}): ProfileEmployment => ({
  effectiveFrom: '2024-04-01',
  effectiveTo: '2025-04-01',
  id: 'p1',
  jobTitle: 'Payroll Executive',
  payBasis: 'monthly',
  recordedAt: '2024-03-20T04:00:00.000Z',
  ...over,
})

const meta = {
  component: EmployeeProfile,
  parameters: { layout: 'padded' },
  title: 'Screens/Employee record',
} satisfies Meta<typeof EmployeeProfile>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A promotion: two adjacent periods, the second open-ended. The end of one is
 * the start of the next because the ranges are half-open — there is no gap and
 * no overlapping day, which is the property the database enforces.
 */
export const Default: Story = {
  args: {
    asOf: '2026-09-04',
    employee,
    employments: [
      period(),
      period({
        effectiveFrom: '2025-04-01',
        effectiveTo: null,
        id: 'p2',
        jobTitle: 'Payroll Manager',
        recordedAt: '2025-03-14T04:00:00.000Z',
      }),
    ],
  },
}

/**
 * A raise effective the 1st, keyed in on the 20th. This is ADR-016's worked
 * case and the reason `recorded_at` exists as a column: a payroll calculated on
 * the 15th does not contain this period, and nothing else on any screen would
 * say so.
 */
export const RecordedLate: Story = {
  args: {
    asOf: '2026-09-04',
    employee,
    employments: [
      period(),
      period({
        effectiveFrom: '2025-04-01',
        effectiveTo: null,
        id: 'p2',
        jobTitle: 'Payroll Manager',
        recordedAt: '2025-04-20T04:00:00.000Z',
      }),
    ],
  },
}

/**
 * A same-day joiner-leaver: `[2026-03-03, 2026-03-04)`. One day of employment,
 * and the half-open convention is what makes it representable at all — a
 * closed-closed range would either be empty or two days long.
 */
export const SameDayJoinerLeaver: Story = {
  args: {
    asOf: '2026-09-04',
    // preferredName reset too: spreading `employee` and changing only the name
    // left this person 'Known as Siti', which the rendered text caught.
    employee: {
      ...employee,
      employeeNumber: 'MY-0311',
      fullName: 'Nurul Aina binti Hassan',
      preferredName: null,
    },
    employments: [
      period({
        effectiveFrom: '2026-03-03',
        effectiveTo: '2026-03-04',
        jobTitle: 'Warehouse Assistant',
        payBasis: 'daily',
        recordedAt: '2026-03-03T01:00:00.000Z',
      }),
    ],
  },
}

/**
 * Employed, with nothing recorded. The row exists at the employer and payroll
 * has nothing to operate on — a state that renders as a blank table in most
 * products and is the reason someone is not paid.
 */
export const NoPeriodsRecorded: Story = {
  args: { asOf: '2026-09-04', employee, employments: [] },
}

/**
 * A leaver, read at a date after they left. The directory shows this person
 * with no employment and refuses to say why; this screen shows the period that
 * ended, and a person reads the answer off it.
 */
export const Leaver: Story = {
  args: {
    asOf: '2026-09-04',
    employee: {
      ...employee,
      employeeNumber: 'MY-0042',
      fullName: 'Ahmad bin Yusof',
      preferredName: null,
    },
    employments: [
      period({
        effectiveFrom: '2023-01-09',
        effectiveTo: '2026-06-30',
        jobTitle: 'Field Technician',
        recordedAt: '2022-12-15T04:00:00.000Z',
      }),
    ],
  },
}

/** An entity with no registration number on file — stated, never left blank. */
export const NoRegistrationNumber: Story = {
  args: {
    asOf: '2026-09-04',
    employee: {
      ...employee,
      legalEntity: { ...employee.legalEntity, registrationNumber: null },
    },
    employments: [period({ effectiveTo: null })],
  },
}
