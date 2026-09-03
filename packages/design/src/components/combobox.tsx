'use client'

import { Combobox as Primitive } from '@base-ui/react'
import { CheckIcon } from 'lucide-react'
import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'

/**
 * Combobox — pick one option from a list, by typing to narrow it.
 *
 * Adaptee   Base UI Combobox (`@base-ui/react`): Root, Input, Portal, Positioner,
 *           Popup, List, Item, ItemIndicator, Empty — nine of its twenty-seven parts, directly
 * Intent    ADOPT
 * Owns      none — the axis a screen would write does not exist yet; the recipe is Xforge's
 * Contract  inherited from the adaptee: `role="combobox"` on the input, `aria-expanded`,
 *           `aria-controls`, listbox and option roles, arrow traversal, Escape, Enter
 *
 * WHAT NORMALIZE DECIDED. This is the beta's COMPOUND case: several primitives become one
 * Xforge concept. Base UI exposes twenty-seven parts — chips, groups, separators, a clear
 * button, a trigger, an anchor hook — as an assembly kit, and every screen would assemble
 * it differently. Xforge's concept is smaller: a list of options, one of which may be
 * selected, reached by typing. So the Target is `options` + `value` + `onValueChange` +
 * `placeholder` + `disabled` + `emptyMessage` + a label, and the assembly is done ONCE,
 * here. Multiple selection, chips, grouping, a clear button, a chevron trigger and a custom
 * filter are not adopted until a screen needs them (Decision 4); when one does, it is a
 * new word here, not a leak of twenty-seven.
 *
 * THE RECIPE IS XFORGE'S (ADR-034 step 8). Until 2026-09-03 this assembled the vendored
 * shadcn parts, which pulled `input-group`, `input`, `button` and `textarea` into the
 * reachable tree. Now the field is the field recipe — the control floor, control padding,
 * control radius, the field surface and stroke, the body type role, the muted placeholder,
 * the one focus ring, the disabled role — and the popup is the popover surface at the
 * floating elevation on the overlay layer, with the container radius. A highlighted option
 * selects the accent fill, a declared interaction state; the selected option shows a check.
 * Upstream's entrance animation, side-aware slide and `min-w-[calc(...)]` are dropped: the
 * first names a duration no motion role paired with an easing, the rest are hand-typed.
 * The positioner's `--anchor-width` and `--available-height` are Base UI's own layout
 * plumbing and carry no design value; they are used as the variables they are.
 *
 * VALUE IS A STRING ID, NOT THE OPTION OBJECT. Base UI's `value` is whichever item object
 * is selected; a screen holds ids, not objects, and a Target that handed back the
 * object would make the caller's state Base UI's shape. The adapter maps both ways.
 *
 * AN ID THE OPTIONS DO NOT CONTAIN IS REFUSED, NOT CLEARED. The first version coerced it
 * to "nothing selected": the input rendered empty, the form carried nothing, and the
 * parent's state still held the id -- an empty field submitted as the answer, in a
 * payroll form, with nothing saying so. A stale id after the options changed, or options
 * that arrive after the value, are states nobody modelled; the throw names them. The
 * consequence is deliberate: a screen renders this control once its options exist.
 * `null` remains the modelled "controlled, nothing selected".
 *
 * WHAT IS PROVED HERE AND WHAT IS NOT. A server render shows the input, its role and
 * its closed state. Opening, filtering, selection, the id mapping under real events and
 * Escape are proved in Chromium by `tests/combobox.browser.test.tsx`
 * (`vitest run --project browser`).
 */

export interface ComboboxOption {
  readonly label: string
  readonly value: string
}

/** Section 3 — the Target. */
export interface ComboboxProps {
  readonly 'aria-label'?: string
  readonly 'aria-labelledby'?: string
  readonly disabled?: boolean
  readonly emptyMessage?: string
  readonly id?: string
  readonly name?: string
  readonly onValueChange?: (value: string | null) => void
  readonly options: readonly ComboboxOption[]
  readonly placeholder?: string
  readonly value?: string | null
}

const label = (option: ComboboxOption) => option.label
const id = (option: ComboboxOption) => option.value

/** `undefined` is uncontrolled, `null` is controlled-empty, a string must be an option. */
function selectedOption(
  options: readonly ComboboxOption[],
  value: string | null | undefined,
): ComboboxOption | null | undefined {
  if (value === undefined || value === null) {
    return value
  }
  const found = options.find((option) => option.value === value)
  if (found === undefined) {
    throw new Error(`Combobox: value '${value}' is not one of the ${options.length} options`)
  }
  return found
}

const FIELD = cn(
  'w-full outline-none transition-colors disabled:cursor-not-allowed',
  STYLE.size.control,
  STYLE.space.controlX.paddingX,
  STYLE.shape.control,
  STYLE.stroke.width,
  STYLE.stroke.field.border,
  STYLE.surface.field.background,
  STYLE.ink.default.text,
  STYLE.typography.body,
  STYLE.field.placeholder,
  STYLE.focus.ring,
  STYLE.state.disabled.background,
  STYLE.state.disabled.foreground,
)

const POPUP = cn(
  'group/popup max-h-(--available-height) w-(--anchor-width) overflow-hidden',
  STYLE.surface.popover.background,
  STYLE.surface.popover.foreground,
  STYLE.shape.container,
  STYLE.stroke.width,
  STYLE.stroke.border.border,
  STYLE.elevation.above,
)

const ITEM = cn(
  'relative flex w-full cursor-default select-none items-center outline-none',
  STYLE.space.tight.gap,
  STYLE.space.tight.paddingX,
  STYLE.space.related.paddingY,
  STYLE.shape.precise,
  STYLE.typography.bodyCompact,
  STYLE.interaction.highlighted.background,
  STYLE.interaction.highlighted.foreground,
  STYLE.interaction.disabled.foreground,
)

/** Section 4 — the Adapter. Nine parts assembled once; ids in, ids out. */
export function Combobox({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  disabled = false,
  emptyMessage = 'No matches',
  id: inputId,
  name,
  onValueChange,
  options,
  placeholder,
  value,
}: ComboboxProps) {
  const selected = selectedOption(options, value)
  return (
    <Primitive.Root
      disabled={disabled}
      items={options}
      itemToStringLabel={label}
      itemToStringValue={id}
      name={name}
      onValueChange={
        onValueChange
          ? (next: ComboboxOption | null) => onValueChange(next ? next.value : null)
          : undefined
      }
      value={selected}
    >
      <Primitive.Input
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={FIELD}
        data-slot="combobox"
        id={inputId}
        placeholder={placeholder}
      />
      <Primitive.Portal>
        <Primitive.Positioner className={cn('isolate', STYLE.layer.overlay)}>
          <Primitive.Popup className={POPUP} data-slot="combobox-content">
            <Primitive.Empty
              className={cn(
                'hidden w-full justify-center text-center group-data-empty/popup:flex',
                STYLE.space.tight.paddingY,
                STYLE.typography.bodyCompact,
                STYLE.surface.muted.foreground,
              )}
              data-slot="combobox-empty"
            >
              {emptyMessage}
            </Primitive.Empty>
            <Primitive.List
              className={cn(
                'max-h-(--available-height) overflow-y-auto overscroll-contain',
                STYLE.space.related.padding,
              )}
              data-slot="combobox-list"
            >
              {(option: ComboboxOption) => (
                <Primitive.Item
                  className={ITEM}
                  data-slot="combobox-item"
                  key={option.value}
                  value={option}
                >
                  {option.label}
                  <Primitive.ItemIndicator
                    className={cn('ml-auto flex shrink-0 items-center', STYLE.size.icon)}
                  >
                    <CheckIcon aria-hidden="true" />
                  </Primitive.ItemIndicator>
                </Primitive.Item>
              )}
            </Primitive.List>
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  )
}
