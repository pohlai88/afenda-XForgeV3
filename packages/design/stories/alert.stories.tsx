import type { Meta, StoryObj } from '@storybook/react-vite'
import { ALERT_TONE, Alert } from '@xforge/design/components/alert'

/**
 * Tones come from ALERT_TONE, the component own axis table, so a tone added to alert.tsx appears here with no edit.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const TONES = Object.keys(ALERT_TONE) as (keyof typeof ALERT_TONE)[]

const meta = {
  argTypes: { tone: { control: 'select', options: TONES } },
  component: Alert,
  title: 'Design/Alert',
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { children: 'Payroll for March has been approved.', tone: 'info' },
}

export const EveryTone: Story = {
  args: { children: '' },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 420 }}>
      {TONES.map((tone) => (
        <Alert key={tone} tone={tone}>
          {tone}: an employment period overlaps an existing one.
        </Alert>
      ))}
    </div>
  ),
}
