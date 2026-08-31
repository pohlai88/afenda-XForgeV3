/**
 * The system primitives.
 *
 * Business screens compose these and nothing else. They take no `className` and
 * no `style`, which is not a stylistic preference: a prop that accepts arbitrary
 * CSS is an escape hatch, and an escape hatch is where the design system stops
 * being the authority. The `no-bespoke-styling` guard enforces the other half by
 * failing a business screen that writes either attribute directly.
 *
 * Variants are DATA ATTRIBUTES rather than class strings, so the stylesheet
 * selects on `[data-tone='danger']` and a screen cannot compose a variant that
 * does not exist -- the union type is the whole vocabulary.
 *
 * Behaviour, not just appearance: `Button` defaults to `type="button"` because
 * a bare `<button>` inside a form submits it, which is a bug nobody writes on
 * purpose and everybody writes eventually.
 */
import type { ReactNode } from 'react'

type Gap = 'tight' | 'normal' | 'loose'

export function Page({ children }: { children: ReactNode }) {
  return <div className="xf-page">{children}</div>
}

export function Stack({
  children,
  gap = 'normal',
  direction = 'column',
}: {
  children: ReactNode
  gap?: Gap
  direction?: 'column' | 'row'
}) {
  return (
    <div className="xf-stack" data-direction={direction} data-gap={gap}>
      {children}
    </div>
  )
}

export function Card({ children, labelledBy }: { children: ReactNode; labelledBy?: string }) {
  return (
    <section aria-labelledby={labelledBy} className="xf-card">
      {children}
    </section>
  )
}

export function Heading({
  children,
  level = 2,
  id,
}: {
  children: ReactNode
  level?: 1 | 2 | 3
  id?: string
}) {
  // The heading LEVEL is a prop rather than a fixed tag, so a screen can keep a
  // correct document outline -- which is how a screen reader user navigates --
  // without reaching for a raw element to get the right one.
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
  return (
    <Tag className="xf-heading" id={id}>
      {children}
    </Tag>
  )
}

export function Text({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'muted'
}) {
  return (
    <p className="xf-text" data-tone={tone}>
      {children}
    </p>
  )
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="xf-code">{children}</code>
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  testId,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  testId?: string
}) {
  return (
    <button
      className="xf-button xf-focusable"
      data-testid={testId}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

/**
 * An alert carries its own ARIA role, chosen by tone.
 *
 * `danger` and `warning` are assertive (`role="alert"`) because something needs
 * the user's attention now -- a failed load, a rejected write. `info` is
 * polite, so a status message does not interrupt what a screen reader user is
 * already reading. Leaving that to each screen is how half of them end up with
 * no role at all.
 */
export function Alert({
  children,
  tone,
  testId,
}: {
  children: ReactNode
  tone: 'danger' | 'warning' | 'info'
  testId?: string
}) {
  return (
    <div
      aria-live={tone === 'info' ? 'polite' : 'assertive'}
      className="xf-alert"
      data-testid={testId}
      data-tone={tone}
      role={tone === 'info' ? 'status' : 'alert'}
    >
      {children}
    </div>
  )
}

/** A live region for work in progress. Polite: it must not interrupt. */
export function Status({ children }: { children: ReactNode }) {
  return (
    <p aria-live="polite" className="xf-text" role="status">
      {children}
    </p>
  )
}

export function List({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <ul className="xf-list" data-testid={testId}>
      {children}
    </ul>
  )
}

export function ListItem({ children }: { children: ReactNode }) {
  return <li className="xf-list-item">{children}</li>
}
