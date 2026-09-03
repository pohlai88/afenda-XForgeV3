import type { Meta, StoryObj } from '@storybook/react-vite'
import { Combobox } from '@xforge/design/components/combobox'

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
