import { DateInput, Field, Stack } from '@xforge/design'

/**
 * DateInput previews.
 *
 * A business date, never an instant. The control displays in the reader's locale
 * — a Malaysian reader sees 16/03/2026 — while the value stays `YYYY-MM-DD` on
 * both sides. That split is the platform's, and adopting it is most of the
 * reason this component is nine lines rather than a picker.
 *
 * There is no "today" preview, deliberately: a civil date derives from the
 * owning legal entity's IANA zone, which a component cannot know and must not
 * guess.
 */

/** Empty, and carrying a date. */
export const EmptyAndFilled = () => (
  <Stack gap="normal">
    <DateInput aria-label="Effective from, empty" />
    <DateInput aria-label="Effective from, filled" defaultValue="2026-03-16" />
  </Stack>
)

export const Disabled = () => (
  <DateInput aria-label="Effective from" defaultValue="2024-04-01" disabled />
)

/**
 * A half-open period, which is why `min` is adopted: an end may not precede its
 * start, and the platform enforces that with no validation library. The end is
 * EXCLUSIVE, so a same-day joiner-leaver is [2026-03-03, 2026-03-04).
 */
export const APeriod = () => (
  <Stack direction="row" gap="normal">
    <Field description="The first day of the period." label="Effective from">
      <DateInput defaultValue="2026-03-03" />
    </Field>
    <Field description="Exclusive: the day after the last day worked." label="Effective to">
      <DateInput defaultValue="2026-03-04" min="2026-03-03" />
    </Field>
  </Stack>
)

/** Rejected by the server, not the platform: an overlap only it can see. */
export const Invalid = () => (
  <Field
    description="The first day of the period."
    error="This overlaps an existing period at Afenda Sdn Bhd (2024-04-01 to 2025-04-01)."
    label="Effective from"
  >
    <DateInput defaultValue="2024-06-01" />
  </Field>
)
