import type { Meta, StoryObj } from '@storybook/react-vite'
import { ResourceBoundary } from '@xforge/design/components/resource-boundary'
import { Text } from '@xforge/design/components/text'

/**
 * The failure path, which is the only reason this component exists and the one no screenshot of a happy path shows.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const meta = {
  component: ResourceBoundary,
  title: 'Design/ResourceBoundary',
} satisfies Meta<typeof ResourceBoundary>

export default meta
type Story = StoryObj<typeof meta>

function Throws(): never {
  throw new Error('the contact list could not be read')
}

export const Holding: Story = {
  render: () => (
    <ResourceBoundary>
      <Text>Three contacts on file.</Text>
    </ResourceBoundary>
  ),
}

/**
 * The child throws on render. React logs the caught error to the console here -- that is
 * the boundary reporting rather than swallowing, and it is expected in this story.
 */
export const Failed: Story = {
  render: () => (
    <ResourceBoundary>
      <Throws />
    </ResourceBoundary>
  ),
}
