import { Code } from '@xforge/design/components/code'
import { Heading } from '@xforge/design/components/heading'
import { Link } from '@xforge/design/components/link'
import { List } from '@xforge/design/components/list'
import { ListItem } from '@xforge/design/components/list-item'
import { Shell } from '@xforge/design/components/shell'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import { notFound } from 'next/navigation'

/**
 * The development index: the routes that exist, one click from the root.
 *
 * DEVELOPMENT ONLY, and it says so on the page. A production build answers not-found here
 * exactly as it does for the gallery; a home page for the product is a product decision
 * this file does not make. What it does is stop the root being a 404 on a machine where
 * someone is building.
 *
 * The employee route is named, not linked. Its seeded id is owned by one fixture under
 * `tests/`, which the application may not import (the lint says so, and it is right: an
 * app that depends on its tests is the two-sources defect wearing a lanyard), and restating
 * the id here would be a second copy of the fact the fixture exists to hold once.
 */
export const metadata = { title: 'Xforge — development' }

const ROUTES = [
  {
    detail: 'Every authored component in every word it owns, with the dictionaries.',
    href: '/gallery',
    title: 'Gallery',
  },
] as const

export default function HomePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return (
    <Shell header={<Heading level={1}>Xforge</Heading>}>
      <Stack gap="normal">
        <Text tone="muted">Development index. The routes that exist on this machine.</Text>
        <List>
          {ROUTES.map((route) => (
            <ListItem key={route.href}>
              <Stack gap="tight">
                <Link href={route.href}>{route.title}</Link>
                <Text tone="muted">{route.detail}</Text>
              </Stack>
            </ListItem>
          ))}
          <ListItem>
            <Stack gap="tight">
              <Text>Employee</Text>
              <Text tone="muted">
                <Code>/employees/&lt;id&gt;</Code> — the seeded id is the one in{' '}
                <Code>tests/fixtures/employee.ts</Code>.
              </Text>
            </Stack>
          </ListItem>
        </List>
      </Stack>
    </Shell>
  )
}
