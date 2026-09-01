import type { Sql } from 'postgres'
import { EMPLOYEE } from './employee.ts'

/**
 * The HR fixture world's starting state.
 *
 * WHY A THIRD FILE. tenancy.ts owns two tenants, their hostnames and their
 * memberships, and says so; employee.ts owns the employee for the same reason
 * it is not folded into tenancy. An emergency contact is neither, and putting
 * its reset in either would make one definition own unrelated concerns.
 *
 * WHY IT EXISTS AT ALL. The statement below lived in two architecture
 * harnesses, character-identical, while stages.mjs described the hazard in a
 * third place and named the wrong function: both comments said seedTenancy
 * clears its tables unscoped, which stopped being true once those deletes were
 * scoped to the rows that fixture owns. The fact had three homes and the
 * commentary pointed at none of them.
 */

/**
 * Clear the contacts THIS FIXTURE WORLD owns.
 *
 * The predicate is employee_id, and choosing it corrected a mistake worth
 * recording. The first version deleted every row and argued that scoping was
 * decoration, because the seeding connection is the owner role and bypasses
 * row-level security unconditionally. That argument is sound about a TENANT
 * predicate and irrelevant here: fixtures-delete-only-what-they-own is not
 * about tenant isolation, it is about one suite emptying a table another suite
 * is mid-way through asserting on. RLS has nothing to do with it.
 *
 * The guard said so immediately. Consolidating the two harness copies into this
 * file moved the statement into the guard's jurisdiction -- it governs
 * tests/fixtures and never covered tests/architecture -- so a fact that had
 * been invisible in two places became visible in one. The consolidation paid
 * for itself before the commit landed.
 *
 * What remains unguarded, stated rather than implied: suites addressing THIS
 * employee still clear each other's rows. They run in separate serial stages
 * and each seeds what it needs, so the blast radius is bounded by
 * fileParallelism being off and by the stages running in sequence. If either
 * changes, this needs an owning identity narrower than the employee.
 */
export async function resetEmergencyContacts(owner: Sql): Promise<void> {
  await owner`
    delete from emergency_contact where employee_id = ${EMPLOYEE}
  `
}
