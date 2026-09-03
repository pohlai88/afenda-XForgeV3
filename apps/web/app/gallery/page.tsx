import { Card } from '@xforge/design/components/card'
import { Grid } from '@xforge/design/components/grid'
import { Heading } from '@xforge/design/components/heading'
import { Link } from '@xforge/design/components/link'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import { notFound } from 'next/navigation'
import { Modes } from './modes'
import { Plates } from './plates'
import { GALLERY } from './specimens'

/**
 * The gallery: every authored component, in every word it owns, rendered by the
 * application against the stylesheet the application builds.
 *
 * WHY IT EXISTS. Every other check here is structural. A class can be selected,
 * type-checked, compiled and committed without anyone having seen it -- and on
 * 2026-09-03 the employee page shipped with no page ground, black ink and a button with
 * no padding while every test was green. A component is looked at here before it is
 * wired into a page, because here a mistake is cheap.
 *
 * DEVELOPMENT ONLY. A production build answers 404, the same way an unrouted URL does;
 * the page is unlinked, carries no tenant and reads nothing.
 *
 * It composes the design package and nothing else, and writes no class: the
 * components' props do not admit one, which is Decision 12 of ADR-031 as a type rather
 * than a rule. When the gallery needed a word the language lacked -- a grid, a frame, a
 * link -- the word was added to the language, not to this file.
 */
export const metadata = { title: 'Gallery — Xforge' }

/** `empty-state` reads as "Empty state": the file name is the id, the title is for people. */
export const titleOf = (component: string): string =>
  component.charAt(0).toUpperCase() + component.slice(1).replace(/-/g, ' ')

const anchorOf = (component: string): string => `gallery-${component}`

export default function GalleryPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return (
    <Stack gap="loose">
      <Stack gap="tight">
        <Heading id="gallery-top" level={1}>
          Gallery
        </Heading>
        <Text tone="muted">
          Every authored component, in every word it owns, against the stylesheet the application
          builds. Each group prints its recipe once; beneath each frame, only the words that state
          adds. Development only.
        </Text>
      </Stack>
      <Modes />
      <nav aria-label="Index">
        <Grid columns={4} gap="tight">
          {GALLERY.map((group) => (
            <Link href={`#${anchorOf(group.component)}`} key={group.component}>
              {titleOf(group.component)}
            </Link>
          ))}
        </Grid>
      </nav>
      {GALLERY.map((group) => (
        <Card aria-labelledby={anchorOf(group.component)} key={group.component}>
          <Stack gap="normal">
            <Stack direction="row" gap="normal">
              <Heading id={anchorOf(group.component)} level={2}>
                {titleOf(group.component)}
              </Heading>
              <Link href="#gallery-top">Top</Link>
            </Stack>
            <Plates columns={group.columns} states={group.states} />
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}
