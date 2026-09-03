import { Card } from '@xforge/design/components/card'
import { Grid } from '@xforge/design/components/grid'
import { Heading } from '@xforge/design/components/heading'
import { Link } from '@xforge/design/components/link'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import { notFound } from 'next/navigation'
import { ColourPlate } from './colour'
import { SPACE_SAMPLES, TYPE_SAMPLES } from './foundations'
import { MeasurePlate } from './measure'
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

/** The dictionaries come first in the index: the words, then the components that say them. */
const FOUNDATIONS = [
  { id: 'gallery-colour', title: 'Colour' },
  { id: 'gallery-type', title: 'Type' },
  { id: 'gallery-space', title: 'Space' },
] as const

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
          {FOUNDATIONS.map((f) => (
            <Link href={`#${f.id}`} key={f.id}>
              {f.title}
            </Link>
          ))}
          {GALLERY.map((group) => (
            <Link href={`#${anchorOf(group.component)}`} key={group.component}>
              {titleOf(group.component)}
            </Link>
          ))}
        </Grid>
      </nav>
      <Card aria-labelledby="gallery-colour">
        <Stack gap="normal">
          <Stack direction="row" gap="normal">
            <Heading id="gallery-colour" level={2}>
              Colour
            </Heading>
            <Link href="#gallery-top">Top</Link>
          </Stack>
          <Text tone="muted">
            Every role a swatch can show, in the active theme. Beneath each: the fill, the ink, and
            their contrast. Fills that exist only under a state are shown by the components that own
            them.
          </Text>
          <ColourPlate />
        </Stack>
      </Card>
      <Card aria-labelledby="gallery-type">
        <Stack gap="normal">
          <Stack direction="row" gap="normal">
            <Heading id="gallery-type" level={2}>
              Type
            </Heading>
            <Link href="#gallery-top">Top</Link>
          </Stack>
          <Text tone="muted">
            Every type role, through the component that wears it. Beneath each: the symbol it drew
            and its size, weight and leading as computed.
          </Text>
          <MeasurePlate columns={2} family="typography" samples={TYPE_SAMPLES} />
        </Stack>
      </Card>
      <Card aria-labelledby="gallery-space">
        <Stack gap="normal">
          <Stack direction="row" gap="normal">
            <Heading id="gallery-space" level={2}>
              Space
            </Heading>
            <Link href="#gallery-top">Top</Link>
          </Stack>
          <Text tone="muted">
            Every spacing role, through the layout that owns it. Beneath each: the symbol and the
            gap or padding in pixels, in the active density.
          </Text>
          <MeasurePlate columns={3} family="space" samples={SPACE_SAMPLES} />
        </Stack>
      </Card>
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
