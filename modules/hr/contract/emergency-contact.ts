/**
 * Emergency-contact route contracts.
 *
 * Split out of `routes.ts` when the module gained a second entity. `routes.ts`
 * is now the aggregator and owns no schema of its own, so neither entity's
 * shapes can quietly become the other's.
 */
import { z } from '@hono/zod-openapi'
import { createRoute } from '@xforge/api'
import { Completeness, json, Problem } from './shared'

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
