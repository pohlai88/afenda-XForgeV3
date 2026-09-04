'use client'

import { useGetEmployee, useListLegalEntities, useTransferEmployee } from '@xforge/api-client'
import { Status } from '@xforge/design/components/status'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toWriteOutcome, type WriteOutcome, writeOutcomeOf } from '../../resource-state'
import { TransferForm, type TransferValues } from './transfer-form'

/**
 * The connected transfer screen.
 *
 * TRANSPORT ENDS HERE. `TransferForm` is handed a subject, values and an
 * outcome and names no client.
 *
 * IT READS THE SUBJECT RATHER THAN TAKING IT FROM THE URL. Who is being moved
 * and which employer they are leaving are facts the server owns; a screen that
 * accepted them as query parameters would let a stale link transfer somebody
 * out of an employer they left last month.
 *
 * `asOf` for that read is the TRANSFER DATE once one is chosen, so the "current"
 * employer shown is the one that holds them on the day of the move -- not the
 * one holding them today, which is a different question whenever the date is
 * backdated.
 */
export function TransferScreen({ asOf, employeeId }: { asOf: string; employeeId: string }) {
  const router = useRouter()
  const [values, setValues] = useState<TransferValues>({
    effectiveFrom: '',
    employeeNumber: '',
    jobTitle: '',
    payBasis: 'monthly',
    toLegalEntityId: null,
  })

  const on = values.effectiveFrom || asOf
  const employee = useGetEmployee(employeeId, { asOf: on })
  const entities = useListLegalEntities()

  const move = useTransferEmployee({
    mutation: {
      onSuccess: (created) => {
        router.push(`/employees/${created.employee.employeeId}?asOf=${created.asOf}`)
      },
    },
  })

  const outcome: WriteOutcome = toWriteOutcome(writeOutcomeOf(move.status, move.error))

  const record = employee.data?.employee
  if (!record) {
    // The subject is the whole premise of this screen: without it there is
    // nothing to transfer and no employer to name, so the form is not rendered
    // in a half-known state.
    return <Status data-testid="loading">Loading the employee…</Status>
  }

  return (
    <TransferForm
      entities={(entities.data?.items ?? []).map((e) => ({ id: e.id, name: e.name }))}
      onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
      onSubmit={() =>
        move.mutate({
          data: {
            effectiveFrom: values.effectiveFrom,
            employeeNumber: values.employeeNumber,
            jobTitle: values.jobTitle,
            payBasis: (values.payBasis ?? 'monthly') as 'daily' | 'hourly' | 'monthly',
            toLegalEntityId: values.toLegalEntityId ?? '',
          },
          employeeId,
        })
      }
      outcome={outcome}
      subject={{
        currentJobTitle: record.employment?.jobTitle ?? null,
        fromLegalEntityId: record.legalEntity.id,
        fromLegalEntityName: record.legalEntity.name,
        fullName: record.fullName,
      }}
      values={values}
    />
  )
}
