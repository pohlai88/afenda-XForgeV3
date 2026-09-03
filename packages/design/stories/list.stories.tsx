import type { Meta, StoryObj } from '@storybook/react-vite'
import { List } from '@xforge/design/components/list'
import { ListItem } from '@xforge/design/components/list-item'
import { Text } from '@xforge/design/components/text'

/**
 * The container. Its spacing between items is a token, so this is a density surface as much as a list.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const meta = { component: List, title: 'Design/List' } satisfies Meta<typeof List>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <List>
      <ListItem>
        <Text>Marlow, J. — spouse</Text>
      </ListItem>
      <ListItem>
        <Text>Okafor, A. — guardian</Text>
      </ListItem>
      <ListItem>
        <Text>Vasquez, R. — sibling</Text>
      </ListItem>
    </List>
  ),
}

export const Single: Story = {
  render: () => (
    <List>
      <ListItem>
        <Text>Marlow, J. — spouse</Text>
      </ListItem>
    </List>
  ),
}
