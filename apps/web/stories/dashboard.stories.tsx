import type { Meta, StoryObj } from '@storybook/react-vite'
import { DashboardView } from '../app/dashboard/dashboard-view'
import {
  SAMPLE_AS_OF,
  SAMPLE_BACKDATED,
  SAMPLE_ENTITIES,
  SAMPLE_METRICS,
} from '../app/dashboard/sample'

/**
 * The people dashboard, in the states that actually occur.
 *
 * The data comes from `app/dashboard/sample.ts` — the SAME module the route
 * renders. Two sets of sample data would agree until the day somebody edited
 * one, and the story would then be showing a screen nobody ships.
 *
 * `Quiet` is the story worth looking at hardest. A dashboard is designed on the
 * day it is full, and then spends most of its life nearly empty; the three
 * panels each have an empty state and none of them is a blank rectangle.
 */

const meta = {
  component: DashboardView,
  parameters: { layout: 'padded' },
  title: 'Screens/Dashboard',
} satisfies Meta<typeof DashboardView>

export default meta
type Story = StoryObj<typeof meta>

/** A Malaysian group with a Singapore entity, and three changes entered late. */
export const Default: Story = {
  args: {
    asOf: SAMPLE_AS_OF,
    backdated: SAMPLE_BACKDATED,
    entities: SAMPLE_ENTITIES,
    metrics: SAMPLE_METRICS,
  },
}

/**
 * Nothing recorded late, which is the state the third panel is trying to
 * produce. It says so in words rather than disappearing — a panel that vanishes
 * when it is satisfied cannot be distinguished from a panel that is broken.
 */
export const NothingRecordedLate: Story = {
  args: {
    asOf: SAMPLE_AS_OF,
    backdated: [],
    entities: SAMPLE_ENTITIES,
    metrics: SAMPLE_METRICS,
  },
}

/** A single-entity tenant: most customers, and the layout must not look sparse. */
export const OneLegalEntity: Story = {
  args: {
    asOf: SAMPLE_AS_OF,
    backdated: SAMPLE_BACKDATED.slice(0, 1),
    entities: SAMPLE_ENTITIES.slice(0, 1),
    metrics: SAMPLE_METRICS,
  },
}

/** A tenant on its first day: every panel empty, and none of them blank. */
export const Quiet: Story = {
  args: {
    asOf: SAMPLE_AS_OF,
    backdated: [],
    entities: [],
    metrics: [
      { baseline: 'nobody on the books yet', label: 'On the books', value: '0' },
      { baseline: 'starting this month', label: 'Joining', value: '0' },
      { baseline: 'leaving this month', label: 'Leaving', value: '0' },
      { baseline: 'employees with no period on file today', label: 'Unassigned', value: '0' },
    ],
  },
}
