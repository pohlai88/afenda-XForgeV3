import { Field, Grid, Stack, TextInput } from '@xforge/design'

/**
 * Field previews.
 *
 * Field is the only authored component that names something it rendered BY
 * REFERENCE: the label's `for` and the control's `aria-describedby` are ids Base
 * UI generates, so a screen never writes one and two can never disagree.
 *
 * The label is a required STRING, not an optional node. Every unlabelled input
 * in this industry began as an optional label prop, and every placeholder-as-label
 * began with somebody deciding the design looked cleaner without one.
 */

/** Label and control, which is the whole of the common case. */
export const Labelled = () => (
  <Field label="Job title">
    <TextInput placeholder="Payroll Manager" />
  </Field>
)

/** A hint that says what to enter, before anyone has entered anything. */
export const Described = () => (
  <Field description="Unique within the employer, not across the group." label="Employee number">
    <TextInput placeholder="MY-0001" />
  </Field>
)

/**
 * Both at once — the state a single `helperText` prop cannot express. The rule
 * stays on screen when the complaint arrives, because that is the moment the
 * person needs the rule most.
 */
export const DescribedAndInvalid = () => (
  <Field
    description="Unique within the employer, not across the group."
    error="MY-0001 already belongs to Siti binti Rahman at this employer."
    label="Employee number"
  >
    <TextInput defaultValue="MY-0001" />
  </Field>
)

/** Disabled: the control refuses the caret and the field says why. */
export const Disabled = () => (
  <Field description="Set by the employment period; change it there." disabled label="Job title">
    <TextInput defaultValue="Payroll Manager" />
  </Field>
)

/** Several together — the shape every command surface in this product will take. */
export const InAForm = () => (
  <Stack gap="normal">
    <Field label="Full name">
      <TextInput autoComplete="name" placeholder="Siti binti Rahman" />
    </Field>
    <Field description="Unique within the employer, not across the group." label="Employee number">
      <TextInput placeholder="MY-0001" />
    </Field>
    <Field description="What this person is called, if it differs." label="Preferred name">
      <TextInput placeholder="Siti" />
    </Field>
  </Stack>
)

/**
 * A form is a grid of MIXED widths: an employee number is short, a full name is
 * long. `Grid` owns equal tracks, so two-of-four is unsayable there — the span
 * belongs to the field. Inspired by shadcn-studio's form-layout, which writes
 * the same idea as `sm:col-span-2` at twenty-one call sites.
 */
export const MixedWidthRow = () => (
  <Grid columns={4} gap="normal">
    <Field description="Unique within the employer." label="Employee number" span={1}>
      <TextInput placeholder="MY-0001" />
    </Field>
    <Field label="Full name" span={3}>
      <TextInput autoComplete="name" placeholder="Siti binti Rahman" />
    </Field>
  </Grid>
)
