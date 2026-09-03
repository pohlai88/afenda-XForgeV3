import type { ReactNode } from 'react'
import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * Specimen — the frame one rendered state sits in: a caption, a stage, a footnote.
 *
 * Adaptee   native `figure`
 * Intent    ADOPT
 * Owns      none (the frame recipe; label and footer are slots, not axes)
 * Contract  `figure` with a `figcaption`: the caption names the thing framed, for
 *           everyone, not only for the eye
 *
 * A CATALOGUE WORD. The gallery showed each state under a bare label with nothing around
 * it, so a Switch and a full-width Combobox shared a card with no edge between them, and
 * the eye had to work out where one state stopped. A specimen is a figure: the caption
 * says what it is, the stage is the page ground with a hairline round it -- so the state
 * renders on the surface it will actually live on, never on a tinted swatch that flatters
 * it -- and the footnote is whatever the caller wants read beneath it, typically the words
 * the state resolved to. Development surfaces are the consumer; a product screen has no
 * reason to say this word, and none does.
 */

/** Section 3 — the Target. */
export interface SpecimenProps extends NativeProps<'figure'> {
  /** Read beneath the stage: the symbols a state drew, a note, a measurement. */
  readonly footer?: ReactNode
  /** The caption. Names the state, not the component; the group heading names that. */
  readonly label: string
  /**
   * The surface the state is judged on. The page ground unless a card is named: the muted
   * ink is measured against both, and a state judged only on the ground is judged on half
   * its surfaces.
   */
  readonly surface?: 'card' | 'page' | undefined
}

const STAGE_SURFACE = {
  card: [STYLE.surface.lowest.background, STYLE.ink.onSurface.text].join(' '),
  page: STYLE.surface.default.background,
} as const

/** Section 4 — the Adapter. */
export function Specimen({ children, footer, label, surface = 'page', ...props }: SpecimenProps) {
  return (
    <figure
      className={cn('flex flex-col', STYLE.space.none.margin, STYLE.space.tight.gap)}
      data-slot="specimen"
      {...props}
    >
      {/* A figcaption wears the caption role -- the one type role nothing else said. */}
      <figcaption
        className={cn(
          STYLE.typography.caption,
          STYLE.ink.onSurfaceVariant.text,
          STYLE.space.none.margin,
        )}
      >
        {label}
      </figcaption>
      <div
        className={cn(
          STAGE_SURFACE[surface],
          STYLE.shape.control,
          STYLE.stroke.width,
          STYLE.outline.variant.border,
          STYLE.space.normal.padding,
        )}
        data-slot="specimen-stage"
      >
        {children}
      </div>
      {footer ? (
        <div
          className={cn(STYLE.typography.bodyCompact, STYLE.ink.onSurfaceVariant.text)}
          data-slot="specimen-footer"
        >
          {footer}
        </div>
      ) : null}
    </figure>
  )
}
