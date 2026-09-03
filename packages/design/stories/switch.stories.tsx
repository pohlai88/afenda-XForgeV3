import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stack } from '@xforge/design/components/stack'
import { Switch } from '@xforge/design/components/switch'
import { Text } from '@xforge/design/components/text'

/**
 * Four states the recipe styles separately, and the only component here whose disabled
 * form must still read as off or on.
 *
 * EVERY SWITCH IS NAMED, and the first version of this file named none of them. The
 * conformance scan reported `aria-toggle-field-name` against Playground on
 * 2026-09-04: a switch is a control with no text of its own, so without a label it has no
 * accessible name and a screen reader announces its state and nothing else. That was a
 * defect in the specimen rather than in the component -- the gallery frames it inside a
 * labelled row -- but an unnamed control is exactly the shape this scan exists to refuse,
 * and a story that models it teaches the wrong thing to whoever copies it.
 *
 * `EveryState` associates its visible text with `aria-labelledby` rather than repeating it
 * in an `aria-label`. The text is on screen either way; duplicating it would be two
 * sources for one name, and they drift.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const meta = { component: Switch, title: 'Design/Switch' } satisfies Meta<typeof Switch>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { 'aria-label': 'Notify me about payroll approvals', defaultChecked: false },
}

const STATES = [
  { checked: false, disabled: false, label: 'off' },
  { checked: true, disabled: false, label: 'on' },
  { checked: false, disabled: true, label: 'off, disabled' },
  { checked: true, disabled: true, label: 'on, disabled' },
] as const

export const EveryState: Story = {
  render: () => (
    <Stack gap="normal">
      {STATES.map((state) => {
        const id = `switch-state-${state.label.replace(/[^a-z]+/g, '-')}`
        return (
          <Stack direction="row" gap="tight" key={state.label}>
            <Switch
              aria-labelledby={id}
              checked={state.checked}
              disabled={state.disabled}
              onCheckedChange={() => undefined}
            />
            <Text id={id} tone="muted">
              {state.label}
            </Text>
          </Stack>
        )
      })}
    </Stack>
  ),
}
