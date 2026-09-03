import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stack } from '@xforge/design/components/stack'
import { TEXT_TONE, TEXT_VARIANT, Text } from '@xforge/design/components/text'

/**
 * Tone times variant. Tone is the one that must never carry meaning alone, which only a
 * reader can judge.
 *
 * DERIVED, AFTER BEING HAND-LISTED. The first version of this file declared
 * `const TONES = ['default', 'muted', 'success', 'danger']` copied out of the cva block,
 * which made the story a SECOND SOURCE for the component's own axis: adding a tone to
 * `text.tsx` would have left a story called "Every Tone" showing four of five, with every
 * check still green, because `stories.test.ts` only asserts that a story FILE exists.
 * `TEXT_TONE` and `TEXT_VARIANT` are exported now, so both read from the table.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const TONES = Object.keys(TEXT_TONE) as (keyof typeof TEXT_TONE)[]
const VARIANTS = Object.keys(TEXT_VARIANT) as (keyof typeof TEXT_VARIANT)[]

const meta = {
  argTypes: {
    tone: { control: 'select', options: TONES },
    variant: { control: 'select', options: VARIANTS },
  },
  component: Text,
  title: 'Design/Text',
} satisfies Meta<typeof Text>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {
    children: 'Employment period 2024-04-01 to 2025-03-31',
    tone: 'default',
    variant: 'body',
  },
}

export const EveryVariant: Story = {
  args: { children: '' },
  render: () => (
    <Stack gap="tight">
      {VARIANTS.map((variant) => (
        <Text key={variant} variant={variant}>
          {variant} — employment period
        </Text>
      ))}
    </Stack>
  ),
}

/**
 * Tone alone is not a signal. Each row names its tone in words as well as wearing it,
 * which is the redundant cue a colour-only status would be missing.
 */
export const EveryTone: Story = {
  args: { children: '' },
  render: () => (
    <Stack gap="tight">
      {TONES.map((tone) => (
        <Text key={tone} tone={tone}>
          {tone} — employment period
        </Text>
      ))}
    </Stack>
  ),
}
