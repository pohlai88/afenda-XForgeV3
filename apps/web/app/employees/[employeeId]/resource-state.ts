/**
 * The experience boundary: transport vocabulary in, experience vocabulary out.
 *
 * This is the only place that knows both. Above it, `@xforge/ui` sees
 * `ResourceState` and has never heard of a completeness envelope, an HTTP
 * status or an RFC 9457 problem -- a guard enforces that. Below it, the API
 * says what it KNOWS; here is where that becomes what a person can be TOLD.
 *
 * NO FORGIVING DEFAULT ANYWHERE. Every switch ends in `assertNever`, so adding
 * a wire code stops the build and forces somebody to decide what it means for a
 * user. A `default` returning a generic error is a producer for a state nobody
 * chose to produce -- the producer rule violated by omission rather than by
 * declaration, and the quietest way for a speculative ontology to arrive.
 *
 * THE TWO VOCABULARIES ARE NOT MIRRORED, deliberately. The transport may grow
 * `redacted` and `enrichment_unavailable`; both would still be `partial` here,
 * differing only in the reason shown. The experience layer describes what a
 * person sees, not what happened in a datastore.
 *
 * ON THE SUPPRESSIONS BELOW. orval emits its string enums as
 * `typeof Code[keyof typeof Code]` over a `const` object. Biome's type
 * inference resolves that to `never` and reports every `case` as unreachable;
 * tsc resolves it to the literal union, and tsc is the one that is right --
 * `assertNever` type-checks only BECAUSE the cases narrow the union to nothing,
 * so if Biome were correct this file would not compile. Two tools, one fact,
 * disagreeing: suppressed at each site rather than file-wide, so the blindness
 * stays where the evidence for it is and does not silently spread.
 */
import type { Completeness, PartialReason } from '@xforge/api-client'
import { ApiProblem } from '@xforge/api-client'
import {
  assertNever,
  type ResourceState,
  type UiPartialReason,
  type UiProblem,
  type WriteOutcome,
} from '@xforge/ui/state'

/**
 * What a read can report, stated as a closed union.
 *
 * Taken as an explicit value rather than a query object, so the mapping is a
 * pure function of what happened and can be exercised without a fetch layer.
 */
export type ReadOutcome<T> =
  | { kind: 'pending' }
  | { kind: 'failed'; error: unknown }
  | { kind: 'succeeded'; items: T[]; meta: Completeness }

/** A transport reason becomes something a person could be told. */
function toUiReason(reason: PartialReason): UiPartialReason {
  switch (reason.code) {
    // biome-ignore lint/suspicious/noUnnecessaryConditions: generated enum, see header
    case 'result_cap':
      return { kind: 'truncated', limit: reason.limit, shown: reason.returned }
    default:
      return assertNever(reason.code, 'partial reason')
  }
}

/**
 * A failure becomes a problem, or stays unexplained.
 *
 * `retryable` is the field that earns its place: it decides whether a retry
 * control is offered at all, and offering one for a permission failure teaches
 * people the button is decorative.
 */
function toProblem(error: unknown): UiProblem {
  if (error instanceof ApiProblem && error.isForbidden) {
    return {
      code: 'forbidden',
      detail: error.problem.detail,
      retryable: false,
      title: 'You do not have access to this',
    }
  }
  return {
    code: 'unavailable',
    detail: error instanceof ApiProblem ? error.problem.detail : undefined,
    retryable: true,
    title: 'This could not be loaded',
  }
}

function toSucceeded<T>(items: T[], meta: Completeness): ResourceState<T[]> {
  switch (meta.completeness) {
    // biome-ignore lint/suspicious/noUnnecessaryConditions: generated enum, see header
    case 'complete':
      // Empty is NOT partial-with-nothing and NOT a failure. It asks the user to
      // create the first record; the other two ask them to wait or to retry.
      return items.length === 0 ? { status: 'empty' } : { data: items, status: 'ready' }
    // biome-ignore lint/suspicious/noUnnecessaryConditions: generated enum, see header
    case 'partial':
      return {
        data: items,
        reasons: (meta.partialReasons ?? []).map(toUiReason),
        status: 'partial',
      }
    default:
      return assertNever(meta.completeness, 'completeness')
  }
}

/** Transport read outcome -> experience state. */
export function toResourceState<T>(outcome: ReadOutcome<T>): ResourceState<T[]> {
  switch (outcome.kind) {
    case 'pending':
      return { status: 'loading' }
    case 'succeeded':
      return toSucceeded(outcome.items, outcome.meta)
    case 'failed': {
      const issue = toProblem(outcome.error)
      // Forbidden is its own state rather than an error carrying a code,
      // because nothing about it is retryable and the screen must not offer to
      // try again.
      return issue.code === 'forbidden'
        ? { issue, status: 'forbidden' }
        : { issue, status: 'error' }
    }
    default:
      return assertNever(outcome, 'read outcome')
  }
}

/** What a write can report. Separate from a read: its producers differ. */
export type MutationOutcome =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'failed'; error: unknown }

/**
 * Transport write outcome -> experience outcome.
 *
 * A stale write is a CONFLICT, not an error. ADR-013 refuses to merge it, and
 * the difference matters to the person holding the edit: an error says
 * something broke, a conflict says someone else changed this and here is what
 * to do about it.
 */
export function toWriteOutcome(outcome: MutationOutcome): WriteOutcome {
  switch (outcome.kind) {
    case 'idle':
      return { status: 'idle' }
    case 'saving':
      return { status: 'saving' }
    case 'saved':
      return { status: 'saved' }
    case 'failed':
      if (outcome.error instanceof ApiProblem && outcome.error.isVersionConflict) {
        return {
          conflict: {
            detail: 'Reloaded below — please re-apply your change.',
            kind: 'stale-version',
            title: 'Someone else changed this while you were editing',
          },
          status: 'conflict',
        }
      }
      return { issue: toProblem(outcome.error), status: 'failed' }
    default:
      return assertNever(outcome, 'mutation outcome')
  }
}
