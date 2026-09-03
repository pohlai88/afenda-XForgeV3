import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * Link — an anchor in the language.
 *
 * Adaptee   native `a`
 * Intent    ADOPT
 * Owns      current (boolean): the destination is where the reader already is
 * Contract  `a[href]`; `current` renders `aria-current="page"`
 *
 * UNDERLINED AT REST. A link told apart from prose by colour alone fails the reader who
 * cannot see the colour (constitution rule 7), so the underline is the affordance and the
 * ink stays the page's. The one focus ring, as everywhere.
 *
 * CURRENT IS A WEIGHT, NOT A COLOUR, for the same reason: the emphasis role at body size.
 * Hover changes nothing yet; no screen has asked for a hover treatment on a link, and an
 * underline that is already there has nothing to reveal.
 *
 * `href` is required. An anchor without a destination is a button in disguise, and the
 * language has a Button.
 */

/** Section 3 — the Target. */
export interface LinkProps extends NativeProps<'a'> {
  readonly current?: boolean
  readonly href: string
}

/** Section 4 — the Adapter. */
export function Link({ children, current = false, ...props }: LinkProps) {
  return (
    <a
      aria-current={current ? 'page' : undefined}
      className={cn(
        'underline outline-none',
        STYLE.ink.default.text,
        STYLE.focus.ring,
        current && STYLE.typography.emphasis,
      )}
      data-slot="link"
      {...props}
    >
      {children}
    </a>
  )
}
