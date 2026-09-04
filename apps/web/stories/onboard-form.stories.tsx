import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  type LegalEntityOption,
  OnboardForm,
  type OnboardValues,
} from '../app/employees/new/onboard-form'

/**
 * The first form in the product, in every state a write can be in.
 *
 * `OnboardForm` takes values, errors and an outcome, so the states nobody can
 * produce on demand — a duplicate employee number, a server that refused, a
 * write in flight — are the cheapest ones to look at here.
 *
 * THE STATES THAT MATTER ARE THE UNHAPPY ONES. A form is designed on the day it
 * is empty and lived in on the days it is wrong, and the two below with errors
 * are the ones worth judging: the description stays on screen beside the
 * complaint, and the invalid control now carries the error border as well as
 * the message.
 */

const entities: readonly LegalEntityOption[] = [
  { id: '22222222-2222-4222-8222-222222222222', name: 'Afenda Sdn Bhd' },
  { id: 'a51e0001-0000-4000-8000-000000000003', name: 'Afenda Services Sdn Bhd' },
  { id: '55555555-5555-4555-8555-555555555555', name: 'Afenda Holdings Pte Ltd' },
]

const empty: OnboardValues = {
  effectiveFrom: '',
  employeeNumber: '',
  fullName: '',
  jobTitle: '',
  legalEntityId: null,
  payBasis: 'monthly',
  preferredName: '',
}

const filled: OnboardValues = {
  effectiveFrom: '2026-04-01',
  employeeNumber: 'MY-0001',
  fullName: 'Siti binti Rahman',
  jobTitle: 'Payroll Manager',
  legalEntityId: '22222222-2222-4222-8222-222222222222',
  payBasis: 'monthly',
  preferredName: 'Siti',
}

const noop = () => undefined

const meta = {
  args: {
    entities,
    onChange: noop,
    onSubmit: noop,
    outcome: { status: 'idle' },
    values: empty,
  },
  component: OnboardForm,
  parameters: { layout: 'padded' },
  title: 'Screens/Onboard an employee',
} satisfies Meta<typeof OnboardForm>

export default meta
type Story = StoryObj<typeof meta>

/** Nothing typed yet. Seven fields, one screen, no wizard. */
export const Empty: Story = {}

/** Ready to submit — the identity row at 3+1, then the employment row. */
export const Filled: Story = { args: { values: filled } }

/** In flight: the control that started it says so and cannot be pressed twice. */
export const Saving: Story = { args: { outcome: { status: 'saving' }, values: filled } }

/**
 * THE CONFLICT, which is the whole reason onboarding is a command. The number
 * is taken at this employer — refused by a unique index, reported as a decision
 * to make rather than as a breakage. Warning, not danger: nothing is broken.
 */
export const NumberAlreadyTaken: Story = {
  args: {
    errors: { employeeNumber: 'MY-0001 is already in use at Afenda Sdn Bhd.' },
    outcome: {
      conflict: {
        detail: 'Choose another number, or open the existing record.',
        kind: 'stale-version',
        title: 'That employee number is already in use here',
      },
      status: 'conflict',
    },
    values: filled,
  },
}

/**
 * Several fields refused at once, with their descriptions still beside them.
 * A single `helperText` prop would have replaced each rule with its complaint
 * at the exact moment the rule was needed.
 */
export const SeveralFieldsRefused: Story = {
  args: {
    errors: {
      effectiveFrom: 'A start date is required — it decides the first period payroll sees.',
      employeeNumber: 'An employee number is required.',
      fullName: 'A full name is required.',
      legalEntityId: 'Choose the employer this person is filed under.',
    },
    outcome: {
      issue: { code: 'unavailable', retryable: true, title: 'Check the highlighted fields' },
      status: 'failed',
    },
    values: { ...empty, jobTitle: 'Payroll Manager' },
  },
}

/** The server refused for a reason no field owns. */
export const Failed: Story = {
  args: {
    outcome: {
      issue: {
        code: 'unavailable',
        detail: 'The employee could not be onboarded.',
        retryable: true,
        title: 'This could not be saved',
      },
      status: 'failed',
    },
    values: filled,
  },
}

/** Landed. The form says what happens next rather than only that it worked. */
export const Saved: Story = { args: { outcome: { status: 'saved' }, values: filled } }

/**
 * No employers on file. The Combobox is empty and says so, rather than the form
 * implying a choice exists — onboarding cannot proceed until a legal entity
 * does, because the employer decides the statutory registrations.
 */
export const NoEmployersYet: Story = { args: { entities: [] } }
