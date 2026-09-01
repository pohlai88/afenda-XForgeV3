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
 * NOT A SEEDED ROW, TODAY. There is no employee table -- the schema holds
 * emergency_contact, tenant, tenant_domain and tenant_membership and nothing
 * else -- so `seedTenancy` inserts nothing for this id and
 * `emergency_contact.employee_id` carries no foreign key. This is an identity
 * that requests are addressed to, and it is legal against today's schema rather
 * than slipping past a weakened one.
 *
 * It becomes illegal the day law 14's person -> employee -> employment lands
 * with its foreign key, and on that day this is the one place that has to grow
 * a real seeded row. That is the point of it being one place: the change will
 * arrive in a phase where nobody is thinking about fixtures.
 */
export const EMPLOYEE = '33333333-3333-4333-8333-333333333333'
