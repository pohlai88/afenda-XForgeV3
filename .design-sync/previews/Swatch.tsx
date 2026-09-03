import { Stack, Swatch } from '@xforge/design'

/**
 * Swatch previews — one colour role shown as itself.
 *
 * A fill carries its companion ink on a sample glyph, so the pair is judged together; a
 * fill with no companion wears the page ink, which is what text on it will wear; a stroke
 * is drawn round the page ground in its own colour. Fills that exist only under a state
 * (checked, disabled, highlighted) are not swatch roles: the components that own them
 * show them.
 */

/** The action fills, side by side. */
export const Actions = () => (
  <Stack direction="row" gap="normal">
    <Swatch colour="accent.primary" />
    <Swatch colour="surface.lowest" />
    <Swatch colour="accent.primaryContainer" />
    <Swatch colour="error.default" />
  </Stack>
)

/** The status tints, which carry meaning and so must stay readable. */
export const Statuses = () => (
  <Stack direction="row" gap="normal">
    <Swatch colour="status.info" />
    <Swatch colour="status.success" />
    <Swatch colour="status.warning" />
    <Swatch colour="error.container" />
  </Stack>
)

/** Surfaces and a stroke: the ground, the card on it, and the hairline between them. */
export const Surfaces = () => (
  <Stack direction="row" gap="normal">
    <Swatch colour="surface.default" />
    <Swatch colour="surface.lowest" />
    <Swatch colour="surface.container" />
    <Swatch colour="outline.variant" />
  </Stack>
)
