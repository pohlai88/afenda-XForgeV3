'use client'

import { Input as Primitive } from '@base-ui/react'
import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * DateInput — a business date, typed or picked.
 *
 * Adaptee   Base UI Input (`@base-ui/react`) as `type="date"`: a native `input`
 * Intent    ADOPT
 *
 * Imported from the package root and not the subpath; `text-input.tsx` records why.
 * Owns      none — the value is one kind and admits no variant
 * Contract  inherited from the adaptee and from the platform: a native date control, so
 *           the calendar, the locale's display order, the keyboard and the clear
 *           behaviour are the operating system's; the wire value is always `YYYY-MM-DD`
 *
 * -------------------------------------------------------------------------------------
 * WHY THIS IS ITS OWN WORD AND NOT `TextInput type="date"`
 * -------------------------------------------------------------------------------------
 * Because a business date is a different KIND here, and this system spends real effort
 * keeping it distinct from an instant (ADR-016: dates and timestamps "are never
 * implicitly converted"). Making it a `type` on a text field would put a business date
 * one prop away from a string, and the value that comes back — `2026-03-16` — would be
 * typed `string` and flow into whatever accepted a string.
 *
 * That is not a hypothetical. The same conflation was found in the repository twice in
 * one week, one layer down each time: the driver parsing a `date` column into a
 * JavaScript `Date` at midnight in the runtime's zone, and a directory that would have
 * resolved "today" from the server's clock rather than the legal entity's. The type
 * system is the only place that can refuse it cheaply, so it refuses it here.
 *
 * -------------------------------------------------------------------------------------
 * WHAT THIS COMPONENT DOES NOT KNOW, AND MUST NOT
 * -------------------------------------------------------------------------------------
 * WHICH DAY IS TODAY. There is no `defaultValue = today`, and there will not be one.
 * Civil dates derive from the owning legal entity's IANA zone (law 21), which a design
 * component cannot know and must not guess; a control that quietly defaults to the
 * browser's date is wrong for every user outside the entity's zone, on the days it
 * matters most. The screen passes a date it resolved.
 *
 * THE NATIVE CONTROL DISPLAYS IN THE READER'S LOCALE, which is correct — a Malaysian
 * user sees 16/03/2026 — while `value` and `onValueChange` stay ISO on both sides. That
 * split is the platform's, and adopting it rather than reimplementing a picker is most of
 * what makes this component nine lines instead of nine hundred.
 *
 * `min` and `max` are adopted because a period boundary is the commonest constraint in
 * this domain — an effective date that cannot precede the one before it — and the
 * platform enforces them without a validation library.
 *
 * The recipe is `TextInput`'s, word for word, because a date field IS a field: same
 * fill, same 3:1 stroke, same control height and padding. Two recipes that must stay
 * identical would be the second source this repository keeps finding, so if they ever
 * diverge it will be because somebody decided they should.
 */

/** A business date on the wire: `YYYY-MM-DD`, never an instant. */
export type BusinessDate = string

/** Section 3 — the Target. */
export interface DateInputProps
  extends Pick<
    NativeProps<'input'>,
    | 'aria-describedby'
    | 'aria-label'
    | 'aria-labelledby'
    | 'disabled'
    | 'id'
    | 'name'
    | 'readOnly'
    | 'required'
  > {
  readonly defaultValue?: BusinessDate
  /** The latest date accepted, inclusive. `YYYY-MM-DD`. */
  readonly max?: BusinessDate
  /** The earliest date accepted, inclusive. `YYYY-MM-DD`. */
  readonly min?: BusinessDate
  readonly onValueChange?: (value: BusinessDate) => void
  readonly value?: BusinessDate
}

/** Section 4 — the Adapter. */
export function DateInput({ onValueChange, ...props }: DateInputProps) {
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
        STYLE.focus.ring,
        STYLE.state.disabled.background,
        STYLE.state.disabled.foreground,
        STYLE.motion.state,
      )}
      data-slot="date-input"
      onValueChange={onValueChange ? (value) => onValueChange(value) : undefined}
      type="date"
      {...props}
    />
  )
}
