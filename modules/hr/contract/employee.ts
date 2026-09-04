/**
 * The HR core read model -- person, employee, employment, legal entity.
 *
 * ADR-009's three levels, as a contract. `emergency_contact.employee_id` has
 * pointed at nothing since the spine phase; this is the thing it points at.
 *
 *   PERSON  ----------> a human being; one record per human, tenant-scoped
 *      |
 *      +-- EMPLOYEE --> person employed BY A LEGAL ENTITY
 *             |         one per person per legal entity
 *             |
 *             +-- EMPLOYMENT -> a dated period with job and pay basis
 *                               effective-dated; PAYROLL OPERATES ON THIS
 *
 * The reads, plus ONBOARDING -- the first command. Transfer is not here yet:
 * it is the operation ADR-009's mid-month case is actually about, it closes one
 * period and opens another at a second legal entity, and the two must be one
 * transaction or a person is briefly employed twice or not at all. It lands
 * next, as a command (law 17), never as a status patch.
 *
 * ------------------------------------------------------------------------
 * WHY `asOf` IS REQUIRED AND NOT DEFAULTED TO TODAY
 * ------------------------------------------------------------------------
 * Law 21: civil dates derive from the legal entity's IANA zone, never the
 * runtime clock. ADR-016 makes that a guard -- `new Date()` and `now()::date`
 * inside `modules/**` are findings. A server defaulting `asOf` to "today" would
 * have to read a clock to do it, and there is no single correct answer to read:
 * a tenant-wide directory spans legal entities in different zones, so "today"
 * is genuinely more than one date, and whichever one the server picked would be
 * wrong for somebody, silently, at the boundary.
 *
 * So the caller states the date it means, and the response ECHOES it. That is
 * not friction for its own sake -- "show me the organisation as at 1 March" is
 * an HR feature, and the phase gate names effective-dated assignment as an exit
 * criterion. Making the date explicit at the boundary is what makes the history
 * screens fall out of this operation instead of needing a second one.
 */
import { z } from '@hono/zod-openapi'
import { createRoute } from '@xforge/api'
import { Completeness, json, Problem } from './shared'

/**
 * A business DATE, never an instant (ADR-016).
 *
 * `date` and `timestamptz` are different kinds and are never implicitly
 * converted. An effective-dated boundary carrying a spurious time-of-day is how
 * a period-end job attributes work to the wrong month.
 */
const BusinessDate = z.iso.date()

/**
 * The payroll scope (law 15) and the civil-time authority (ADR-016).
 *
 * `timeZone` is why this entity is in the read model at all rather than being
 * an id on the employee: every business date in this module is resolved in the
 * zone stored HERE, so a screen showing dates without knowing the entity is
 * showing dates resolved somewhere unstated.
 */
export const LegalEntity = z
  .object({
    /** ISO 3166-1 alpha-2. Selects the country pack (ADR-008). */
    countryCode: z.string().length(2),
    id: z.uuid(),
    name: z.string().min(1).max(200),
    /**
     * The registration this entity files under -- the SSM number in Malaysia.
     * The statutory employer registrations (EPF, SOCSO, LHDN E-number) hang off
     * this entity too and are deliberately NOT here: they are payroll filing
     * facts, they are read under a different permission, and a field nobody
     * produces yet is vocabulary without a producer.
     */
    registrationNumber: z.string().min(1).max(60).nullable(),
    /** IANA, e.g. `Asia/Kuala_Lumpur`. Never an offset -- an offset carries no DST rule. */
    timeZone: z.string().min(1).max(64),
  })
  .openapi('LegalEntity')

/**
 * THERE IS NO `Person` SCHEMA HERE, AND THAT IS DELIBERATE.
 *
 * `person` is a real table and the top of ADR-009's three levels, but no
 * operation returns one: the directory and the record both carry `personId`
 * alongside the person's name, because a screen that has an employee never
 * needs to fetch the human separately. A `Person` object was written here
 * first, and it registered as an OpenAPI component that no path referenced --
 * so it generated no client model and no mock, and its `fullName` constraints
 * were a SECOND declaration of the ones already on `EmployeeRecord`. Two
 * sources for one fact, agreeing on the day they were written.
 *
 * It lands when an operation produces one -- reassigning a person between legal
 * entities is the obvious first, and it is a command, not a read.
 *
 * Date of birth and national identifiers are absent from the wire for a
 * different reason. Payroll needs both (a 60th birthday inside the period is a
 * named blocking fixture), and both are read under a sensitivity class whose
 * enforcement is the response filter, not the client. Putting them into an
 * unfiltered read model now would make the first compensation screen inherit a
 * leak no test would report, because there is no filter yet to exercise.
 */

/**
 * How pay is expressed for a period. Not an amount -- amounts are compensation,
 * read under `hr.compensation.read`, which is a later slice with a response
 * filter behind it (architecture-final 9.4).
 */
const PayBasis = z.enum(['monthly', 'daily', 'hourly'])

/**
 * An effective-dated employment period. THE THING PAYROLL OPERATES ON.
 *
 * `[effectiveFrom, effectiveTo)` -- half-open, law 20. A NULL `effectiveTo` is
 * open-ended, and `effectiveFrom === effectiveTo` is an empty range the
 * database refuses: a same-day joiner-leaver is [2026-03-03, 2026-03-04).
 *
 * `recordedAt` is TRANSACTION time and is a different fact from `effectiveFrom`
 * (ADR-016). A raise effective 1 March entered on 20 March has an
 * `effectiveFrom` inside the period and a `recordedAt` after the snapshot was
 * taken, and that difference is the entire basis of the
 * RETRO_INPUT_AFTER_SNAPSHOT finding. It is on the wire so a screen can show
 * that a change was backdated, which is the only way a person spots it before
 * payroll does.
 */
export const Employment = z
  .object({
    effectiveFrom: BusinessDate,
    /** NULL is open-ended, not unknown. Half-open: the row does not cover this date. */
    effectiveTo: BusinessDate.nullable(),
    employeeId: z.uuid(),
    id: z.uuid(),
    jobTitle: z.string().min(1).max(160),
    payBasis: PayBasis,
    recordedAt: z.iso.datetime(),
  })
  .openapi('Employment')

/** The employment effective on the requested date, flattened for a row or a header. */
export const EmploymentSummary = z
  .object({
    effectiveFrom: BusinessDate,
    effectiveTo: BusinessDate.nullable(),
    jobTitle: z.string().min(1).max(160),
    payBasis: PayBasis,
  })
  .openapi('EmploymentSummary')

/**
 * A directory row.
 *
 * `employment` IS NULLABLE, AND NULL MEANS EXACTLY ONE THING: no employment
 * period covers `asOf`. It does not mean terminated and it does not mean not
 * yet started. ADR-016 requires that finding no row effective on a date is a
 * distinct outcome which never falls back to the nearest row, and a status enum
 * reading "ended" would be precisely that fallback -- it can only be computed
 * from a row that does NOT cover the date being asked about.
 *
 * A screen that wants to tell those two apart asks for the employment history,
 * which is the operation that legitimately sees every period.
 */
export const EmployeeSummary = z
  .object({
    employeeId: z.uuid(),
    /** The entity's own reference for this relationship. Unique per legal entity. */
    employeeNumber: z.string().min(1).max(40),
    employment: EmploymentSummary.nullable(),
    fullName: z.string().min(1).max(200),
    legalEntityId: z.uuid(),
    /**
     * Denormalised onto the row so a directory of a hundred people is one
     * request. The id sits beside it because the NAME is a label and the ID is
     * the join key -- a client filtering on the label matches on something a
     * rename breaks.
     */
    legalEntityName: z.string().min(1).max(200),
    personId: z.uuid(),
  })
  .openapi('EmployeeSummary')

/** One employee, resolved at a date, with the entity that employs them. */
export const EmployeeRecord = z
  .object({
    employeeId: z.uuid(),
    employeeNumber: z.string().min(1).max(40),
    employment: EmploymentSummary.nullable(),
    fullName: z.string().min(1).max(200),
    /** The whole entity, not an id: the screen needs its zone to render any date. */
    legalEntity: LegalEntity,
    personId: z.uuid(),
    preferredName: z.string().min(1).max(120).nullable(),
  })
  .openapi('EmployeeRecord')

export const listLegalEntities = createRoute({
  method: 'get',
  operationId: 'listLegalEntities',
  path: '/v1/legal-entities',
  policy: { permission: 'hr.legal_entity.read', scopeType: 'tenant' },
  responses: {
    200: {
      description: 'The legal entities in this tenant',
      ...json(z.object({ items: z.array(LegalEntity), meta: Completeness })),
    },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
  },
  summary: 'List legal entities',
  tags: ['HR'],
})

export const listEmployees = createRoute({
  method: 'get',
  operationId: 'listEmployees',
  path: '/v1/employees',
  policy: { permission: 'hr.employee.read', scopeType: 'tenant' },
  request: {
    query: z.object({
      /** See the header: required, because there is no single clock to default it from. */
      asOf: BusinessDate,
      /**
       * Narrow to one legal entity. Optional here because a tenant-wide
       * directory is a real screen -- but every PAYROLL read binds it, and
       * ADR-009 records an unbound legal-entity query as the largest residual
       * correctness risk in the design.
       */
      legalEntityId: z.uuid().optional(),
    }),
  },
  responses: {
    200: {
      description: 'The employees, resolved at asOf, and whether this is all of them',
      ...json(
        z.object({
          /** Echoed so a client never has to assume which date it is looking at. */
          asOf: BusinessDate,
          items: z.array(EmployeeSummary),
          meta: Completeness,
        }),
      ),
    },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
  },
  summary: 'List employees as at a date',
  tags: ['HR'],
})

export const getEmployee = createRoute({
  method: 'get',
  operationId: 'getEmployee',
  path: '/v1/employees/{employeeId}',
  policy: { permission: 'hr.employee.read', scopeType: 'tenant' },
  request: {
    params: z.object({ employeeId: z.uuid() }),
    query: z.object({ asOf: BusinessDate }),
  },
  responses: {
    200: {
      description: 'The employee, resolved at asOf',
      ...json(z.object({ asOf: BusinessDate, employee: EmployeeRecord })),
    },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
    404: { description: 'Not found', ...json(Problem) },
  },
  summary: 'Read one employee as at a date',
  tags: ['HR'],
})

/**
 * The whole history, which is what makes the nullable `employment` above
 * readable: a screen tells "not yet started" from "ended" by looking at the
 * periods, never by asking the server to guess from a row that does not cover
 * the date it was asked about.
 */
export const listEmployments = createRoute({
  method: 'get',
  operationId: 'listEmployments',
  path: '/v1/employees/{employeeId}/employments',
  policy: { permission: 'hr.employee.read', scopeType: 'tenant' },
  request: { params: z.object({ employeeId: z.uuid() }) },
  responses: {
    200: {
      description: 'Every employment period for this employee, earliest first',
      ...json(z.object({ items: z.array(Employment), meta: Completeness })),
    },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
  },
  summary: 'List an employee employment periods',
  tags: ['HR'],
})

/**
 * ---------------------------------------------------------------------------
 * ONBOARDING — the first COMMAND in the product
 * ---------------------------------------------------------------------------
 * One business operation, not three writes a client sequences. Onboarding
 * creates a person, an employee at a legal entity, and the employment period
 * that employment begins with — and law 17 says a consequential state
 * transition is an explicit command, never a status patch.
 *
 * WHY IT IS ONE OPERATION AND NOT THREE. A client that POSTed a person, then an
 * employee, then an employment would own the atomicity of somebody's
 * employment: crash between the second and the third and a person exists on the
 * books of a legal entity with no period, which is precisely the state the
 * directory renders as "no employment period on this date" and payroll cannot
 * operate on. The three rows are one fact and they are written in one
 * transaction.
 *
 * THE FIRST PERIOD IS REQUIRED, for the same reason. An employee whose
 * employment has not been recorded is not a lighter version of an employee; it
 * is a row that no statutory process can see. `EmployeeRecord.employment` is
 * nullable because a date can fall outside every period, never because a period
 * was never entered.
 *
 * NO VERSION TOKEN. ADR-013 governs UPDATES to mutable documents; there is
 * nothing here to be stale against. The concurrency hazard is a DUPLICATE, not
 * a lost update — two operators onboarding the same person at the same entity —
 * and that is refused by the unique index on (tenant, legal entity, employee
 * number) and reported as a 409, which is the same status for a different
 * reason and says so in its description.
 */
export const NewEmployee = z
  .object({
    /** The first period. Required — see the header. */
    effectiveFrom: BusinessDate,
    /** Unique within the legal entity. The employer's own reference. */
    employeeNumber: z.string().min(1).max(40),
    fullName: z.string().min(1).max(200),
    jobTitle: z.string().min(1).max(160),
    legalEntityId: z.uuid(),
    payBasis: PayBasis,
    preferredName: z.string().min(1).max(120).nullable().optional(),
  })
  .strict()
  .openapi('NewEmployee')

export const onboardEmployee = createRoute({
  method: 'post',
  operationId: 'onboardEmployee',
  path: '/v1/employees',
  policy: { permission: 'hr.employee.onboard', scopeType: 'tenant' },
  request: { body: { required: true, ...json(NewEmployee) } },
  responses: {
    201: {
      description: 'The employee, resolved at the day employment begins',
      ...json(z.object({ asOf: BusinessDate, employee: EmployeeRecord })),
    },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
    404: { description: 'No such legal entity in this tenant', ...json(Problem) },
    /**
     * NOT a stale write (ADR-013). This employee number is already in use at
     * this legal entity, or this person already has an employee record there.
     * Same status, different reason, and the detail says which.
     */
    409: { description: 'Already employed here, or the number is taken', ...json(Problem) },
    422: { description: 'Invalid', ...json(Problem) },
  },
  summary: 'Onboard an employee to a legal entity',
  tags: ['HR'],
})

/**
 * ---------------------------------------------------------------------------
 * TRANSFER — the operation ADR-009 was written for
 * ---------------------------------------------------------------------------
 * Siti works for Sdn Bhd A. On 16 March she moves to Sdn Bhd B in the same
 * group. Both are legal entities under one tenant, each with its own EPF
 * employer number, SOCSO code and LHDN E-number. March payroll must run TWICE
 * — A for 1–15 March, B for 16–31 — each against its own registration, and at
 * year end she receives two Borang EA forms.
 *
 * That is why this is one command and not "edit the employee's legal entity".
 * A patch would move a row; what actually has to happen is that one employment
 * period ENDS and another BEGINS at a different employer, against the same
 * human, with no day belonging to both and no day belonging to neither.
 *
 * THE SAME PERSON, A NEW EMPLOYEE. `person_id` is carried across, which is the
 * whole point of ADR-009's three levels: one human, two employee records, two
 * statutory identities. Onboarding cannot do this — it always creates a new
 * person, because it has no way to know two names are one human — and that is
 * exactly the asymmetry that makes transfer its own operation rather than a
 * second onboarding.
 *
 * THE BOUNDARY IS ONE DATE AND IT IS USED TWICE. `effectiveFrom` closes the old
 * period and opens the new one, and because ranges are half-open (law 20) the
 *16th belongs to B alone: A's row becomes [.., 2026-03-16) and B's is
 * [2026-03-16, ..). Two dates — a "last day" and a "first day" — would be two
 * facts that can disagree, and the off-by-one is the kind nobody notices until
 * a month has 31 days of pay across 30 days of employment.
 *
 * WHAT THIS IS NOT. Concurrent employment — one person employed by two entities
 * AT ONCE, which ADR-009 also permits and the exclusion constraint deliberately
 * allows — is a different operation that opens a period without closing one.
 * Not built: no screen has asked, and the two would be indistinguishable in a
 * single endpoint with a flag.
 */
export const Transfer = z
  .object({
    /** Closes the old period and opens the new one. One date, used twice. */
    effectiveFrom: BusinessDate,
    /** The employer's own reference at the DESTINATION. Unique there, not here. */
    employeeNumber: z.string().min(1).max(40),
    jobTitle: z.string().min(1).max(160),
    payBasis: PayBasis,
    /** Where they are going. Must differ from where they are. */
    toLegalEntityId: z.uuid(),
  })
  .strict()
  .openapi('Transfer')

export const transferEmployee = createRoute({
  method: 'post',
  operationId: 'transferEmployee',
  path: '/v1/employees/{employeeId}/transfer',
  policy: { permission: 'hr.employee.transfer', scopeType: 'tenant' },
  request: {
    body: { required: true, ...json(Transfer) },
    params: z.object({ employeeId: z.uuid() }),
  },
  responses: {
    201: {
      description: 'The employee record at the DESTINATION, resolved on the transfer date',
      ...json(z.object({ asOf: BusinessDate, employee: EmployeeRecord })),
    },
    401: { description: 'Unauthenticated', ...json(Problem) },
    403: { description: 'Forbidden', ...json(Problem) },
    404: { description: 'No such employee, or no such legal entity', ...json(Problem) },
    /**
     * Three distinct refusals, each a decision the caller can act on: the
     * employee number is taken at the destination, this person already has a
     * record there, or no employment period covers the transfer date — which
     * means there is nothing to transfer FROM, and silently opening a period at
     * the destination would invent employment that never started.
     */
    409: { description: 'Nothing to transfer, or already employed there', ...json(Problem) },
    422: { description: 'Invalid, or already at that employer', ...json(Problem) },
  },
  summary: 'Transfer an employee to another legal entity',
  tags: ['HR'],
})
