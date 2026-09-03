import { Card } from '@xforge/design/components/card'
import { Heading } from '@xforge/design/components/heading'
import { Link } from '@xforge/design/components/link'
import { Shell } from '@xforge/design/components/shell'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
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
 * link, a shell -- the word was added to the language, not to this file.
 */
export const metadata = { title: 'Gallery — Xforge' }

/** `empty-state` reads as "Empty state": the file name is the id, the title is for people. */
export const titleOf = (component: string): string =>
  component.charAt(0).toUpperCase() + component.slice(1).replace(/-/g, ' ')

const anchorOf = (component: string): string => `gallery-${component}`

/** The dictionaries come first in the rail: the words, then the components that say them. */
const FOUNDATIONS = [
  { id: 'gallery-colour', title: 'Colour' },
  { id: 'gallery-type', title: 'Type' },
  { id: 'gallery-space', title: 'Space' },
] as const

/** One card: its heading carries the id the rail points at, and the way back to the top. */
function Section({
  children,
  id,
  intro,
  title,
}: {
  readonly children: ReactNode
  readonly id: string
  readonly intro?: string
  readonly title: string
}) {
  return (
    <Card aria-labelledby={id}>
      <Stack gap="normal">
        <Stack direction="row" gap="normal">
          <Heading id={id} level={2}>
            {title}
          </Heading>
          <Link href="#gallery-top">Top</Link>
        </Stack>
        {intro ? <Text tone="muted">{intro}</Text> : null}
        {children}
      </Stack>
    </Card>
  )
}

export default function GalleryPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return (
    <Shell
      header={
        <Stack direction="row" gap="loose">
          <Heading id="gallery-top" level={1}>
            Gallery
          </Heading>
          <Modes />
        </Stack>
      }
      nav={
        <Stack gap="tight">
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
        </Stack>
      }
    >
      <Stack gap="loose">
        <Text tone="muted">
          Every authored component, in every word it owns, against the stylesheet the application
          builds. Each group prints its recipe once; beneath each frame, only the words that state
          adds. Development only.
        </Text>
        <Section
          id="gallery-colour"
          intro="Every role a swatch can show, in the active theme. Beneath each: the fill, the ink, and their contrast. Fills that exist only under a state are shown by the components that own them."
          title="Colour"
        >
          <ColourPlate />
        </Section>
        <Section
          id="gallery-type"
          intro="Every type role, through the component that wears it. Beneath each: the symbol it drew and its size, weight and leading as computed."
          title="Type"
        >
          <MeasurePlate columns={2} family="typography" samples={TYPE_SAMPLES} />
        </Section>
        <Section
          id="gallery-space"
          intro="Every spacing role, through the layout that owns it. Beneath each: the symbol and the gap or padding in pixels, in the active density."
          title="Space"
        >
          <MeasurePlate columns={3} family="space" samples={SPACE_SAMPLES} />
        </Section>
        {GALLERY.map((group) => (
          <Section
            id={anchorOf(group.component)}
            key={group.component}
            title={titleOf(group.component)}
          >
            <Plates columns={group.columns} states={group.states} />
          </Section>
        ))}
      </Stack>
    </Shell>
  )
}
