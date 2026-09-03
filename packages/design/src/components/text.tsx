import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * Text — a paragraph, at one of the roles the scale actually has.
 *
 * Adaptee   native `p`
 * Intent    ADOPT
 * Owns      variant (body | emphasis | label | display),
 *           tone (default | muted | success | danger)
 * Contract  inherited from the element
 *
 * `emphasis` IS THE SECOND AXIS. Same 16px as `body`, at 500 rather than 400 --
 * the term against its value. Apple sets Headline against Body this way at an
 * identical 17pt, and Material 3 ships an Emphasized variant of every role;
 * neither reaches for another size, and a dense grid loses more to a fifth step
 * than it gains.
 *
 * `tone` is SEMANTIC AND SEPARATE from prominence. Muted is "still true, less
 * urgent" -- a hint under a field, a secondary line in a row. It is never used
 * to make something look less important that a reader still has to act on.
 *
 * `display` AND THE TWO TREND TONES ARRIVED WITH A CONSUMER, 2026-09-03. The
 * MetricRow composition (ADR-031, step 5) had to set a headline figure at
 * `emphasis` and a delta in `muted`, and recorded both as gaps rather than
 * inventing a word (Decision 4). The owner asked for them; the kernel admitted a
 * `display` role one step above `title` and declared the success and error inks
 * readable on the page and the card, and this recipe names what the kernel
 * projects. Nothing here decides a colour or a size.
 *
 * A TREND TONE NAMES MEANING, NOT DIRECTION. Fewer overtime hours is `success`
 * with a minus sign in front of it; the screen decides which way is good. And it
 * never carries the meaning alone (constitution rule 7): the delta it colours is
 * words with a sign, and the composition test reads that back.
 *
 * THE PROP IS `variant`, AND IT USED TO BE `role`. The type policy calls these
 * ROLES and that word is right in the policy -- but on a component it shadowed
 * the global ARIA attribute of the same name, and the three values it takes are
 * not valid ARIA roles. So `<Text role="label">` read to a linter, and to anyone
 * skimming the JSX, as an invalid `role` on a paragraph. It needed a four-line
 * comment in the gallery to explain that it was not.
 *
 * `variant` is what `Button` and `Badge` already expose for the same question --
 * which of a fixed set of appearances -- so the rename removes the collision and
 * closes a naming inconsistency at once. Nothing is lost: `role` was never
 * carrying the policy's meaning to the DOM, only to a lookup table.
 */
const textVariants = cva('m-0', {
  defaultVariants: {
    tone: 'default',
    variant: 'body',
  },
  variants: {
    tone: {
      danger: 'text-error-foreground',
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      success: 'text-success-foreground',
    },
    variant: {
      body: 'font-body text-body',
      display: 'font-heading text-display',
      emphasis: 'font-emphasis text-emphasis',
      label: 'font-label text-body-compact',
    },
  },
})

export function Text({
  children,
  className,
  tone,
  variant,
  ...props
}: ComponentProps<'p'> & VariantProps<typeof textVariants>) {
  return (
    <p className={cn(textVariants({ tone, variant }), className)} data-slot="text" {...props}>
      {children}
    </p>
  )
}
