import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * Status — work in progress, announced rather than only drawn.
 *
 * Adaptee   native `p`
 * Intent    ADOPT
 * Owns      none
 * Contract  live-region: `role="status"`, `aria-live="polite"`, `aria-busy` — owned here
 *
 * `aria-live="polite"` IS THE COMPONENT. A spinner is invisible to a screen
 * reader, so a page that is loading and a page that is empty are the same page
 * unless something says so — and it must be polite, because interrupting
 * someone to tell them to wait is worse than the wait.
 *
 * `aria-busy` marks the region as not-yet-settled, which is what stops assistive
 * technology reading a half-built subtree as if it were the answer.
 */
/**
 * The three live-region attributes are the contract this component owns, so they are
 * not props: a caller's `role="alert"` or `aria-live="assertive"` would otherwise win
 * through the spread (rendered to check) and turn a polite wait into an interruption.
 */
export type StatusProps = Omit<ComponentProps<'p'>, 'aria-busy' | 'aria-live' | 'role'>

export function Status({ children, className, ...props }: StatusProps) {
  return (
    <p
      aria-busy="true"
      aria-live="polite"
      className={cn('m-0 text-body text-muted-foreground', className)}
      data-slot="status"
      /**
       * THE ROLE, WHICH WAS MISSING. `aria-live="polite"` alone does announce,
       * so this was not silent -- but the end-to-end conformance specs assert
       * the ROLE, and nothing rendered one; only a browser could say so.
       *
       * `role="status"` implies `aria-live="polite"`; the attribute stays
       * because `aria-busy` has to sit on the live region either way, and the
       * two read as one declaration rather than as a role with a silent
       * implication.
       */
      role="status"
      {...props}
    >
      {children}
    </p>
  )
}
