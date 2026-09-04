'use client'

import { Alert } from '@xforge/design/components/alert'
import { Button } from '@xforge/design/components/button'
import { Card } from '@xforge/design/components/card'
import { Combobox } from '@xforge/design/components/combobox'
import { DateInput } from '@xforge/design/components/date-input'
import { Field } from '@xforge/design/components/field'
import { Grid } from '@xforge/design/components/grid'
import { Heading } from '@xforge/design/components/heading'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import { TextInput } from '@xforge/design/components/text-input'
import type { WriteOutcome } from '../resource-state'

/**
 * Onboarding — the first form in the product, and the first write a person makes.
 *
 * -------------------------------------------------------------------------
 * ONE FORM, BECAUSE IT IS ONE OPERATION
 * -------------------------------------------------------------------------
 * It creates a person, an employee at a legal entity and their first employment
 * period. Every HR product splits this into a wizard — "personal details",
 * "employment details", "confirm" — and the split is a lie about the
 * transaction: the three rows commit together or not at all, so a stepper that
 * lets somebody finish step one and walk away is describing a state the
 * database will never hold. Seven fields do not need three screens.
 *
 * -------------------------------------------------------------------------
 * THE EFFECTIVE DATE IS A FIELD, NOT A SUBMISSION TIMESTAMP
 * -------------------------------------------------------------------------
 * It is the single most consequential value here and the one every other
 * product infers from `now()`. Somebody onboarded on the 3rd who started on the
 * 1st is two days of pay, and the difference between the date typed and the
 * date recorded is what the dashboard's "recorded after the fact" panel reads.
 * So it is asked for, it is required, and the hint says which day it means.
 *
 * -------------------------------------------------------------------------
 * WIDTHS CARRY MEANING
 * -------------------------------------------------------------------------
 * A full name is long and an employee number is short, and a form where both
 * are the same width tells a reader the two are equally weighty. The spans put
 * the identity row first at 3+1, then the employment row — this is the layout
 * DNA taken from shadcn-studio's form-layout and normalised into `Field`'s
 * `span` axis rather than into class literals at each call site.
 *
 * Presentational: it is handed values, errors and an outcome, and renders them.
 * Every state below — a conflict on the employee number, a saving button, a
 * refused entity — can therefore be put on screen without a database.
 */

export interface OnboardValues {
  readonly effectiveFrom: string
  readonly employeeNumber: string
  readonly fullName: string
  readonly jobTitle: string
  readonly legalEntityId: string | null
  readonly payBasis: string | null
  readonly preferredName: string
}

/** Per-field messages the SERVER produced. Keyed by the field they belong to. */
export type OnboardFieldErrors = Partial<Record<keyof OnboardValues, string>>

export interface LegalEntityOption {
  readonly id: string
  readonly name: string
}

const PAY_BASIS_OPTIONS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Hourly', value: 'hourly' },
] as const

/**
 * The banner for a refused write. Its words come from the mapper, not here —
 * the same rule the emergency-contacts screen follows.
 */
function WriteProblem({ outcome }: { outcome: WriteOutcome }) {
  if (outcome.status === 'conflict') {
    return (
      <Alert data-testid="conflict" tone="warning">
        <Stack gap="tight">
          <Text>{outcome.conflict.title}</Text>
          {outcome.conflict.detail ? <Text>{outcome.conflict.detail}</Text> : null}
        </Stack>
      </Alert>
    )
  }
  if (outcome.status === 'failed') {
    return (
      <Alert data-testid="write-failed" tone="danger">
        <Text>{outcome.issue.title}</Text>
      </Alert>
    )
  }
  if (outcome.status === 'saved') {
    return (
      <Alert data-testid="saved" tone="success">
        <Text>Onboarded. They appear in the directory from their start date.</Text>
      </Alert>
    )
  }
  return null
}

export function OnboardForm({
  entities,
  errors = {},
  onChange,
  onSubmit,
  outcome,
  values,
}: {
  readonly entities: readonly LegalEntityOption[]
  readonly errors?: OnboardFieldErrors
  readonly onChange: (patch: Partial<OnboardValues>) => void
  readonly onSubmit: () => void
  readonly outcome: WriteOutcome
  readonly values: OnboardValues
}) {
  const saving = outcome.status === 'saving'

  return (
    <Card aria-labelledby="onboard-heading">
      <Stack gap="loose">
        <Stack gap="tight">
          <Heading id="onboard-heading">Onboard an employee</Heading>
          <Text tone="muted">
            Creates the person, their record at the employer, and the employment period payroll runs
            on — together, or not at all.
          </Text>
        </Stack>

        <WriteProblem outcome={outcome} />

        <Grid columns={4} gap="normal">
          <Field error={errors.fullName} label="Full name" span={3}>
            <TextInput
              autoComplete="name"
              onValueChange={(fullName) => onChange({ fullName })}
              placeholder="Siti binti Rahman"
              value={values.fullName}
            />
          </Field>
          <Field
            description="Unique at this employer."
            error={errors.employeeNumber}
            label="Employee number"
            span={1}
          >
            <TextInput
              onValueChange={(employeeNumber) => onChange({ employeeNumber })}
              placeholder="MY-0001"
              value={values.employeeNumber}
            />
          </Field>

          <Field
            description="Only if it differs from the legal name."
            error={errors.preferredName}
            label="Preferred name"
            span={2}
          >
            <TextInput
              onValueChange={(preferredName) => onChange({ preferredName })}
              placeholder="Siti"
              value={values.preferredName}
            />
          </Field>
          {/*
            The employer of record, not a department. It decides the statutory
            registrations this person is filed under and the civil calendar every
            date on their record resolves in, which is why it is a required
            choice and not a default.
          */}
          <Field
            description="Decides the statutory registrations and the payroll calendar."
            error={errors.legalEntityId}
            label="Employer"
            span={2}
          >
            <Combobox
              onValueChange={(legalEntityId) => onChange({ legalEntityId })}
              options={entities.map((e) => ({ label: e.name, value: e.id }))}
              placeholder="Select an employer"
              value={values.legalEntityId}
            />
          </Field>

          <Field error={errors.jobTitle} label="Job title" span={2}>
            <TextInput
              onValueChange={(jobTitle) => onChange({ jobTitle })}
              placeholder="Payroll Manager"
              value={values.jobTitle}
            />
          </Field>
          <Field error={errors.payBasis} label="Paid" span={1}>
            <Combobox
              onValueChange={(payBasis) => onChange({ payBasis })}
              options={[...PAY_BASIS_OPTIONS]}
              placeholder="Monthly"
              value={values.payBasis}
            />
          </Field>
          <Field
            description="Their first day, not today."
            error={errors.effectiveFrom}
            label="Starts"
            span={1}
          >
            <DateInput
              onValueChange={(effectiveFrom) => onChange({ effectiveFrom })}
              value={values.effectiveFrom}
            />
          </Field>
        </Grid>

        <Stack direction="row">
          {/*
            Disabled only while the write is in flight, never on "the form looks
            incomplete". A submit button that greys itself out cannot say WHY,
            so the person is left hunting; the server answers, and the answers
            land on the fields that caused them.
          */}
          <Button disabled={saving} onClick={onSubmit}>
            {saving ? 'Onboarding…' : 'Onboard'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  )
}
