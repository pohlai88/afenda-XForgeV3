import { Card, Heading, Stack, Text } from '@xforge/design'

/**
 * Card previews.
 *
 * Card owns no axis and carries neither a recipe nor a contract — it is the
 * bounded surface a section sits on, and the caller names it. Upstream ships
 * seven parts; only the root is adopted, so only the root is shown.
 *
 * One thing these cards teach about the primitive: Card sets no width of its
 * own, so inside a row it shrinks to its content. Give a side-by-side pair
 * enough content to hold its width, or lay them out in a column.
 */

/** The plain surface: a labelled region around content. */
export const Surface = () => (
  <Card aria-labelledby="contacts-heading">
    <Stack gap="tight">
      <Heading id="contacts-heading" level={2}>
        Emergency contacts
      </Heading>
      <Text tone="muted">Two contacts on file.</Text>
    </Stack>
  </Card>
)

/** A card carrying a short summary — the shape a dashboard tile takes. */
export const WithFigure = () => (
  <Card>
    <Stack gap="tight">
      <Text tone="muted" variant="label">
        Employees on payroll
      </Text>
      <Text variant="display">1,284</Text>
      <Text tone="success">+18 since last run</Text>
    </Stack>
  </Card>
)

/** Two cards in a row, each carrying enough content to hold its own width. */
export const SideBySide = () => (
  <Stack direction="row" gap="normal">
    <Card>
      <Stack gap="tight">
        <Text tone="muted" variant="label">
          Malaysia
        </Text>
        <Text variant="display">642</Text>
        <Text tone="muted">Employees on payroll this period</Text>
      </Stack>
    </Card>
    <Card>
      <Stack gap="tight">
        <Text tone="muted" variant="label">
          Singapore
        </Text>
        <Text variant="display">411</Text>
        <Text tone="muted">Employees on payroll this period</Text>
      </Stack>
    </Card>
  </Stack>
)
