'use client'

import { Field as Primitive } from '@base-ui/react'
import type { ReactNode } from 'react'
import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * Field — a labelled control, with its hint and its error wired to it.
 *
 * Adaptee   Base UI Field (`@base-ui/react`): Root, Label, Description, Error
 * Intent    ADOPT
 *
 * Imported from the package root and not the subpath; `text-input.tsx` records why.
 * Owns      span (1 | 2 | 3 | 4) — how many grid tracks the field occupies;
 *           label, description and error are content slots, not axes
 * Contract  the ACCESSIBLE RELATIONSHIP itself: the label's `for` points at the control
 *           the caller nested, the control's `aria-describedby` points at the description
 *           and at the error, and `aria-invalid` follows `invalid` — all by id, all
 *           generated, none written by a screen
 *
 * -------------------------------------------------------------------------------------
 * THIS IS THE COMPONENT THE INERTNESS SUITE WAS DESCRIBING
 * -------------------------------------------------------------------------------------
 * `project-state.md` spent a paragraph explaining why `profile: 'none'` had to grow a
 * clause about wiring: *"a Field is not focusable, declares no interactive role and
 * carries no live-region marker, so every clause above passes one mis-declared as
 * inert. Naming a control it rendered is the one signature that separates the two."*
 * That was written before any Field existed. This is it, and it is the only authored
 * component that names something it rendered BY REFERENCE.
 *
 * -------------------------------------------------------------------------------------
 * THE LABEL IS REQUIRED, AND IT IS A STRING
 * -------------------------------------------------------------------------------------
 * Not `ReactNode`, and not optional. Every unlabelled input in this industry began as an
 * optional label prop, and every placeholder-as-label began as somebody deciding the
 * design looked cleaner without one — a placeholder vanishes the moment a person types,
 * so a form that labels with placeholders is unreadable exactly when it is being
 * checked. A string rather than a node because a label that can contain arbitrary markup
 * eventually contains a control, and a `<label>` wrapping two focusables has no defined
 * behaviour.
 *
 * Combobox has carried `aria-label` and `aria-labelledby` since it was authored, and the
 * gallery's "In a form" specimen labels it with a `Text` and a hand-written id. That is
 * the gap this closes: the ids stop being a screen's problem.
 *
 * -------------------------------------------------------------------------------------
 * ERROR AND DESCRIPTION ARE DIFFERENT THINGS, AND BOTH CAN BE PRESENT
 * -------------------------------------------------------------------------------------
 * A description says what to enter; an error says what went wrong with what was entered.
 * Replacing the first with the second — which is what a single `helperText` prop
 * produces — removes the instruction at the exact moment the person needs it most. Both
 * are wired into `aria-describedby`, in that order, so a reader hears the rule and then
 * the complaint.
 *
 * `match` is set to `true` on the Error rather than left to the platform's ValidityState.
 * The server is the authority on whether a value is acceptable here — a version conflict,
 * a duplicate employee number, a date outside an employment period — and none of that is
 * expressible as an HTML constraint. So the screen says whether the field is invalid, and
 * the component shows what it was told.
 *
 * -------------------------------------------------------------------------------------
 * NO STYLE ON THE INVALID STATE, DELIBERATELY
 * -------------------------------------------------------------------------------------
 * The error text takes `error.container.foreground`, which is the only error ink measured
 * against the page. The CONTROL still does not change. `STYLE.error.default.border` exists
 * as of `20507f7`, but only in its bare form; the state-prefixed
 * `interaction.invalid.border` that would key off the `data-invalid` this component already
 * sets on its control does not, and a component may not mint one. `text-input.tsx` carries
 * the measurement and the request.
 */

/**
 * -------------------------------------------------------------------------------------
 * SPAN — INSPIRED BY shadcn-studio's form-layout block, NORMALIZED
 * -------------------------------------------------------------------------------------
 * ACQUIRE   shadcn-studio, dashboard-and-application / form-layout-2 (fetched through the
 *           studio MCP as data on 2026-09-04; nothing installed, nothing copied).
 * DIGEST    18 Inputs, 20 Fields, 20 FieldErrors and NOT ONE description: the block tells
 *           a person what a field wanted only after they have got it wrong. Its layout DNA
 *           is a responsive grid where every field declares its own width —
 *           `className='gap-2 sm:col-span-2'`, twenty-one times, at the call site.
 * NORMALIZE the WIDTH IS THE IDEA and the class literal is not. A form is a grid of mixed
 *           widths — an employee number is short and a full name is long — and a stack of
 *           full-width controls is the layout every form starts with and no form keeps.
 *           `Grid` cannot express it: it owns EQUAL tracks, so two-of-three is unsayable.
 *           So the span becomes an axis on the field rather than a class on the screen,
 *           and the screen stops deciding layout in a string.
 *
 *           A COUNT IS NOT A DESIGN VALUE. `col-span-2` is written as itself for exactly
 *           the reason `grid-cols-3` is in `grid.tsx`: there is no token for "two", and
 *           the closed union is what stops a screen writing twelve. Nothing else was
 *           taken — the block's gap, breakpoints and per-call classes stay there.
 * ADAPT     one axis, exported and stamped as `data-span`, so a coverage check reads the
 *           vocabulary rather than re-typing it (ADR-031).
 *
 * WHAT WAS LOOKED AT AND NOT TAKEN. The block sets `data-invalid` on its wrapper by hand;
 * Base UI's Field.Root already stamps it — measured in Chromium, the root carries
 * `data-invalid data-slot class` — so adding it would have been redundant code that looked
 * like a feature. Its password-visibility toggle is a real mechanic and an adornment slot
 * is a real component change; no screen here has asked for one, and this product has no
 * password field at all (authentication is a separate surface), so it is not built.
 *
 * ITS MISSING DESCRIPTION IS THE FINDING WORTH KEEPING. Twenty errors and no hints is not
 * an oversight in one block, it is what a form looks like when the error state is the only
 * one anybody designs. `description` was already here and stays, and the story that shows
 * a description AND an error together is the one that proves they are different things.
 */

/**
 * How many tracks of its parent `Grid` the field occupies.
 *
 * EXPORTED AND STAMPED, for the reason `ALERT_TONE` and `GRID_COLUMNS` are: the table IS
 * the contract, and a check that wants to prove every value is rendered somewhere has to
 * read the vocabulary rather than re-type it.
 */
export const FIELD_SPAN = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
} as const

/** Section 3 — the Target. */
export interface FieldProps extends Pick<NativeProps<'div'>, 'id'> {
  /** The control. A `TextInput`, `DateInput`, `Combobox` or `Switch`. */
  readonly children: ReactNode
  /** What to enter, said before the person enters it. Stays visible when there is an error. */
  readonly description?: string
  readonly disabled?: boolean
  /**
   * What went wrong. Its presence is what makes the field invalid — one fact, not a
   * boolean and a string that can disagree about whether there is a problem.
   */
  readonly error?: string
  /** Required, and a string. See the header. */
  readonly label: string
  /** Submitted with the form, and the key a form library reports errors against. */
  readonly name?: string
  /**
   * Tracks occupied in a parent `Grid`. Absent means the field takes its natural place
   * in whatever lays it out -- a `Stack` gives it the full width, and a field outside a
   * grid is unaffected by a span it cannot use.
   */
  readonly span?: keyof typeof FIELD_SPAN
}

/** Section 4 — the Adapter. Base UI wires the ids; every class is a symbol. */
export function Field({
  children,
  description,
  disabled,
  error,
  label,
  name,
  span,
  ...props
}: FieldProps) {
  return (
    <Primitive.Root
      className={cn('flex flex-col', STYLE.space.tight.gap, span && FIELD_SPAN[span])}
      data-slot="field"
      // Stamped only when set: `data-span` present means the field was placed
      // deliberately, and absent means nobody decided -- which a coverage check can
      // tell apart, where `data-span="1"` on every field could not.
      data-span={span}
      disabled={disabled}
      invalid={error !== undefined}
      name={name}
      {...props}
    >
      <Primitive.Label
        className={cn(STYLE.typography.label, STYLE.ink.onSurface.text)}
        data-slot="field-label"
      >
        {label}
      </Primitive.Label>

      {children}

      {description ? (
        <Primitive.Description
          className={cn(STYLE.typography.caption, STYLE.ink.onSurfaceVariant.text)}
          data-slot="field-description"
        >
          {description}
        </Primitive.Description>
      ) : null}

      {/*
        `match` is the screen's word, not the platform's -- see the header. Rendered only
        when there is something to say, so an empty error region never sits in the
        accessibility tree describing a field with nothing.
      */}
      {error ? (
        <Primitive.Error
          className={cn(STYLE.typography.caption, STYLE.error.container.foreground)}
          data-slot="field-error"
          match={true}
        >
          {error}
        </Primitive.Error>
      ) : null}
    </Primitive.Root>
  )
}
