import type { Meta, StoryObj } from '@storybook/react-vite'
import { DateInput } from '@xforge/design/components/date-input'
import { Field } from '@xforge/design/components/field'
import { Stack } from '@xforge/design/components/stack'

/**
 * A business date, in the states an effective-dated system produces.
 *
 * The control displays in the reader's locale and its value is always
 * `YYYY-MM-DD`. That split is the platform's, and adopting it is most of why
 * this component is nine lines rather than a picker.
 *
 * THERE IS NO "TODAY" STORY, deliberately. The component cannot know which day
 * that is: a civil date derives from the owning legal entity's IANA zone
 * (law 21), so a control that defaulted to the browser's date would be wrong for
 * every user outside the entity's zone on exactly the days it matters.
 */

const meta = {
  args: { 'aria-label': 'Effective from' },
  component: DateInput,
  title: 'Design/DateInput',
} satisfies Meta<typeof DateInput>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { 'aria-label': 'Effective from', defaultValue: '2026-03-16' },
}

export const EmptyAndFilled: Story = {
  args: { 'aria-label': 'Effective from' },
  render: () => (
    <Stack gap="normal">
      <DateInput aria-label="Effective from, empty" />
      <DateInput aria-label="Effective from, filled" defaultValue="2026-03-16" />
    </Stack>
  ),
}

export const Disabled: Story = {
  args: { 'aria-label': 'Effective from', defaultValue: '2024-04-01', disabled: true },
}

/**
 * A HALF-OPEN PERIOD, which is the reason `min` is adopted: the end of a period
 * may not precede its start, and the platform enforces that without a validation
 * library. ADR-016's convention means a same-day joiner-leaver is
 * [2026-03-03, 2026-03-04) — the end is the day AFTER the last day worked.
 */
export const APeriod: Story = {
  args: { 'aria-label': 'Period' },
  render: () => (
    <Stack direction="row" gap="normal">
      <Field description="The first day of the period." label="Effective from">
        <DateInput defaultValue="2026-03-03" />
      </Field>
      <Field description="Exclusive: the day after the last day worked." label="Effective to">
        <DateInput defaultValue="2026-03-04" min="2026-03-03" />
      </Field>
    </Stack>
  ),
}

/** Rejected by the server, not by the platform: an overlap it alone can see. */
export const Invalid: Story = {
  args: { 'aria-label': 'Effective from' },
  render: () => (
    <Field
      description="The first day of the period."
      error="This overlaps an existing period at Afenda Sdn Bhd (2024-04-01 to 2025-04-01)."
      label="Effective from"
    >
      <DateInput defaultValue="2024-06-01" />
    </Field>
  ),
}
