import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field } from '@xforge/design/components/field'
import { Stack } from '@xforge/design/components/stack'
import { TextInput } from '@xforge/design/components/text-input'

/**
 * Every state a text field is in, and the four types it admits.
 *
 * Shown BARE here rather than inside a Field, because what is on trial is the
 * control's own recipe: the fill, the 3:1 stroke, the control height that is the
 * WCAG 2.5.8 target floor, and the placeholder ink. Field has its own file and
 * proves the wiring.
 *
 * A bare input needs `aria-label` to be legal on its own; that it needs one is
 * the argument for Field existing at all.
 */

const meta = {
  args: { 'aria-label': 'Job title' },
  component: TextInput,
  title: 'Design/TextInput',
} satisfies Meta<typeof TextInput>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { 'aria-label': 'Job title', placeholder: 'Payroll Manager' },
}

/** Empty with a placeholder, and filled. The placeholder is a hint, never a label. */
export const EmptyAndFilled: Story = {
  args: { 'aria-label': 'Job title' },
  render: () => (
    <Stack gap="normal">
      <TextInput aria-label="Job title, empty" placeholder="Payroll Manager" />
      <TextInput aria-label="Job title, filled" defaultValue="Payroll Manager" />
    </Stack>
  ),
}

export const Disabled: Story = {
  args: { 'aria-label': 'Job title', defaultValue: 'Payroll Manager', disabled: true },
}

/** readOnly is not disabled: reachable and copyable, just not editable here. */
export const ReadOnly: Story = {
  args: { 'aria-label': 'Employee number', defaultValue: 'MY-0001', readOnly: true },
}

/**
 * The four adopted types. They differ in the keyboard a phone offers and the
 * validation the platform performs, and in nothing else — which is why they are
 * a closed prop rather than an axis with a recipe each.
 */
export const EveryType: Story = {
  args: { 'aria-label': 'Types' },
  render: () => (
    <Stack gap="normal">
      <Field label="Job title">
        <TextInput placeholder="Payroll Manager" type="text" />
      </Field>
      <Field label="Work email">
        <TextInput autoComplete="email" placeholder="siti@afenda.my" type="email" />
      </Field>
      <Field label="Mobile">
        <TextInput autoComplete="tel" placeholder="+60 12-345 6789" type="tel" />
      </Field>
      <Field label="Company website">
        <TextInput placeholder="https://afenda.my" type="url" />
      </Field>
    </Stack>
  ),
}
