import type { Meta, StoryObj } from '@storybook/react-vite'
import { Combobox } from '@xforge/design/components/combobox'
import { Field } from '@xforge/design/components/field'

/**
 * The one component here with a popup: worth opening in every theme, since the surface and the highlight are separate roles.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const RELATIONSHIPS = [
  { label: 'Spouse', value: 'spouse' },
  { label: 'Parent', value: 'parent' },
  { label: 'Sibling', value: 'sibling' },
  { label: 'Child', value: 'child' },
  { label: 'Guardian', value: 'guardian' },
]

const meta = {
  args: { options: RELATIONSHIPS, placeholder: 'Select a relationship' },
  component: Combobox,
  title: 'Design/Combobox',
} satisfies Meta<typeof Combobox>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: 280 }}>
      <Combobox {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <div style={{ width: 280 }}>
      <Combobox {...args} />
    </div>
  ),
}

export const Empty: Story = {
  args: { emptyMessage: 'No relationships match', options: [] },
  render: (args) => (
    <div style={{ width: 280 }}>
      <Combobox {...args} />
    </div>
  ),
}

/**
 * Refused, inside a Field. The Combobox registers with the Field exactly as a
 * plain input does, so it already carried `data-invalid` and `aria-invalid`
 * before it carried the border -- told to a screen reader and invisible to a
 * sighted one, until the onboarding form counted four invalid fields against
 * three error borders and named this as the fourth.
 */
export const Invalid: Story = {
  args: { options: [] },
  render: () => (
    <Field
      description="Decides the statutory registrations and the payroll calendar."
      error="Choose the employer this person is filed under."
      label="Employer"
    >
      <Combobox
        options={[
          { label: 'Afenda Sdn Bhd', value: 'my-1' },
          { label: 'Afenda Holdings Pte Ltd', value: 'sg-1' },
        ]}
        placeholder="Select an employer"
      />
    </Field>
  ),
}
