import type { Meta, StoryObj } from '@storybook/react-vite'
import { DirectoryCard } from '../app/employees/employee-directory'
import type { DirectoryEntry } from '../app/employees/use-employees'

/**
 * Every state of the employee directory, on screen, with no network.
 *
 * THIS IS THE FIRST TIME AN XFORGE SCREEN HAS BEEN LOOKABLE-AT. The
 * emergency-contacts screen's header has claimed since the spine phase that it
 * was "built against MSW mocks"; the mocks are generated and have never been
 * wired into a worker, in `apps/web` or anywhere else, so nothing had rendered
 * either screen outside a test assertion. The screens were correct and unseen.
 *
 * `DirectoryCard` takes a `ResourceState` and renders it, so the states that
 * are hardest to produce on demand -- a truncated read, a permission refusal, a
 * row with no employment period -- are the cheapest ones to put on screen here.
 * That is the whole reason the connected component was split from it.
 *
 * OUTSIDE `app/`, DELIBERATELY, and for the reason the design package's stories
 * sit outside `src/`. `globals.css` sets `source("../")`, so Tailwind's
 * automatic detection scans the whole of `apps/web` and a class literal written
 * in a story would be compiled into the application's stylesheet -- a story
 * contributing to what a real screen receives. `globals.css` now carries
 * `@source not "../stories/"`, so that is structural rather than a promise.
 */

const entry = (over: Partial<DirectoryEntry> = {}): DirectoryEntry => ({
  employeeId: '11111111-1111-4111-8111-111111111111',
  employeeNumber: 'MY-0001',
  employment: {
    effectiveFrom: '2024-04-01',
    effectiveTo: null,
    jobTitle: 'Payroll Manager',
    payBasis: 'monthly',
  },
  fullName: 'Siti binti Rahman',
  legalEntityId: '22222222-2222-4222-8222-222222222222',
  legalEntityName: 'Afenda Sdn Bhd',
  personId: 'a51e0001-0000-4000-8000-000000000003',
  ...over,
})

/**
 * A group, in the ADR-009 sense: one person employed by two legal entities, and
 * a third whose employment does not cover the date being asked about.
 */
const roster: DirectoryEntry[] = [
  entry(),
  entry({
    employeeId: '44444444-4444-4444-8444-444444444444',
    employeeNumber: 'SG-0007',
    employment: {
      effectiveFrom: '2026-03-16',
      effectiveTo: null,
      jobTitle: 'Group Financial Controller',
      payBasis: 'monthly',
    },
    // The SAME person, at a second legal entity. One employee row per person
    // per entity; the shared personId is what makes them one human.
    legalEntityId: '55555555-5555-4555-8555-555555555555',
    legalEntityName: 'Afenda Holdings Pte Ltd',
  }),
  entry({
    employeeId: '66666666-6666-4666-8666-666666666666',
    employeeNumber: 'MY-0042',
    // No period covers the requested date. The row says so; it does not go blank
    // and it does not claim the person left.
    employment: null,
    fullName: 'Ahmad bin Yusof',
    personId: '77777777-7777-4777-8777-777777777777',
  }),
  entry({
    employeeId: '88888888-8888-4888-8888-888888888888',
    employeeNumber: 'MY-0113',
    employment: {
      effectiveFrom: '2025-01-06',
      effectiveTo: null,
      jobTitle: 'Site Supervisor',
      payBasis: 'daily',
    },
    fullName: 'Lim Wei Ming',
    personId: '99999999-9999-4999-8999-999999999999',
  }),
]

const meta = {
  component: DirectoryCard,
  parameters: { layout: 'padded' },
  title: 'Screens/Employee directory',
} satisfies Meta<typeof DirectoryCard>

export default meta
type Story = StoryObj<typeof meta>

/** The ordinary case: a roster read cleanly, at a date the reader can see. */
export const Ready: Story = {
  args: {
    asOf: '2026-09-04',
    onRetry: () => undefined,
    state: { data: roster, status: 'ready' },
  },
}

/**
 * The read succeeded and found nobody. An invitation, not an apology, and not
 * an error -- adding the first record is the entire point of this state.
 */
export const Empty: Story = {
  args: { asOf: '2026-09-04', onRetry: () => undefined, state: { status: 'empty' } },
}

export const Loading: Story = {
  args: { asOf: null, onRetry: () => undefined, state: { status: 'loading' } },
}

/**
 * Usable data with bounded uncertainty. The list is shown because it is real;
 * the notice is shown because it is incomplete. Neither alone would be honest,
 * which is why this is not `ready` and not `error`.
 */
export const Partial: Story = {
  args: {
    asOf: '2026-09-04',
    onRetry: () => undefined,
    state: {
      data: roster,
      reasons: [{ kind: 'truncated', limit: 200, shown: 200 }],
      status: 'partial',
    },
  },
}

/**
 * A refusal has nothing to frame: no heading, no date, no list. And no retry
 * control -- offering one for a permission failure teaches people the button is
 * decorative.
 */
export const Forbidden: Story = {
  args: {
    asOf: null,
    onRetry: () => undefined,
    state: {
      issue: {
        code: 'forbidden',
        detail: 'you do not have access to this operation',
        retryable: false,
        title: 'You do not have access to this',
      },
      status: 'forbidden',
    },
  },
}

/** Retryable, so the control appears. The pair with Forbidden is the point. */
export const ReadError: Story = {
  args: {
    asOf: null,
    onRetry: () => undefined,
    state: {
      issue: {
        code: 'unavailable',
        detail: 'The employee directory could not be reached.',
        retryable: true,
        title: 'This could not be loaded',
      },
      status: 'error',
    },
  },
}

/**
 * The row that has no employment period on the requested date, alone, because
 * it is the one worth looking at hardest: rendered as a blank cell it would be
 * indistinguishable from a failure to load a job title, and the two mean
 * opposite things.
 */
export const NoEmploymentOnThisDate: Story = {
  args: {
    asOf: '2020-01-01',
    onRetry: () => undefined,
    state: {
      data: [entry({ employment: null })],
      status: 'ready',
    },
  },
}
