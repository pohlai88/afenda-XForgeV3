'use client'

import { Switch as Primitive } from '@base-ui/react/switch'
import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * Switch — a binary control: on or off, and it takes effect at once.
 *
 * Adaptee   Base UI Switch (`@base-ui/react/switch`): Root + Thumb, directly
 * Intent    ADOPT
 * Owns      none — no screen has asked for a size; the recipe is Xforge's
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
 * axis), and no `className` is exposed: a screen does not style a switch.
 *
 * THE RECIPE IS XFORGE'S (ADR-034 step 8), AND IT NEEDED FOUR WORDS THE KERNEL DID NOT
 * HAVE. Upstream sized the track `h-[18.4px] w-[32px]` and moved the thumb by
 * `translate-x-[calc(100%-2px)]` — hand-typed lengths no role owns. A switch track is the
 * textbook component-tier token (ADR-031 Decision 6: geometry a component needs and no
 * semantic role names), so `component.switch.*` was minted, each aliasing a SEMANTIC role
 * rather than a number: the track is the target floor high (24px, WCAG 2.5.8) and the
 * control minimum wide (40px; density rebinds it), the thumb is the icon size, the inset
 * is the ring offset. The thumb travels by flex alignment — `justify-start` unchecked,
 * `justify-end` checked — so no translate distance exists to name. The track fill is a
 * DECLARED interaction state: unchecked selects the field surface, checked the primary
 * action fill, disabled the disabled role (Decision 12: a state selects a state role and
 * introduces no styling of its own).
 *
 * `onCheckedChange` receives the new value only. Base UI calls its handler with a second
 * argument, an event-details object, and a callback passed straight through would
 * receive it whatever `SwitchProps` declares. The one-line wrapper below is what keeps
 * the call's arity to the Target's; a screen has never needed the details.
 */

/** Section 3 — the Target. Each adopted word is listed; nothing arrives by inheritance. */
export interface SwitchProps
  extends Pick<NativeProps<'span'>, 'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'> {
  readonly checked?: boolean
  readonly defaultChecked?: boolean
  readonly disabled?: boolean
  readonly name?: string
  readonly onCheckedChange?: (checked: boolean) => void
  readonly readOnly?: boolean
  readonly required?: boolean
  readonly value?: string
}

/** Section 4 — the Adapter. Behaviour from Base UI; every class a symbol. */
export function Switch({ onCheckedChange, ...props }: SwitchProps) {
  return (
    <Primitive.Root
      className={cn(
        'relative inline-flex shrink-0 items-center justify-start rounded-full outline-none',
        'transition-colors data-disabled:cursor-not-allowed data-checked:justify-end',
        STYLE.component.switch.trackWidth,
        STYLE.component.switch.trackHeight,
        STYLE.component.switch.inset,
        STYLE.interaction.unchecked.background,
        STYLE.interaction.checked.background,
        STYLE.interaction.disabled.background,
        STYLE.focus.ring,
        STYLE.motion.press,
      )}
      data-slot="switch"
      onCheckedChange={onCheckedChange ? (checked) => onCheckedChange(checked) : undefined}
      {...props}
    >
      <Primitive.Thumb
        className={cn(
          'block rounded-full',
          STYLE.component.switch.thumb,
          STYLE.surface.page.background,
        )}
        data-slot="switch-thumb"
      />
    </Primitive.Root>
  )
}
