# Phase 1 — the tenancy attack matrix

**Status:** FROZEN before implementation · 31 August 2026
**Qualifies:** AQS-005, AQS-006, AQS-007, AQS-008, AQS-022
**Exit gate for:** the tenancy phase (architecture-final.md Part V)

This is the specification, written before the code. Cases added opportunistically
as bugs appear only ever describe the bugs already found; a frozen matrix also
describes the ones that were not.

## The property being proven

```
application tenant filtering  =  defence in depth, and query performance
PostgreSQL FORCE RLS          =  the security boundary
```

Both mutations below exist because it is easy to accidentally prove the wrong
one. A suite that passes only because every repository query happens to carry
`WHERE tenant_id = ?` has proven the application careful, not the boundary
structural — and carefulness is exactly what erodes over an agent-authored
codebase.

**Mutation A — delete the application predicate.** Take a real HR repository
query, remove its tenant predicate, and require that tenant A still cannot
obtain tenant B. If this fails, RLS was decorative and the application was
carrying the boundary.

**Mutation B — break the policy.** Disable or drop the RLS policy on a
tenant-owned table and require that architecture qualification FAILS. If this
passes, the suite was never testing RLS.

Neither is a synthetic fixture. **Do not build an "RLS test repository" that is
safer than production code** — the thing under test must be the code that ships,
or the proof is about a program nobody runs.

## The matrix

| ID | Attack | Expected |
|---|---|---|
| T01 | A reads B by id | deny |
| T02 | A lists rows when the repository forgets the tenant predicate | only A's rows |
| T03 | A updates B | deny |
| T04 | A deletes B | deny |
| T05 | A inserts a row claiming B | deny |
| T06 | valid A session presented at B's host, no B membership | deny |
| T07 | principal in A and B, at A's host, `activeTenantId = B` | A's context |
| T08 | raw tenant UUID passed to `withTenant` | compile / architecture failure |
| T09 | application role owns a tenant table | verify failure |
| T10 | application role holds `BYPASSRLS` | verify failure |
| T11 | tenant-owned table without RLS enabled and forced | verify failure |
| T12 | tenant-owned table without `tenant_id` | verify failure |
| T13 | database handle acquired outside the sanctioned API | guard failure |
| T14 | `withPlatformAccess` called from an HR module | guard failure |
| T15 | the platform audit sink is unavailable | privileged work does not run |
| T16 | a privileged operation crashes mid-flight | the ATTEMPT remains observable |

**T02 is Mutation A.** **T11 is Mutation B seen from the gate's side.**

Implementation status is not recorded here -- it is reported by `pnpm verify`,
which reads this table and compares it against `tests/architecture/tenancy/`.
A status column in a document drifts; a gate that names the missing cases and
turns them into a failure the day the tenancy phase is declared does not.

**T07 is the multi-tab case ADR-022 exists for**, and the expected result is the
one people find surprising: the host decides, so a tenant switch in another tab
changes nothing here. `activeTenantId` is a navigation preference.

**T08 is a type-level case, not a runtime one.** It passes when the code does not
compile. See ADR-022: the branded `VerifiedTenantContext` has exactly one
constructor, inside `packages/tenancy`, and there is no exported cast helper —
an escape hatch reachable from application code makes the brand decorative.

**T15 and T16 are the two halves of audit durability.** T15 proves privileged
access fails closed when it cannot be recorded, which will be unpopular the
first time it happens in an incident, and that is how you know it works. T16
proves the reverse: a crash must leave the ATTEMPT visible. An attempt with no
outcome is not corrupt data — it is the finding, and operational tooling must be
able to ask for it:

```
ATTEMPTED, and no SUCCEEDED or FAILED after N minutes
  → INCOMPLETE / ABANDONED privileged operation
```

Absence of an outcome carries that meaning without a fourth stored state. What
it cannot do on its own is distinguish *still running* from *process died* from
*the outcome write itself failed* — so the admin and operations surface owes an
explicit view, not a query someone remembers to write during an incident.

## Order of work

```
1  move the existing HR slice onto the real tenant-scoped PostgreSQL driver
2  request-scoped TenantContext        host → principal → membership → verified
3  policy evaluation on the real path
4  multi-membership and host mismatch  T06, T07
5  withPlatformAccess in anger         T14, T15, T16
6  the attack suite above, as a blocking gate
```

Attacking a path the application does not use is weak evidence, which is why
step 1 comes first and not last.
