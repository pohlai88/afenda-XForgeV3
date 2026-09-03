import type { Meta, StoryObj } from '@storybook/react-vite'
import { SWATCH_ROLES, Swatch, type SwatchRole } from '@xforge/design/components/swatch'
import { Text } from '@xforge/design/components/text'

/**
 * Roles are derived from STYLE at runtime, so every colour role the system owns appears here without a list to maintain.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const ROLES = Object.keys(SWATCH_ROLES).sort() as SwatchRole[]

const meta = { component: Swatch, title: 'Design/Swatch' } satisfies Meta<typeof Swatch>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { colour: ROLES[0] as SwatchRole } }

/** Every colour role, which is also the fastest way to spot one that vanishes in dark. */
export const EveryRole: Story = {
  args: { colour: ROLES[0] as SwatchRole },
  render: () => (
    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(4, 1fr)', width: 720 }}>
      {ROLES.map((colour) => (
        <div key={colour}>
          <Swatch colour={colour} />
          <Text tone="muted" variant="label">
            {colour}
          </Text>
        </div>
      ))}
    </div>
  ),
}
