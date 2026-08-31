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
    id: z.uuid(),
    employeeId: z.uuid(),
    name: z.string().min(1).max(200),
    relationship: z.string().min(1).max(80),
    phone: z.string().min(3).max(40),
    /** ADR-013: the client round-trips this so a stale write can be rejected. */
    version: z.number().int().positive(),
  })
  .openapi('EmergencyContact')

export const NewEmergencyContact = z
  .object({
    name: z.string().min(1).max(200),
    relationship: z.string().min(1).max(80),
    phone: z.string().min(3).max(40),
  })
  .openapi('NewEmergencyContact')

export const UpdateEmergencyContact = z
  .object({
    name: z.string().min(1).max(200).optional(),
    relationship: z.string().min(1).max(80).optional(),
    phone: z.string().min(3).max(40).optional(),
    /** Required, not optional: an update without it cannot be checked for staleness. */
    version: z.number().int().positive(),
  })
  .openapi('UpdateEmergencyContact')

/** RFC 9457 Problem Details -- one error shape for the whole API. */
export const Problem = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string(),
    instance: z.string().optional(),
    request_id: z.string().nullable().optional(),
  })
  .openapi('Problem')

const json = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } })

export const listEmergencyContacts = createRoute({
  method: 'get',
  path: '/v1/employees/{employeeId}/emergency-contacts',
  operationId: 'listEmergencyContacts',
  tags: ['HR'],
  summary: 'List an employee emergency contacts',
  policy: { permission: 'hr.employee.read', scopeType: 'tenant' },
  request: { params: z.object({ employeeId: z.uuid() }) },
  responses: {
    200: { description: 'The contacts', ...json(z.object({ items: z.array(EmergencyContact) })) },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
  },
})

export const createEmergencyContact = createRoute({
  method: 'post',
  path: '/v1/employees/{employeeId}/emergency-contacts',
  operationId: 'createEmergencyContact',
  tags: ['HR'],
  summary: 'Add an emergency contact',
  policy: { permission: 'hr.employee.update', scopeType: 'tenant' },
  request: {
    params: z.object({ employeeId: z.uuid() }),
    body: { required: true, ...json(NewEmergencyContact) },
  },
  responses: {
    201: { description: 'Created', ...json(EmergencyContact) },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
    422: { description: 'Invalid', ...json(Problem) },
  },
})

export const updateEmergencyContact = createRoute({
  method: 'patch',
  path: '/v1/emergency-contacts/{id}',
  operationId: 'updateEmergencyContact',
  tags: ['HR'],
  summary: 'Update an emergency contact',
  policy: { permission: 'hr.employee.update', scopeType: 'tenant' },
  request: {
    params: z.object({ id: z.uuid() }),
    body: { required: true, ...json(UpdateEmergencyContact) },
  },
  responses: {
    200: { description: 'Updated', ...json(EmergencyContact) },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
    404: { description: 'Not found', ...json(Problem) },
    /** ADR-013: a stale write is rejected explicitly, never merged. */
    409: { description: 'Version conflict', ...json(Problem) },
  },
})

export const hrRoutes = {
  listEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
} as const
