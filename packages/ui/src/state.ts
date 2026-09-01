/**
 * The experience state vocabulary.
 *
 * What the application can truthfully present, which is NOT the same question
 * as what the producer knows. The transport says `completeness: 'partial'` with
 * a `result_cap` reason and two numbers; this says a list is usable but
 * incomplete. Mapping between them is a decision, and it belongs at the
 * experience boundary rather than here or in the transport.
 *
 * NO TRANSPORT VOCABULARY ENTERS THIS FILE. No generated client types, no
 * envelope, no HTTP status, no RFC 9457 `Problem`. `@xforge/ui` sits at the
 * bottom of the dependency direction and importing upward would make every
 * component know how its data arrived -- and would mean a new wire code obliged
 * a UI change. A guard enforces it; this comment only explains it.
 *
 * EVERY MEMBER HAS A PRODUCER. That is the rule this project arrived at the
 * hard way: `partial` sat in a planned union for weeks with nothing able to
 * construct it, and three separate defects this session were vocabulary that
 * type-checked, validated and rendered while no code path produced it. Each
 * member below names what makes it.
 */

/**
 * Why a representation is incomplete, in terms a person could be told.
 *
 * ONE KIND, because one producer exists: a bounded read that hit its cap.
 * `enrichment_unavailable` and `redacted` are plausible and absent -- they land
 * with the sources that can report them.
 *
 * `shown` and `limit`, never a total. The server does not count what it did not
 * fetch, so "100 of 173" would be a number nobody measured.
 */
export interface UiPartialReason {
  kind: 'truncated'
  limit: number
  shown: number
}

/**
 * A condition preventing normal progress.
 *
 * Deliberately modest. `severity`, `category`, `origin`, `httpStatus`,
 * `correlationId` and the rest of the usual ontology are absent because nothing
 * produces or reads them -- the same reason `available: 173` was refused from
 * the wire envelope. A field nobody produces is an undocumented second
 * contract.
 *
 *   forbidden    the API refused on policy grounds (403)
 *   unavailable  the read failed and nothing more specific is known
 *
 * `retryable` is the one thing every consumer actually needs, because it
 * decides whether a retry control appears at all. Offering "Try again" for a
 * permission failure teaches people the button is decorative.
 */
export interface UiProblem {
  code: 'forbidden' | 'unavailable'
  detail?: string
  retryable: boolean
  title: string
}

/**
 * Competing valid realities that need a decision -- NOT a failure.
 *
 * Deliberately asymmetrical with `UiProblem`, and richer, because the two
 * answer different questions. A problem answers "why can I not proceed"; a
 * conflict answers "what changed, and what can I do about it". Forcing them
 * into one shape for symmetry would flatten that distinction and produce a 409
 * rendered as an error message.
 *
 * `stale-version` is the only kind, and its producer is a 409 from a write
 * carrying a version token the server has moved past (ADR-013).
 */
export interface UiConflict {
  detail?: string
  kind: 'stale-version'
  title: string
}

/**
 * The state of a READ.
 *
 * Six members, and the seventh is deliberately absent: `conflict` is not a
 * state a read can be in. It is the outcome of a WRITE whose version token was
 * stale, and the screen already models it that way -- a banner above a list
 * that is itself perfectly `ready`. Folding it in here would make every reader
 * carry a case it can never produce, which is exactly the modelling error the
 * producer rule exists to catch. It lives in `WriteOutcome` instead.
 *
 *   loading    the request is in flight
 *   empty      the read succeeded, completely, and there is nothing
 *   ready      the read succeeded, completely, and there is something
 *   partial    the read succeeded and says it is incomplete
 *   forbidden  the read was refused on policy grounds
 *   error      the read failed
 *
 * `empty` is distinct from `partial` with nothing shown, and from `error`. They
 * demand different things of a person: create the first record, wait or narrow
 * the request, or retry. One component with three strings cannot say that.
 */
export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; data: T }
  | { status: 'partial'; data: T; reasons: UiPartialReason[] }
  | { status: 'forbidden'; issue: UiProblem }
  | { status: 'error'; issue: UiProblem }

/**
 * The outcome of a WRITE.
 *
 * Separate from `ResourceState` because its producers are different and its
 * consequences are different: a read that fails shows nothing, a write that
 * fails leaves the user holding an edit.
 */
export type WriteOutcome =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'conflict'; conflict: UiConflict }
  | { status: 'failed'; issue: UiProblem }

/**
 * Refuse a value the type system believes impossible.
 *
 * Used as the final branch of every mapper, so that a new producer vocabulary
 * stops the build rather than being absorbed. A `default` returning something
 * generic is a producer for a state nobody decided to produce -- the rule
 * violated by omission instead of by declaration.
 */
export function assertNever(value: never, context: string): never {
  throw new Error(`${context}: unhandled ${JSON.stringify(value)}`)
}
