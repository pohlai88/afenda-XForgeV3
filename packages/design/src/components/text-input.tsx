'use client'

import { Input as Primitive } from '@base-ui/react'
import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * TextInput — one line of text a person types.
 *
 * Adaptee   Base UI Input (`@base-ui/react`): a native `input`, directly
 * Intent    ADOPT
 * Owns      none — no screen has asked for a size or a variant; the recipe is Xforge's
 * Contract  inherited from the adaptee: a native `input`, so the platform supplies the
 *           caret, selection, IME, autofill, spellcheck and the entire keyboard; the
 *           state vocabulary is `data-disabled` / `data-invalid` / `data-touched` /
 *           `data-dirty` / `data-filled` / `data-focused`, set by Base UI when this sits
 *           inside a `Field`
 *
 *
 * IMPORTED FROM THE PACKAGE ROOT, NOT `@base-ui/react/input`. The subpath resolves to a
 * module Vite has not pre-bundled, which pulls a SECOND React into the browser project
 * and every story dies on "Invalid hook call". Switch and Button import their subpaths
 * and are fine, which is what made this look safe -- those two are pre-bundled and these
 * were not, so the precedent was real and did not transfer. Sixteen story mounts went red
 * before the root import fixed it.
 *
 * WHAT NORMALIZE DECIDED. Base UI ships `Input` as "a native input that automatically
 * works with Field": alone it is an input, and inside a `Field.Root` it registers itself,
 * takes the label's `for`, publishes its own id to the description and error, and gains
 * `aria-invalid`. That auto-registration is the ONLY reason this is an ADOPT rather than
 * a hand-written `input` — wiring four ids by hand across three components is the kind of
 * thing that is correct on the day it is written and silently wrong after the first
 * refactor.
 *
 * `onValueChange` receives the new value only. Base UI calls its handler with a second
 * argument, an event-details object, and a callback passed straight through would receive
 * it whatever the Target declares — the same one-line wrapper Switch uses, for the same
 * reason. `onChange` is deliberately NOT adopted: two ways to hear about a change is two
 * places for a screen to disagree with itself.
 *
 * `type` IS AN ADOPTED WORD AND A CLOSED ONE. `text`, `email`, `tel` and `url` differ
 * only in the keyboard a phone offers and the validation the platform performs; they need
 * no styling and no axis. `date` is absent on purpose and is `DateInput`, because a
 * business date is a different KIND in this system (ADR-016) and not a text field with a
 * different picker. `number` is absent because money is never a JS number here (law 19)
 * and a numeric field with no money story would be used for one within a week.
 *
 * THE RECIPE IS XFORGE'S (ADR-034), AND IT NEEDED NO NEW WORD. Every class below is a
 * symbol that already existed: the field fill, the 3:1 stroke, the control height, which
 * is the WCAG 2.5.8 target floor, the control padding, and `field.placeholder` — a symbol
 * that has been in the manifest since before any field existed, waiting for this.
 *
 * ONE STATE HAS NO STYLE, AND WHAT IS MISSING HAS NARROWED. An invalid input still draws
 * exactly like a valid one -- measured in Chromium, the border is rgb(111, 123, 133)
 * either way. The COLOUR now exists: `20507f7` added `STYLE.error.default.border`
 * (`border-error`) as part of the accent kind, with a measured 7.3:1 edge against the page.
 * What does not exist is a STATE-PREFIXED form of it. `interaction.checked.border` is
 * `data-checked:not-data-disabled:border-primary`; the sibling `interaction.invalid.border`
 * -- `data-invalid:border-error` -- has no entry, and the adaptee publishes exactly the
 * attribute it would key on: this control carries `data-invalid` when the Field is invalid
 * and not otherwise, verified in the browser.
 *
 * So the border is one symbol away, and hand-typing `data-invalid:border-error` here is
 * precisely what `design-system-classes.test.ts` refuses -- correctly, because `border-error`
 * resolves through the closed `--color-*` namespace and a component may not mint into it
 * (ADR-034; ADR-031 Decision 12 — components SELECT style, they do not DEFINE it).
 * Requested rather than worked around. Until then invalidity reaches the reader as
 * `aria-invalid` and as the error MESSAGE the Field renders in words, which is where rule 7
 * wanted it anyway; the redundant VISUAL cue is the part still owed.
 */

/** Section 3 — the Target. Each adopted word is listed; nothing arrives by inheritance. */
export interface TextInputProps
  extends Pick<
    NativeProps<'input'>,
    | 'aria-describedby'
    | 'aria-label'
    | 'aria-labelledby'
    | 'autoComplete'
    | 'disabled'
    | 'id'
    | 'inputMode'
    | 'maxLength'
    | 'name'
    | 'placeholder'
    | 'readOnly'
    | 'required'
  > {
  readonly defaultValue?: string
  readonly onValueChange?: (value: string) => void
  readonly type?: 'email' | 'tel' | 'text' | 'url'
  readonly value?: string
}

/** Section 4 — the Adapter. The platform's input, in the language. */
export function TextInput({ onValueChange, type = 'text', ...props }: TextInputProps) {
  return (
    <Primitive
      className={cn(
        'w-full outline-none',
        STYLE.size.control,
        STYLE.shape.control,
        STYLE.stroke.width,
        STYLE.outline.default.border,
        STYLE.surface.lowest.background,
        STYLE.ink.onSurface.text,
        STYLE.typography.body,
        STYLE.space.controlX.paddingX,
        STYLE.field.placeholder,
        STYLE.focus.ring,
        // `disabled:` and not `data-disabled:`: this is a native control, so the
        // platform's own pseudo-class is the truthful selector. `interaction.disabled`
        // exists for adaptees that are not native and publish `data-disabled` instead.
        STYLE.state.disabled.background,
        STYLE.state.disabled.foreground,
        STYLE.motion.state,
      )}
      data-slot="text-input"
      onValueChange={onValueChange ? (value) => onValueChange(value) : undefined}
      type={type}
      {...props}
    />
  )
}
