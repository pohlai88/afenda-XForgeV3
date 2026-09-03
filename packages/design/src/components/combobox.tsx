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
 * Adaptee   shadcn `combobox` (style base-nova, refreshed 2026-09-03) over Base UI Combobox:
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
 * WHAT IS PROVED HERE AND WHAT IS NOT. A server render shows the input, its role and
 * its closed state. Opening, traversal and selection are Base UI's and are exercised in
 * a browser (the e2e suite), not in this package's tests — stated rather than implied.
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
  const selected =
    value === undefined ? undefined : (options.find((o) => o.value === value) ?? null)
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
