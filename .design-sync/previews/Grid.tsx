import { Card, Grid, Text } from '@xforge/design'

/**
 * Grid previews — the second layout word: equal columns on the gap roles.
 *
 * `columns` is a count (1 | 2 | 3 | 4) and not a design value; `gap` is a density-bound
 * role exactly as Stack's is, so compact tightens both words together. There is no
 * minimum column width and no wrapping by viewport: that needs a length, a length needs
 * a token, and no screen has asked.
 */

/** Three tiles, one number each: the MetricRow shape without a row Stack that never wraps. */
export const Tiles = () => (
  <Grid columns={3}>
    <Card>
      <Text tone="muted" variant="label">
        Malaysia
      </Text>
      <Text variant="display">642</Text>
    </Card>
    <Card>
      <Text tone="muted" variant="label">
        Singapore
      </Text>
      <Text variant="display">411</Text>
    </Card>
    <Card>
      <Text tone="muted" variant="label">
        Jakarta
      </Text>
      <Text variant="display">231</Text>
    </Card>
  </Grid>
)

/** Two columns, tight gap, more children than columns: the grid wraps to a second row. */
export const Wrapping = () => (
  <Grid columns={2} gap="tight">
    <Card>
      <Text>one</Text>
    </Card>
    <Card>
      <Text>two</Text>
    </Card>
    <Card>
      <Text>three</Text>
    </Card>
    <Card>
      <Text>four</Text>
    </Card>
  </Grid>
)
