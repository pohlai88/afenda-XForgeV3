import { Stack, TextInput } from '@xforge/design'

/**
 * TextInput previews.
 *
 * Shown bare, because what is on trial is the control's own recipe: the field
 * fill, the 3:1 stroke, the control height that is the WCAG 2.5.8 target floor,
 * the control padding and the placeholder ink. Every one is a symbol that
 * already existed — `field.placeholder` had been in the manifest since before
 * any field did.
 *
 * A bare input needs `aria-label` to be legal alone. That it needs one is the
 * argument for Field.
 */

/** Empty with a placeholder, and filled. A placeholder is a hint, never a label. */
export const EmptyAndFilled = () => (
  <Stack gap="normal">
    <TextInput aria-label="Job title, empty" placeholder="Payroll Manager" />
    <TextInput aria-label="Job title, filled" defaultValue="Payroll Manager" />
  </Stack>
)

/** Disabled, and read-only — which are different states. */
export const DisabledAndReadOnly = () => (
  <Stack gap="normal">
    <TextInput aria-label="Job title, disabled" defaultValue="Payroll Manager" disabled />
    <TextInput aria-label="Employee number, read only" defaultValue="MY-0001" readOnly />
  </Stack>
)

/**
 * The four adopted types. They differ in the keyboard a phone offers and the
 * validation the platform performs, and in nothing else.
 */
export const EveryType = () => (
  <Stack gap="normal">
    <TextInput aria-label="Job title" placeholder="Payroll Manager" type="text" />
    <TextInput aria-label="Work email" placeholder="siti@afenda.my" type="email" />
    <TextInput aria-label="Mobile" placeholder="+60 12-345 6789" type="tel" />
    <TextInput aria-label="Website" placeholder="https://afenda.my" type="url" />
  </Stack>
)
