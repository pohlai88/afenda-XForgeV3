import type { Meta, StoryObj } from '@storybook/react-vite'
import { BUTTON_VARIANT, Button } from '@xforge/design/components/button'

/**
 * DERIVED FROM THE CONTRACT, NOT FROM A LIST.
 *
 * `BUTTON_VARIANT` is the component's own axis table -- Section 1 of the ADR-031 adapter
 * schema, exported beside the component because it IS the contract. Every option below
 * reads from it, so a variant added to `button.tsx` appears here with no edit to this
 * file, and a variant removed disappears.
 *
 * That is what makes this a second READER rather than a second SOURCE. The gallery's
 * `specimens.tsx` hand-lists its states; if that list and this file both enumerated
 * variants by hand they would agree until they stopped, which is the defect this
 * repository is organised against. Both surfaces now read the same table.
 */

const VARIANTS = Object.keys(BUTTON_VARIANT) as (keyof typeof BUTTON_VARIANT)[]

const meta = {
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
  },
  component: Button,
  title: 'Design/Button',
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

/** Args-driven: the state space explored without editing a specimen file. */
export const Playground: Story = {
  args: { children: 'Save changes', variant: 'primary' },
}

/**
 * Every variant the table declares, side by side. The gallery frames these too; the point
 * of rendering them again here is that this path does not go through the gallery page, so
 * a state `specimens.tsx` omits is still visible in this one.
 */
export const EveryVariant: Story = {
  args: { children: 'Save changes' },
  render: (args) => (
    <div style={{ display: 'flex', gap: 12 }}>
      {VARIANTS.map((variant) => (
        <Button {...args} key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
}

/** Disabled is a state the recipe styles and no axis names, so it is framed explicitly. */
export const Disabled: Story = {
  args: { children: 'Save changes', disabled: true },
}
