import type { ReactNode } from 'react'
import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * Shell — the frame a screen sits in: a docked header, a docked rail, the content inset.
 *
 * Adaptee   native `div`, `header`, `nav`, `main`
 * Intent    ADOPT
 * Owns      none (three slots: header, nav, children; no axis)
 * Contract  `header`, `nav` and `main` landmarks, each present only when it has content
 *
 * WHY A WORD AND NOT A LAYOUT FILE. Every screen wants the same three things -- something
 * docked at the top, something docked at the side, and content that does not touch the
 * viewport edge -- and the gallery was the first to show what happens without them:
 * toggles that scrolled away, an index you scrolled back to, content flush with the edge.
 * The employee screens want the same frame with a different rail. One word, two consumers.
 *
 * THE GEOMETRY IS IN THREE UTILITIES, NOT HERE. `shell-header`, `shell-nav` and
 * `grid-shell` live in the application stylesheet beside `h-control`; each reaches the
 * shell tokens (header height, expanded rail width) and carries its own sticky offset and
 * hairline, so this file selects one word per part and knows no pixel. The header and the
 * rail render only when given: a screen with neither still gets the inset, through the
 * container spacing role -- the word the space plate found nothing wearing.
 */

/** Section 3 — the Target. */
export interface ShellProps extends NativeProps<'div'> {
  /** Docked at the top: a title, the mode toggles, a toolbar. */
  readonly header?: ReactNode
  /** Docked at the side, under the header: an index, a navigation. */
  readonly nav?: ReactNode
}

/** Section 4 — the Adapter. */
export function Shell({ children, header, nav, ...props }: ShellProps) {
  return (
    <div className="flex flex-col" data-slot="shell" {...props}>
      {header ? (
        <header
          className={cn(
            'flex items-center justify-between',
            STYLE.shell.header,
            STYLE.space.container.paddingX,
            STYLE.space.normal.gap,
          )}
          data-slot="shell-header"
        >
          {header}
        </header>
      ) : null}
      <div className={cn(nav && STYLE.shell.columns)}>
        {nav ? (
          <nav className={cn(STYLE.shell.nav, STYLE.space.normal.padding)} data-slot="shell-nav">
            {nav}
          </nav>
        ) : null}
        <main className={STYLE.space.container.padding} data-slot="shell-content">
          {children}
        </main>
      </div>
    </div>
  )
}
