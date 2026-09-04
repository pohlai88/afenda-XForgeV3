/**
 * The experience boundary: transport vocabulary in, experience vocabulary out.
 *
 * This is the only place that knows both. Above it, `@xforge/design` sees
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
 * WHEN THE THROW FIRES, AND WHO CATCHES IT. The API is mounted inside this app
 * at `app/api/[[...route]]/route.ts`: one build, one process, so client and
 * server cannot version-skew independently and there is no permanently-old
 * client. The residual window is a tab already open across a rolling deploy --
 * bounded, minutes -- in which a server emitting a new reason code meets a
 * mapper that refuses it. Refusing is the right trade there, because the
 * alternative weakens the model permanently to cover a transient window.
 *
 * But it relocates the risk rather than removing it: this function is pure and
 * runs during render, so an unhandled throw takes the tree, not the list. The
 * containment is an error boundary resolving to the `error` state, and that is
 * a RENDERING concern owned by 4C -- named here so it is a scheduled decision
 * rather than a surprise.
 *
 * THE TWO VOCABULARIES ARE NOT MIRRORED, deliberately. The transport may grow
 * `redacted` and `enrichment_unavailable`; both would still be `partial` here,
 * differing only in the reason shown. The experience layer describes what a
 * person sees, not what happened in a datastore.
 *
 */
import type { Completeness, PartialReason } from '@xforge/api-client'
import { ApiProblem } from '@xforge/api-client'

/*
 * THE EXPERIENCE VOCABULARY LIVES HERE, BESIDE ITS ONLY PRODUCER. It sat in the
 * design package until ae4e294; no component ever read it, and this screen is
 * its one consumer. It moves back to `@xforge/design` the day a component
 * needs it (law 31), not before.
 */

/** Why a read is incomplete, in terms a person could be told. */
export interface UiPartialReason {
  kind: 'truncated'
  limit: number
  shown: number
}

/**
 * A condition preventing progress. `retryable` decides whether a retry control
 * appears at all -- offering one for a permission failure teaches people the
 * button is decorative. `detail?: string | undefined` is deliberate under
 * `exactOptionalPropertyTypes`: the mapper reads it off an ApiProblem that may
 * not carry one.
 */
export interface UiProblem {
  code: 'forbidden' | 'unavailable'
  detail?: string | undefined
  retryable: boolean
  title: string
}

/** Competing valid realities that need a decision -- NOT a failure (ADR-013). */
export interface UiConflict {
  detail?: string
  kind: 'stale-version'
  title: string
}

/**
 * The state of a READ. `conflict` is deliberately absent: a read cannot be in
 * conflict, a write can, and folding it in would give every reader a case it
 * can never produce.
 */
export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; data: T }
  | { status: 'partial'; data: T; reasons: UiPartialReason[] }
  | { status: 'forbidden'; issue: UiProblem }
  | { status: 'error'; issue: UiProblem }

/** The outcome of a WRITE. Separate from a read: a failed write leaves the user holding an edit. */
export type WriteOutcome =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'conflict'; conflict: UiConflict }
  | { status: 'failed'; issue: UiProblem }

/**
 * Did the read produce an answer? TRUE for `empty` too: adding the first record
 * is the entire point of that state. A write control beneath an unsuccessful
 * read offers an action whose result the caller cannot see.
 */
export function readSucceeded<T>(state: ResourceState<T>): boolean {
  switch (state.status) {
    case 'empty':
    case 'ready':
    case 'partial':
      return true
    case 'loading':
    case 'forbidden':
    case 'error':
      return false
    default:
      return assertNever(state, 'resource state')
  }
}

/** Refuse a value the type system believes impossible, so a new member stops the build. */
export function assertNever(value: never, context: string): never {
  throw new Error(`${context}: unhandled ${JSON.stringify(value)}`)
}

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
    case 'complete':
      // Empty is NOT partial-with-nothing and NOT a failure. It asks the user to
      // create the first record; the other two ask them to wait or to retry.
      return items.length === 0 ? { status: 'empty' } : { data: items, status: 'ready' }
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

/**
 * A bounded-read query's status becomes a `ReadOutcome`.
 *
 * LIFTED HERE WHEN THE SECOND SCREEN NEEDED IT, not before. This lived inside
 * `use-emergency-contacts.ts` while one screen existed, which was right: one
 * caller is not evidence of a shared concern (law 31). The employee directory
 * is the second, and it consumes the same envelope -- `{ items, meta }` with a
 * completeness marker -- from a different operation. Copying nine lines into
 * the new hook would have been the cheapest possible way to acquire a second
 * source for "what does a succeeded-but-bodyless response mean", and the two
 * copies would have agreed until one of them learnt about a new state.
 *
 * Generic in the item, because that is the only thing that differs. Every
 * bounded read in this API returns the same shape by construction: the
 * completeness envelope is one schema in the contract, not one per operation.
 */
export function readOutcomeOf<T>(
  status: 'error' | 'pending' | 'success',
  error: unknown,
  data: { items: T[]; meta: Completeness } | undefined,
): ReadOutcome<T> {
  switch (status) {
    case 'pending':
      return { kind: 'pending' }
    case 'error':
      return { error, kind: 'failed' }
    case 'success':
      // `data` is defined when the query succeeded; the envelope carries the
      // completeness a screen would otherwise have to infer from a count.
      return data
        ? { items: data.items, kind: 'succeeded', meta: data.meta }
        : { error: new Error('succeeded with no body'), kind: 'failed' }
    default:
      return assertNever(status, 'query status')
  }
}

/**
 * A mutation's status becomes a `MutationOutcome`.
 *
 * LIFTED WHEN THE SECOND WRITE SCREEN NEEDED IT, exactly as `readOutcomeOf` was
 * (law 31). It lived inside `use-emergency-contacts.ts` while one screen wrote
 * anything; onboarding is the second, and the alternative was a nested ternary
 * in the new screen doing the same mapping with no `assertNever` behind it --
 * which is how a library adding a fifth status becomes a silent `idle` rather
 * than a build failure.
 *
 * react-query's status is a closed union, so this is where the four write
 * outcomes stop being a restatement of a library's states and start having a
 * producer in this repository.
 */
export function writeOutcomeOf(
  status: 'error' | 'idle' | 'pending' | 'success',
  error: unknown,
): MutationOutcome {
  switch (status) {
    case 'idle':
      return { kind: 'idle' }
    case 'pending':
      return { kind: 'saving' }
    case 'success':
      return { kind: 'saved' }
    case 'error':
      return { error, kind: 'failed' }
    default:
      return assertNever(status, 'mutation status')
  }
}
