import { Stack, Switch, Text } from '@xforge/design'

/**
 * Switch previews.
 *
 * Every state here is BEHAVIOUR exposed as data-*, never a variant (ADR-031
 * Decision 5): checked, disabled and readOnly come from the adaptee, and Base UI
 * owns the keyboard and focus. The Target adopts Base UI's words one at a time —
 * `checked`, `defaultChecked`, `onCheckedChange`, `disabled`, `readOnly`,
 * `required`, `name`, `value` — and nothing arrives by inheritance.
 *
 * Interaction (click, Space, form submission) is proved in Chromium by
 * `packages/design/tests/switch.browser.test.tsx`; these cards are the states.
 */

/** Off and on, controlled. */
export const States = () => (
  <Stack direction="row" gap="loose">
    <Stack direction="row" gap="tight">
      <Switch aria-label="Email notifications" checked={false} />
      <Text tone="muted">Off</Text>
    </Stack>
    <Stack direction="row" gap="tight">
      <Switch aria-label="Email notifications" checked />
      <Text tone="muted">On</Text>
    </Stack>
  </Stack>
)

/** Disabled in both positions — the control refuses the click and the key. */
export const Disabled = () => (
  <Stack direction="row" gap="loose">
    <Stack direction="row" gap="tight">
      <Switch aria-label="Locked setting" checked={false} disabled />
      <Text tone="muted">Off, locked</Text>
    </Stack>
    <Stack direction="row" gap="tight">
      <Switch aria-label="Locked setting" checked disabled />
      <Text tone="muted">On, locked</Text>
    </Stack>
  </Stack>
)

/**
 * readOnly is not disabled: the state is shown and reachable, it just cannot be
 * changed here. A policy a person can read but not edit looks like this.
 */
export const ReadOnly = () => (
  <Stack direction="row" gap="tight">
    <Switch aria-label="Statutory contribution" checked readOnly />
    <Text tone="muted">Set by statutory policy</Text>
  </Stack>
)

/** Labelled settings rows — the composition a preferences screen builds. */
export const InASettingsRow = () => (
  <Stack gap="normal">
    <Stack direction="row" gap="normal">
      <Switch aria-labelledby="notify-payslip" checked />
      <Stack gap="tight">
        <Text id="notify-payslip">Payslip ready</Text>
        <Text tone="muted">Email me when a payslip is published.</Text>
      </Stack>
    </Stack>
    <Stack direction="row" gap="normal">
      <Switch aria-labelledby="notify-leave" checked={false} />
      <Stack gap="tight">
        <Text id="notify-leave">Leave approved</Text>
        <Text tone="muted">Email me when a leave request is decided.</Text>
      </Stack>
    </Stack>
  </Stack>
)
