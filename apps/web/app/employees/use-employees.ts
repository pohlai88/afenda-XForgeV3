/**
 * The one place that decides what the employee directory is looking at.
 *
 * TRANSPORT ENDS HERE. This file may name react-query and the generated client;
 * the component may not, and a guard enforces that rather than a convention.
 *
 * NO WRITES. The directory reads; onboarding and transfer are commands
 * (law 17) and arrive with their own outcomes. There is deliberately no
 * `WriteOutcome` in this view: a screen handed one it can never produce would
 * grow a branch nothing reaches, which is the same defect as a vocabulary
 * member with no producer.
 */
import { type EmployeeSummary, useListEmployees } from '@xforge/api-client'
import { type ResourceState, readOutcomeOf, toResourceState } from './resource-state'

export type DirectoryEntry = EmployeeSummary

export interface EmployeeDirectoryView {
  /**
   * THE DATE THE SERVER RESOLVED AT, echoed back, and null until it answers.
   *
   * Not the date this hook asked for. Those are the same value today and the
   * distinction is the entire reason the contract echoes it: what a person is
   * looking at is what the server resolved, and a screen that displays its own
   * REQUEST is displaying an assumption. It reads as a fact and stops being one
   * the first time a caller is redirected, a parameter is clamped, or a cached
   * response arrives from a different question.
   */
  asOf: string | null
  employees: ResourceState<DirectoryEntry[]>
  retry: () => void
}

export function useEmployees(asOf: string, legalEntityId?: string): EmployeeDirectoryView {
  // `exactOptionalPropertyTypes`: an explicit `legalEntityId: undefined` is not
  // the same as an absent one, and the generated params type says so.
  const list = useListEmployees({ asOf, ...(legalEntityId ? { legalEntityId } : {}) })

  return {
    asOf: list.data?.asOf ?? null,
    employees: toResourceState(readOutcomeOf(list.status, list.error, list.data)),
    retry: () => {
      list.refetch()
    },
  }
}
