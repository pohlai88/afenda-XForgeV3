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
 *
 * THIS FILE OWNS NO SCHEMA. It was the whole contract while the module had one
 * entity; a second entity made it the place where two entities' shapes would
 * sit together and the envelope shapes they share would get retyped rather than
 * imported. The schemas now live with their entity, the shared response shapes
 * live in `./shared`, and this is the aggregator -- so `@xforge/hr/contract`
 * keeps serving every name it has ever served, from one import.
 */
export {
  createEmergencyContact,
  EmergencyContact,
  listEmergencyContacts,
  NewEmergencyContact,
  UpdateEmergencyContact,
  updateEmergencyContact,
} from './emergency-contact'
export {
  EmployeeRecord,
  EmployeeSummary,
  Employment,
  EmploymentSummary,
  getEmployee,
  LegalEntity,
  listEmployees,
  listEmployments,
  listLegalEntities,
  NewEmployee,
  onboardEmployee,
  Transfer,
  transferEmployee,
} from './employee'
export { Completeness, PartialReason, Problem } from './shared'

import {
  createEmergencyContact,
  listEmergencyContacts,
  updateEmergencyContact,
} from './emergency-contact'
import {
  getEmployee,
  listEmployees,
  listEmployments,
  listLegalEntities,
  onboardEmployee,
  transferEmployee,
} from './employee'

export const hrRoutes = {
  createEmergencyContact,
  getEmployee,
  listEmergencyContacts,
  listEmployees,
  listEmployments,
  listLegalEntities,
  onboardEmployee,
  transferEmployee,
  updateEmergencyContact,
} as const
