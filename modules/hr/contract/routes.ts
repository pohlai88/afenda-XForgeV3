/**
 * HR route contracts -- the code authority for the API (ADR-002).
 *
 * These are authored BEFORE any handler exists. The OpenAPI document is a
 * projection of this file; the client, the Query hooks and the MSW mocks are
 * projections of that document. The frontend is built against the mocks before
 * a database exists, which is the highest-leverage workflow in the architecture.
 *
 * Every route carries `policy` (ADR-014). Omitting it fails the type check, and
 * would be refused at mount even if a cast got it past tsc.
 */
import { z } from '@hono/zod-openapi'
import { createRoute } from '@xforge/api'

export const EmergencyContact = z
  .object({
    employeeId: z.uuid(),
    id: z.uuid(),
    name: z.string().min(1).max(200),
    phone: z.string().min(3).max(40),
    relationship: z.string().min(1).max(80),
    /** ADR-013: the client round-trips this so a stale write can be rejected. */
    version: z.number().int().positive(),
  })
  .openapi('EmergencyContact')

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

export const NewEmergencyContact = z
  .object({
    name: z.string().min(1).max(200),
    phone: z.string().min(3).max(40),
    relationship: z.string().min(1).max(80),
  })
  .openapi('NewEmergencyContact')

export const UpdateEmergencyContact = z
  .object({
    name: z.string().min(1).max(200).optional(),
    phone: z.string().min(3).max(40).optional(),
    relationship: z.string().min(1).max(80).optional(),
    /** Required, not optional: an update without it cannot be checked for staleness. */
    version: z.number().int().positive(),
  })
  .openapi('UpdateEmergencyContact')

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

const json = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } })

export const listEmergencyContacts = createRoute({
  method: 'get',
  operationId: 'listEmergencyContacts',
  path: '/v1/employees/{employeeId}/emergency-contacts',
  policy: { permission: 'hr.employee.read', scopeType: 'tenant' },
  request: { params: z.object({ employeeId: z.uuid() }) },
  responses: {
    200: {
      description: 'The contacts, and whether this is all of them',
      ...json(z.object({ items: z.array(EmergencyContact), meta: Completeness })),
    },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
  },
  summary: 'List an employee emergency contacts',
  tags: ['HR'],
})

export const createEmergencyContact = createRoute({
  method: 'post',
  operationId: 'createEmergencyContact',
  path: '/v1/employees/{employeeId}/emergency-contacts',
  policy: { permission: 'hr.employee.update', scopeType: 'tenant' },
  request: {
    body: { required: true, ...json(NewEmergencyContact) },
    params: z.object({ employeeId: z.uuid() }),
  },
  responses: {
    201: { description: 'Created', ...json(EmergencyContact) },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
    422: { description: 'Invalid', ...json(Problem) },
  },
  summary: 'Add an emergency contact',
  tags: ['HR'],
})

export const updateEmergencyContact = createRoute({
  method: 'patch',
  operationId: 'updateEmergencyContact',
  path: '/v1/emergency-contacts/{id}',
  policy: { permission: 'hr.employee.update', scopeType: 'tenant' },
  request: {
    body: { required: true, ...json(UpdateEmergencyContact) },
    params: z.object({ id: z.uuid() }),
  },
  responses: {
    200: { description: 'Updated', ...json(EmergencyContact) },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
    404: { description: 'Not found', ...json(Problem) },
    /** ADR-013: a stale write is rejected explicitly, never merged. */
    409: { description: 'Version conflict', ...json(Problem) },
  },
  summary: 'Update an emergency contact',
  tags: ['HR'],
})

export const hrRoutes = {
  createEmergencyContact,
  listEmergencyContacts,
  updateEmergencyContact,
} as const
