'use client'

import { useListLegalEntities, useOnboardEmployee } from '@xforge/api-client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toWriteOutcome, type WriteOutcome, writeOutcomeOf } from '../resource-state'
import { OnboardForm, type OnboardValues } from './onboard-form'

/**
 * The connected onboarding screen.
 *
 * TRANSPORT ENDS HERE. This file may name react-query and the generated client;
 * `OnboardForm` may not, and it is handed values, an outcome and a callback.
 *
 * The employer list is read rather than typed: an employer is an id, and a form
 * that asked a person to type a uuid would be a form nobody could complete. A
 * failed list leaves the Combobox empty, which is a state the form renders
 * honestly rather than pretending there are no employers.
 */
const EMPTY: OnboardValues = {
  effectiveFrom: '',
  employeeNumber: '',
  fullName: '',
  jobTitle: '',
  legalEntityId: null,
  payBasis: 'monthly',
  preferredName: '',
}

export function OnboardScreen() {
  const router = useRouter()
  const [values, setValues] = useState<OnboardValues>(EMPTY)
  const entities = useListLegalEntities()

  const create = useOnboardEmployee({
    mutation: {
      onSuccess: (created) => {
        // Straight to the record that now exists, at the day employment begins
        // -- the date the server echoed, never one this screen recomputed.
        router.push(`/employees/${created.employee.employeeId}?asOf=${created.asOf}`)
      },
    },
  })

  const outcome: WriteOutcome = toWriteOutcome(writeOutcomeOf(create.status, create.error))

  return (
    <OnboardForm
      entities={(entities.data?.items ?? []).map((e) => ({ id: e.id, name: e.name }))}
      onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
      onSubmit={() =>
        create.mutate({
          data: {
            effectiveFrom: values.effectiveFrom,
            employeeNumber: values.employeeNumber,
            fullName: values.fullName,
            jobTitle: values.jobTitle,
            // Guarded by the contract, which requires both; an unselected
            // employer reaches the server as an empty string and is refused
            // there rather than being silently defaulted here.
            legalEntityId: values.legalEntityId ?? '',
            payBasis: (values.payBasis ?? 'monthly') as 'daily' | 'hourly' | 'monthly',
            preferredName: values.preferredName === '' ? null : values.preferredName,
          },
        })
      }
      outcome={outcome}
      values={values}
    />
  )
}
