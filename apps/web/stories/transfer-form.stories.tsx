import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  TransferForm,
  type TransferSubject,
  type TransferValues,
} from '../app/employees/[employeeId]/transfer/transfer-form'
import type { LegalEntityOption } from '../app/employees/new/onboard-form'

/**
 * ADR-009's worked case, on screen: Siti moves from Sdn Bhd A to the group's
 * Singapore entity on 16 March.
 *
 * `MidMonth` is the story to look at hardest. It is the case the whole
 * three-level model exists for, and the boundary notice is the screen's only
 * real job — translating `[.., 2026-03-16)` and `[2026-03-16, ..)` into "pays up
 * to and including the 15th" and "pays from the 16th", which is how a payroll
 * administrator actually thinks.
 */

const entities: readonly LegalEntityOption[] = [
  { id: '22222222-2222-4222-8222-222222222222', name: 'Afenda Sdn Bhd' },
  { id: 'a51e0001-0000-4000-8000-000000000003', name: 'Afenda Services Sdn Bhd' },
  { id: '55555555-5555-4555-8555-555555555555', name: 'Afenda Holdings Pte Ltd' },
]

const subject: TransferSubject = {
  currentJobTitle: 'Payroll Manager',
  fromLegalEntityId: '22222222-2222-4222-8222-222222222222',
  fromLegalEntityName: 'Afenda Sdn Bhd',
  fullName: 'Siti binti Rahman',
}

const empty: TransferValues = {
  effectiveFrom: '',
  employeeNumber: '',
  jobTitle: '',
  payBasis: 'monthly',
  toLegalEntityId: null,
}

const filled: TransferValues = {
  effectiveFrom: '2026-03-16',
  employeeNumber: 'SG-0007',
  jobTitle: 'Group Financial Controller',
  payBasis: 'monthly',
  toLegalEntityId: '55555555-5555-4555-8555-555555555555',
}

const noop = () => undefined

const meta = {
  args: {
    entities,
    onChange: noop,
    onSubmit: noop,
    outcome: { status: 'idle' },
    subject,
    values: empty,
  },
  component: TransferForm,
  parameters: { layout: 'padded' },
  title: 'Screens/Transfer an employee',
} satisfies Meta<typeof TransferForm>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Nothing chosen. NO BOUNDARY NOTICE: without a date there is no boundary to
 * describe, and a placeholder would be inventing one.
 */
export const Empty: Story = {}

/**
 * THE CASE THE MODEL EXISTS FOR. 16 March: Sdn Bhd A pays to the 15th, the
 * Singapore entity from the 16th, that month runs twice and the year ends in
 * two EA forms — all said before the button is pressed, not after.
 */
export const MidMonth: Story = { args: { values: filled } }

/**
 * The first of a month, where the off-by-one is easiest to get wrong: transfer
 * on 1 April and the old employer's last day is 31 MARCH, not 1 April and not
 * 30 March. The screen does that arithmetic once, visibly.
 */
export const OnTheFirst: Story = {
  args: { values: { ...filled, effectiveFrom: '2026-04-01' } },
}

export const Transferring: Story = {
  args: { outcome: { status: 'saving' }, values: filled },
}

/**
 * Nothing to transfer FROM. No employment period covers that date — they have
 * already left, or have not started — so opening one at the destination would
 * invent employment that never began anywhere.
 */
export const NothingToTransfer: Story = {
  args: {
    errors: { effectiveFrom: 'No employment period covers 2026-03-16.' },
    outcome: {
      conflict: {
        detail: 'Choose a date inside an employment period, or onboard them instead.',
        kind: 'stale-version',
        title: 'Nothing to transfer on that date',
      },
      status: 'conflict',
    },
    values: filled,
  },
}

/** The same human already has a record at the destination. */
export const AlreadyEmployedThere: Story = {
  args: {
    errors: { toLegalEntityId: 'Siti binti Rahman already has a record at this employer.' },
    outcome: {
      conflict: {
        detail: 'Open that record instead, or choose another employer.',
        kind: 'stale-version',
        title: 'Already employed there',
      },
      status: 'conflict',
    },
    values: filled,
  },
}

/** The number is taken by somebody else at the destination. */
export const NumberTakenAtDestination: Story = {
  args: {
    errors: { employeeNumber: 'SG-0007 is already in use at Afenda Holdings Pte Ltd.' },
    outcome: {
      conflict: {
        detail: 'Choose another number.',
        kind: 'stale-version',
        title: 'That employee number is already in use there',
      },
      status: 'conflict',
    },
    values: filled,
  },
}

/** Landed. */
export const Transferred: Story = {
  args: { outcome: { status: 'saved' }, values: filled },
}

/**
 * A single-entity tenant. There is nowhere to transfer TO, and the destination
 * list is empty rather than offering the employer they are already at — the
 * server refuses that with a 422, but a person should never have been able to
 * pick it.
 */
export const NowhereToGo: Story = {
  args: { entities: [entities[0] as LegalEntityOption] },
}
