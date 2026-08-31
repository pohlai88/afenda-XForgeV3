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
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { Field as BaseField } from '@base-ui/react/field'
import { Input as BaseInput } from '@base-ui/react/input'
import type { ReactElement, ReactNode } from 'react'

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

/**
 * TWO SURFACES, and keeping them distinct is the point.
 *
 * The METADATA contract is `variant`, `disabled`, `testId` and a text label.
 * That is all configuration can ever say, and it is why there is no `className`
 * and no `style`.
 *
 * The INTERNAL COMPOSITION surface is `composition`: the ref, handlers, ARIA
 * and data attributes a headless primitive injects when this Button is the
 * element it renders. `<Dialog.Trigger render={<Button>Open</Button>} />` works
 * only if those reach the underlying `<button>`.
 *
 * Collapsing the two forces a choice between a Button that cannot be composed
 * and a metadata language that permits arbitrary DOM props. The same question
 * returns for Tooltip, Popover, Menu and Combobox, so it is worth naming here.
 *
 * ORDER IN THE SPREAD IS LOAD-BEARING. `onClick` comes FIRST so that a
 * composing primitive's handler replaces it -- a trigger whose click opens
 * nothing is the failure that ordering prevents. `className` and `type` come
 * LAST so a primitive cannot restyle the design system or turn this into a
 * submit button.
 */
export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  testId,
  ...composition
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  testId?: string
} & Record<string, unknown>) {
  return (
    <button
      onClick={onClick}
      {...composition}
      className="xf-button xf-focusable"
      data-testid={testId}
      data-variant={variant}
      disabled={disabled}
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

/**
 * A modal dialog, on Base UI.
 *
 * WHAT IS DELEGATED, and why that is the point. Base UI's Dialog owns the focus
 * trap, the initial focus target, the return of focus to the trigger on close,
 * Escape to dismiss, `aria-modal`, the `aria-labelledby`/`aria-describedby`
 * wiring between Popup, Title and Description, and inert-ing the rest of the
 * page. Every one of those is a thing this repository would otherwise get
 * subtly wrong and not find out about, because a broken focus trap looks
 * completely normal to anyone using a mouse.
 *
 * WHAT IS NOT DELEGATED. The vocabulary. `title` is a required slot rather than
 * an optional convenience, because a dialog without one is an unnamed region
 * and the whole labelling chain silently degrades. `description` is optional
 * because a dialog with nothing further to say should not be made to invent
 * something.
 *
 * `open`/`onOpenChange` are OPTIONAL: uncontrolled by default, so the contract
 * -- which can carry neither a function nor a piece of application state -- can
 * still describe a Dialog completely. `onOpenChange` is a function and could
 * never appear in a contract, exactly as `Button.onClick` cannot.
 */
export function Dialog({
  title,
  description,
  trigger,
  children,
  actions,
  open,
  onOpenChange,
  testId,
}: {
  title: ReactNode
  description?: ReactNode
  /** A Button ELEMENT, composed by Base UI rather than wrapped. */
  trigger?: ReactElement
  children: ReactNode
  actions?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  testId?: string
}) {
  return (
    <BaseDialog.Root onOpenChange={onOpenChange} open={open}>
      {/*
       * `render` COMPOSES the caller's Button rather than wrapping it.
       *
       * The first version passed `render={<span />}` with a Button inside, which
       * stripped the button semantics from the thing that opens the dialog and
       * nested one interactive element in another. The second overcorrected: it
       * concluded no control could go here and made the slot take text. Base
       * UI's `render` is exactly the composition mechanism for this -- the fix
       * was never to narrow the language, it was to compose instead of wrap.
       */}
      {trigger ? <BaseDialog.Trigger render={trigger as never} /> : null}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="xf-dialog-backdrop" />
        <BaseDialog.Popup className="xf-dialog" data-testid={testId}>
          <BaseDialog.Title className="xf-heading">{title}</BaseDialog.Title>
          {description ? (
            <BaseDialog.Description className="xf-text" data-tone="muted">
              {description}
            </BaseDialog.Description>
          ) : null}
          <div className="xf-dialog-content">{children}</div>
          {actions ? <div className="xf-dialog-actions">{actions}</div> : null}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}

/**
 * The labelling, description and validity wrapper for one control.
 *
 * Base UI's Field generates the ids and wires `aria-labelledby` and
 * `aria-describedby` between the label, the description, the error and the
 * control. Done by hand, this is where a form acquires a label that reads
 * correctly and an error nobody ever hears.
 *
 * `Field.Error` takes `match` because it normally renders only when the browser
 * reports a matching validity state. A server-supplied message is not a browser
 * validity state -- a rejected write or a business rule -- so `match` is forced
 * true when there is a message to show.
 */
export function Field({
  label,
  description,
  error,
  children,
  testId,
}: {
  label: ReactNode
  description?: ReactNode
  error?: ReactNode
  children: ReactNode
  testId?: string
}) {
  return (
    <BaseField.Root className="xf-field" data-testid={testId}>
      <BaseField.Label className="xf-field-label">{label}</BaseField.Label>
      {children}
      {description ? (
        <BaseField.Description className="xf-field-description">
          {description}
        </BaseField.Description>
      ) : null}
      {error ? (
        <BaseField.Error className="xf-field-error" match={true}>
          {error}
        </BaseField.Error>
      ) : null}
    </BaseField.Root>
  )
}

/** A text control. Its accessible name comes from the Field that wraps it. */
export function Input({
  name,
  type = 'text',
  placeholder,
  required,
  disabled,
  testId,
}: {
  name?: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'search'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  testId?: string
}) {
  return (
    <BaseInput
      className="xf-input xf-focusable"
      data-testid={testId}
      disabled={disabled}
      name={name}
      placeholder={placeholder}
      required={required}
      type={type}
    />
  )
}

/**
 * A boolean control with NO label of its own, on purpose.
 *
 * `CheckboxRoot` reads `labelId` from the Field context and sets
 * `aria-labelledby` from it, so a Checkbox takes its accessible name from the
 * Field that wraps it -- exactly as an Input does. An earlier version wrapped
 * itself in its own Field and Label, which produced the second label a grammar
 * rule was then written to forbid: the component manufactured the problem, and
 * the language got bent around it.
 */
export function Checkbox({
  name,
  disabled,
  testId,
}: {
  name?: string
  disabled?: boolean
  testId?: string
}) {
  return (
    <BaseCheckbox.Root
      className="xf-checkbox xf-focusable"
      data-testid={testId}
      disabled={disabled}
      name={name}
    >
      <BaseCheckbox.Indicator className="xf-checkbox-mark" keepMounted={false} />
    </BaseCheckbox.Root>
  )
}

/**
 * A visual placeholder for content that has not arrived.
 *
 * `aria-hidden`, and that is the whole design decision. Skeleton is an
 * affordance; the loading STATE is what should be announced, and announcing it
 * here would put two components in charge of one fact. The obligation to tell a
 * screen-reader user that something is loading therefore belongs to whatever
 * renders `ResourceState.loading` -- recorded rather than quietly dropped.
 */
export function Skeleton({
  variant = 'text',
  testId,
}: {
  variant?: 'text' | 'block'
  testId?: string
}) {
  return (
    <div aria-hidden="true" className="xf-skeleton" data-testid={testId} data-variant={variant} />
  )
}

/**
 * There is nothing to show, and nothing went wrong.
 *
 * A heading rather than a paragraph, because an empty region that a screen
 * reader user can navigate to by heading is findable; a stray sentence is not.
 * The action is what separates this from a shrug.
 */
export function EmptyState({
  title,
  description,
  action,
  testId,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  testId?: string
}) {
  return (
    <div className="xf-empty-state" data-testid={testId}>
      <p className="xf-heading" data-empty-title="">
        {title}
      </p>
      {description ? (
        <p className="xf-text" data-tone="muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="xf-empty-state-action">{action}</div> : null}
    </div>
  )
}
