/**
 * Response shapes that belong to no single entity.
 *
 * These sat in `routes.ts` beside the emergency-contact operations, which was
 * correct while the module had one entity and became a second-source hazard the
 * moment it had two: an employee read needs the same completeness envelope and
 * the same problem shape, and the cheap way to get them is to retype them.
 * Extracted rather than copied, and re-exported from `routes.ts` so
 * `@xforge/hr/contract` keeps serving the names it already served.
 *
 * They are HR-shaped only by accident of living here. When a second module
 * lands they move to a platform package -- not before, because one module is
 * not evidence that an abstraction is general (law 31).
 */
import { z } from '@hono/zod-openapi'

/**
 * Why a representation is INCOMPLETE, structurally rather than in prose.
 *
 * Codes and numbers, never a sentence. A user-facing message here would put the
 * wording in the transport, where it cannot be localised, cannot be varied by
 * surface, and makes the API responsible for a decision the experience layer
 * owns. The mapper turns these into something a person reads.
 *
 * A LIST, not a single reason. A bounded read that hit its cap while an
 * enrichment source was also unavailable is one response with two independently
 * meaningful degradations, and a precedence rule would silently discard one of
 * them. `enrichment_unavailable` is deliberately NOT defined yet: nothing
 * produces it, and vocabulary without a producer is the defect this project
 * keeps finding. It lands with the source that can report it.
 */
export const PartialReason = z
  .object({
    code: z.literal('result_cap'),
    /** What the server would have returned unbounded is NOT claimed here. */
    limit: z.number().int().positive(),
    returned: z.number().int().nonnegative(),
  })
  /**
   * Closed. An open object would accept a producer emitting `available: 173`
   * -- a total nobody counted and no consumer reads -- and it would validate
   * forever. The same reason the generated UI schema sets
   * `additionalProperties: false`: a field that is silently accepted is a claim
   * nobody checks.
   *
   * `available` is absent on purpose. Reporting it means either a second count
   * query on every bounded read or a number already stale, and "100 of 173"
   * that is wrong is worse than "100, and there are more".
   */
  .strict()
  .openapi('PartialReason')

/**
 * Whether a representation is all of what was asked for.
 *
 * `completeness` is ALWAYS present. A marker that appears only when something
 * is wrong is a marker whose absence a client can read as success without ever
 * having looked -- the same reason the performance budget file names
 * `inherited` explicitly instead of leaving the common case blank.
 *
 * The invariants are enforced where they can be checked rather than described:
 * complete carries no reasons, partial carries at least one.
 */
export const Completeness = z
  .object({
    completeness: z.enum(['complete', 'partial']),
    partialReasons: z.array(PartialReason).optional(),
  })
  .strict()
  .refine(
    (m) =>
      m.completeness === 'partial'
        ? (m.partialReasons?.length ?? 0) >= 1
        : (m.partialReasons?.length ?? 0) === 0,
    { message: 'partial must carry at least one reason, and complete must carry none' },
  )
  .openapi('Completeness')

/** RFC 9457 Problem Details -- one error shape for the whole API. */
export const Problem = z
  .object({
    detail: z.string(),
    instance: z.string().optional(),
    request_id: z.string().nullable().optional(),
    status: z.number().int(),
    title: z.string(),
    type: z.string(),
  })
  .openapi('Problem')

export const json = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } })
