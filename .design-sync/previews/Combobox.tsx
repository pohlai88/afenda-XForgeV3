import { Combobox, Stack, Text } from '@xforge/design'

/**
 * Combobox previews.
 *
 * A Compound Adapter: six of upstream's sixteen parts assembled once behind
 * `options` + `value` + `onValueChange`. Ids go in and ids come out — the
 * component maps to and from the label itself.
 *
 * THE OPEN LIST IS NOT SHOWN. Opening it requires typing or a click, and these
 * cards are static renders; a preview that faked the popup would be showing a
 * DOM the component never produces on its own. The closed states below are the
 * true ones. Open-state behaviour is proved instead in Chromium by
 * `packages/design/tests/combobox.browser.test.tsx`.
 */

const relationships = [
  { label: 'Spouse', value: 'spouse' },
  { label: 'Parent', value: 'parent' },
  { label: 'Sibling', value: 'sibling' },
  { label: 'Child', value: 'child' },
  { label: 'Guardian', value: 'guardian' },
] as const

/** Uncontrolled and empty: the placeholder is what a person sees first. */
export const Empty = () => (
  <Combobox aria-label="Relationship" options={relationships} placeholder="Select a relationship" />
)

/** Controlled with a selection — the id `spouse` resolves to its label. */
export const Selected = () => (
  <Combobox aria-label="Relationship" options={relationships} value="spouse" />
)

/** Disabled, for a field the form has locked. */
export const Disabled = () => (
  <Combobox
    aria-label="Relationship"
    disabled
    options={relationships}
    placeholder="Select a relationship"
  />
)

/** Labelled in a form the way a screen composes it. */
export const InAForm = () => (
  <Stack gap="tight">
    <Text variant="label">Relationship</Text>
    <Combobox
      aria-label="Relationship"
      options={relationships}
      placeholder="Select a relationship"
    />
    <Text tone="muted">How this person is related to the employee.</Text>
  </Stack>
)
