/**
 * The employee the fixture world is about.
 *
 * Every suite that exercises the HR surface addresses the same employee: the
 * contract tests, the isolation suite, the architecture harnesses, the E2E specs
 * and the health URL Playwright waits on. That was true by coincidence rather
 * than by construction -- the identifier was spelled out in nine files, two of
 * which each declared their own `export const EMPLOYEE`. Nine copies that agree
 * are indistinguishable from one fact until one of them changes.
 *
 * WHY HERE. The two harnesses that already exported it live under
 * tests/architecture and are not a workspace package, so `packages/db`,
 * `packages/api-client`, `modules/hr` and `e2e/` could not reach them without a
 * reverse dependency. An owner nobody may import is the reason the copies
 * existed. `@xforge/fixtures` is the package those consumers already depend on,
 * and it is where this world is already defined.
 *
 * WHY NOT IN `./tenancy`. That module owns two tenants, their hostnames and
 * their memberships, and says so. An employee is not a tenancy concept, and
 * folding it in would make one definition own unrelated concerns.
 *
 * NOT A SEEDED ROW, STILL. The employee table exists now: 0004_hr_core.sql
 * creates legal_entity, person, employee and employment (law 14's spine, with
 * composite tenant-scoped keys). Nothing seeds a row under this id -- no fixture
 * inserts into person or employee -- and `emergency_contact.employee_id` still
 * references nothing, because the migration deferred that key on purpose:
 * adding it would reject every row the fixtures insert and take the tenancy
 * attack suite (T01, T03, T07) and two integration files down with it. So this
 * is an identity requests are addressed to, legal against today's schema by
 * the absence of one constraint that is named, in the migration, as the next
 * step.
 *
 * When that key lands, this is the one place that has to grow a real seeded
 * row: a legal_entity, a person, an employee under this id, inserted where
 * `seedTenancy` seeds the tenants, by someone who can run the database-backed
 * projects and watch them go green. That is the point of it being one place;
 * the day it is needed, nobody will be thinking about fixtures.
 */
export const EMPLOYEE = '33333333-3333-4333-8333-333333333333'
