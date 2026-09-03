'use client'

import type { ComponentProps } from 'react'
import { Switch as Primitive } from '#components/ui/switch'

/**
 * Switch — a binary control: on or off, and it takes effect at once.
 *
 * Adaptee   shadcn `switch` (style base-nova, refreshed 2026-09-03) over Base UI Switch
 * Intent    ADOPT
 * Owns      none — no screen has asked for a size; upstream's `size` stays behind the boundary
 * Contract  inherited from the adaptee: `role="switch"`, `aria-checked`, Space and Enter,
 *           `data-checked` / `data-unchecked` / `data-disabled` as the state vocabulary
 *
 * WHAT NORMALIZE DECIDED. This is the beta's "Primitive with behaviour" case, and the
 * point of it is what crosses the boundary: BEHAVIOUR, not appearance. Base UI owns the
 * toggle mechanics, the keyboard, the hidden input for forms and the state attributes
 * (ownership table, ADR-031 Decision 3). Xforge owns the words a screen writes. The
 * words adopted are Base UI's own — `checked`, `defaultChecked`, `onCheckedChange`,
 * `disabled`, `readOnly`, `required`, `name`, `value` — because they are the platform's
 * vocabulary for a switch and inventing a synonym would be a leak in the other
 * direction. Adopted EXPLICITLY, one by one, in `SwitchProps`; not by re-exporting the
 * adaptee's type. Upstream's `size` axis is NOT adopted (Decision 4: no speculative
 * axis), and its `className` is not exposed: a screen does not style a switch.
 *
 * `onCheckedChange` receives the new value only. Base UI also passes an event-details
 * object; a screen has never needed it, and passing it through would make the Target's
 * signature Base UI's.
 */

/** Section 3 — the Target. Each adopted word is listed; nothing arrives by inheritance. */
export interface SwitchProps
  extends Pick<
    ComponentProps<'span'>,
    'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
  > {
  readonly checked?: boolean
  readonly defaultChecked?: boolean
  readonly disabled?: boolean
  readonly name?: string
  readonly onCheckedChange?: (checked: boolean) => void
  readonly readOnly?: boolean
  readonly required?: boolean
  readonly value?: string
}

/** Section 4 — the Adapter. Translation only; the primitive does the work. */
export function Switch({ onCheckedChange, ...props }: SwitchProps) {
  return (
    <Primitive
      data-slot="switch"
      onCheckedChange={onCheckedChange ? (checked) => onCheckedChange(checked) : undefined}
      {...props}
    />
  )
}
