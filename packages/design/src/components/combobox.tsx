'use client'

import {
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Combobox as Root,
} from '#components/ui/combobox'

/**
 * Combobox — pick one option from a list, by typing to narrow it.
 *
 * Adaptee   shadcn `combobox` (style base-nova) over Base UI Combobox:
 *           Root + Input + Content + List + Item + Empty, six of its sixteen parts
 * Intent    ADOPT
 * Owns      none — the axis a screen would write does not exist yet
 * Contract  inherited from the adaptee: `role="combobox"` on the input, `aria-expanded`,
 *           `aria-controls`, listbox and option roles, arrow traversal, Escape, Enter
 *
 * WHAT NORMALIZE DECIDED. This is the beta's COMPOUND case: several primitives become one
 * Xforge concept. Upstream exposes sixteen parts — chips, groups, separators, a clear
 * button, a bare trigger, an anchor hook — as an assembly kit, and every screen would
 * assemble it differently. Xforge's concept is smaller: a list of options, one of which
 * may be selected, reached by typing. So the Target is `options` + `value` +
 * `onValueChange` + `placeholder` + `disabled` + `emptyMessage` + a label, and the
 * assembly is done ONCE, here. Multiple selection, chips, grouping and a custom filter
 * are not adopted until a screen needs them (Decision 4); when one does, it is a new
 * word here, not a leak of sixteen.
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

/** Section 4 — the Adapter. Six parts assembled once; ids in, ids out. */
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
    <Root
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
      <ComboboxInput
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        data-slot="combobox"
        id={inputId}
        placeholder={placeholder}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(option: ComboboxOption) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Root>
  )
}
