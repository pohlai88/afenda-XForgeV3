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
import type { LegalEntityOption } from '../../new/onboard-form'
import type { WriteOutcome } from '../../resource-state'

/**
 * Transfer — moving a person between legal entities in the same group.
 *
 * -------------------------------------------------------------------------
 * THE SCREEN'S REAL JOB IS TRANSLATING A HALF-OPEN RANGE
 * -------------------------------------------------------------------------
 * The model stores `[from, to)`: transferring on the 16th means the old period
 * becomes `[.., 2026-03-16)` and the new one `[2026-03-16, ..)`. That is
 * correct, and it is not how anybody thinks. A person thinks "her last day at
 * Sdn Bhd A is the 15th".
 *
 * So the form asks for ONE date and then shows both readings back — the last
 * day at the old employer and the first at the new — in `TheBoundary` below.
 * Asking for two dates instead would be two facts that can disagree by one, and
 * the off-by-one is the sort nobody catches until a month has been paid twice
 * across a single date.
 *
 * -------------------------------------------------------------------------
 * IT SAYS WHAT THIS COSTS, BEFORE IT HAPPENS
 * -------------------------------------------------------------------------
 * A transfer is not an edit. It splits the month across two employers, so
 * payroll runs twice, statutory contributions are filed under two employer
 * numbers, and at year end the person receives two EA forms. Every one of those
 * is a consequence somebody may not have intended when they picked a date, and
 * none is visible from a form that only says "Transfer".
 *
 * The notice is `info`, not `warning`: nothing is wrong and nothing is being
 * risked. It is what this operation MEANS, and a warning tone here would cry
 * wolf on a screen that also has a real conflict state.
 *
 * Presentational, like the onboarding form: values, errors and an outcome in,
 * rendering out — so the refusals can be looked at without a database.
 */

export interface TransferValues {
  readonly effectiveFrom: string
  readonly employeeNumber: string
  readonly jobTitle: string
  readonly payBasis: string | null
  readonly toLegalEntityId: string | null
}

export type TransferFieldErrors = Partial<Record<keyof TransferValues, string>>

/** Who is moving, and from where. Read, never typed. */
export interface TransferSubject {
  readonly currentJobTitle: string | null
  readonly fromLegalEntityId: string
  readonly fromLegalEntityName: string
  readonly fullName: string
}

const PAY_BASIS_OPTIONS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Hourly', value: 'hourly' },
] as const

/**
 * The day before a business date, as `YYYY-MM-DD`.
 *
 * `Date.UTC` on the parsed parts, never `new Date(string)` — the latter is
 * parsed as UTC midnight and rendered in the runtime's zone, so subtracting a
 * day across a DST boundary can land on the same date it started. Both operands
 * are business dates with no instant attached and this keeps it that way.
 */
const dayBefore = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number)
  if (!(y && m && d)) {
    return ''
  }
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)
}

/**
 * The one thing this screen exists to make legible: which employer owns which
 * day. Rendered only once a date is chosen — before that there is no boundary
 * to describe, and a placeholder would be inventing one.
 */
function TheBoundary({
  date,
  from,
  to,
}: {
  readonly date: string
  readonly from: string
  readonly to: string | null
}) {
  if (!date) {
    return null
  }
  return (
    <Alert data-testid="boundary" tone="info">
      <Stack gap="tight">
        <Text>
          {from} pays up to and including {dayBefore(date)}.
        </Text>
        <Text>
          {to ?? 'The new employer'} pays from {date}.
        </Text>
        {/* The consequence, in the words a payroll administrator uses. */}
        <Text tone="muted">
          That month runs twice — once per employer, each against its own statutory registration —
          and the year ends in two EA forms.
        </Text>
      </Stack>
    </Alert>
  )
}

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
        {outcome.issue.detail ? <Text>{outcome.issue.detail}</Text> : null}
      </Alert>
    )
  }
  if (outcome.status === 'saved') {
    return (
      <Alert data-testid="saved" tone="success">
        <Text>Transferred. Their record at the new employer starts on the transfer date.</Text>
      </Alert>
    )
  }
  return null
}

export function TransferForm({
  entities,
  errors = {},
  onChange,
  onSubmit,
  outcome,
  subject,
  values,
}: {
  readonly entities: readonly LegalEntityOption[]
  readonly errors?: TransferFieldErrors
  readonly onChange: (patch: Partial<TransferValues>) => void
  readonly onSubmit: () => void
  readonly outcome: WriteOutcome
  readonly subject: TransferSubject
  readonly values: TransferValues
}) {
  const saving = outcome.status === 'saving'
  // Where they already are is not a destination. Removing it is better than
  // refusing it afterwards: the 422 exists because an API cannot trust a
  // client, not because a person should be able to pick it.
  const destinations = entities.filter((e) => e.id !== subject.fromLegalEntityId)
  const destinationName = destinations.find((e) => e.id === values.toLegalEntityId)?.name ?? null

  return (
    <Card aria-labelledby="transfer-heading">
      <Stack gap="loose">
        <Stack gap="tight">
          <Heading id="transfer-heading">Transfer {subject.fullName}</Heading>
          <Text tone="muted">
            Currently {subject.currentJobTitle ?? 'with no recorded job title'} at{' '}
            {subject.fromLegalEntityName}.
          </Text>
        </Stack>

        <WriteProblem outcome={outcome} />

        <Grid columns={4} gap="normal">
          <Field
            description="A different employer in this group."
            error={errors.toLegalEntityId}
            label="New employer"
            span={2}
          >
            <Combobox
              onValueChange={(toLegalEntityId) => onChange({ toLegalEntityId })}
              options={destinations.map((e) => ({ label: e.name, value: e.id }))}
              placeholder="Select an employer"
              value={values.toLegalEntityId}
            />
          </Field>
          <Field
            description="Their reference at the NEW employer."
            error={errors.employeeNumber}
            label="Employee number"
            span={2}
          >
            <TextInput
              onValueChange={(employeeNumber) => onChange({ employeeNumber })}
              placeholder="SG-0007"
              value={values.employeeNumber}
            />
          </Field>

          <Field error={errors.jobTitle} label="Job title" span={2}>
            <TextInput
              onValueChange={(jobTitle) => onChange({ jobTitle })}
              placeholder="Group Financial Controller"
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
            description="Their first day at the new employer."
            error={errors.effectiveFrom}
            label="Transfers on"
            span={1}
          >
            <DateInput
              onValueChange={(effectiveFrom) => onChange({ effectiveFrom })}
              value={values.effectiveFrom}
            />
          </Field>
        </Grid>

        <TheBoundary
          date={values.effectiveFrom}
          from={subject.fromLegalEntityName}
          to={destinationName}
        />

        <Stack direction="row">
          <Button disabled={saving} onClick={onSubmit}>
            {saving ? 'Transferring…' : 'Transfer'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  )
}
