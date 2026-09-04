import { Card } from '@xforge/design/components/card'
import { Grid } from '@xforge/design/components/grid'
import { Heading } from '@xforge/design/components/heading'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'

/**
 * MetricRow — a row of equal tiles, one number each, every number carrying its
 * baseline in words.
 *
 * MOVED HERE FROM `tests/metric-row.composition.test.tsx`, which is where it was
 * born and which said in its own header: *"It is defined inside this test
 * because no screen has asked for it yet; the day one does, it moves beside
 * that screen unchanged."* The dashboard asked. The test still owns the PROOF
 * and now reads this file instead of itself.
 *
 * It is a COMPOSITION, not an Adapter: it consumes `@xforge/design/components/*`
 * and nothing else, has no `className` of its own, and lives in the app. If a
 * second application ever wants it, that is when it becomes a component.
 *
 * A NUMBER IS NEVER SHOWN ALONE. `128` means nothing; `128, +3 than last month`
 * is a fact somebody can act on. The baseline is required by the type, not by a
 * convention, so a tile cannot be added without one.
 *
 * THE TREND IS THE SCREEN'S JUDGEMENT, NOT THE SIGN'S. Fewer overtime hours is
 * `success` while the delta reads `−2%`; more absences is `danger` while it
 * reads `+4`. Because colour must never carry meaning alone, the trend cannot
 * exist without the signed words beside it — one object, not two optionals, so
 * the rule is a property of the type rather than a thing to remember.
 *
 * GRID, NOT A ROW STACK. It was a row Stack, which wraps nowhere: a fifth tile
 * squeezed the other four instead of moving to a second line.
 */
export interface Metric {
  /** The comparison, in words: "than last month", "of 42 submitted". */
  readonly baseline: string
  /**
   * The change, as one thing: signed and worded ("+4%", "−2 days"), with what
   * the change MEANS. Two independent optionals would let a trend stand alone
   * and be silently ignored.
   */
  readonly delta?: { readonly text: string; readonly trend?: 'danger' | 'success' }
  readonly label: string
  readonly value: string
}

export function MetricRow({
  columns = 4,
  heading,
  id = 'metric-row-heading',
  metrics,
}: {
  readonly columns?: 2 | 3 | 4
  readonly heading: string
  readonly id?: string
  readonly metrics: readonly Metric[]
}) {
  return (
    <Stack aria-labelledby={id} gap="normal" role="region">
      <Heading id={id} level={2}>
        {heading}
      </Heading>
      <Grid columns={columns} gap="normal">
        {metrics.map((m) => (
          // The whole tile carries the sentence, so a screen reader gets the
          // number WITH its baseline rather than three unrelated fragments.
          <Card aria-label={`${m.label}: ${m.value} ${m.baseline}`} key={m.label}>
            <Stack gap="tight">
              <Text variant="label">{m.label}</Text>
              <Text variant="display">{m.value}</Text>
              <Text tone={m.delta?.trend ?? 'muted'}>
                {m.delta ? `${m.delta.text} ${m.baseline}` : m.baseline}
              </Text>
            </Stack>
          </Card>
        ))}
      </Grid>
    </Stack>
  )
}
