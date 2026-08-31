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

| ID | Attack | Expected | Available from |
|---|---|---|---|
| T01 | A reads B by id | deny | now |
| T02 | A lists rows when the repository forgets the tenant predicate | only A's rows | now |
| T03 | A updates B | deny | now |
| T04 | A deletes B | deny | an HR delete operation |
| T05 | A inserts a row claiming B | deny | now |
| T06 | valid A session presented at B's host, no B membership | deny | now |
| T07 | principal in A and B, at A's host, `activeTenantId = B` | A's context | now |
| T08 | raw tenant UUID passed to `withTenant` | compile / architecture failure | now |
| T09 | application role owns a tenant table | verify failure | now |
| T10 | application role holds `BYPASSRLS` | verify failure | now |
| T11 | tenant-owned table without RLS enabled and forced | verify failure | now |
| T12 | tenant-owned table without `tenant_id` | verify failure | now |
| T13 | database handle acquired outside the sanctioned API | guard failure | now |
| T14 | `withPlatformAccess` called from an HR module | guard failure | now |
| T15 | the platform audit sink is unavailable | privileged work does not run | now |
| T16 | a privileged operation crashes mid-flight | the ATTEMPT remains observable | now |
| T17 | a forged `x-tenant-id` header at another tenant's host | the header decides nothing | now |
| T18 | membership revoked between two requests | the second is denied | now |
| T19 | two tenants over one pooled connection | no context survives the checkout | now |
| T20 | a second permissive policy is added | access WIDENS, never narrows | now |
| T21 | a backup taken with the application role | sees nothing, silently | now |

**T17-T21 are amendments.** A frozen specification may be EXTENDED; what it must
never be is quietly narrowed to match what the code turned out to do, which is
the only direction that flatters anyone.

T17 and T18 came from review. **T19, T20 and T21 came from published prior art**,
after this matrix had been written and declared frozen -- which is the finding,
not a footnote. All three describe hazards no amount of reasoning from our own
code would have surfaced:

- **T19** is the adversarial sequence the [OWASP Multi-Tenant Security Cheat
  Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html)
  asks for: two tenants over reused connections, proving the second cannot
  observe the first. We had tested that `SET LOCAL` expires, which is a
  different and weaker claim.
- **T20**: permissive policies combine with OR, so adding one only ever grants.
  We came within a design decision of adding a second policy to
  `tenant_membership` believing it would narrow access.
- **T21**: `FORCE ROW LEVEL SECURITY` applies to `pg_dump`. A backup taken by a
  role without `BYPASSRLS` succeeds, is a plausible size, and contains no rows.
  The failure surfaces during a restore.

**The fourth column exists so the ratio carries information.** A single figure
mixes *not written yet* with *cannot be written yet*, and a number that means
two things means neither -- the same defect as counting unenforced laws without
saying which are deliberate. `pnpm verify` reports both: progress against what
is reachable at this slice, and progress against the whole matrix.

One case is genuinely blocked: T04 needs the HR module to have a delete
operation at all, which is product scope rather than a tenancy dependency. T06
and T07 were blocked on real membership data and were unblocked by slice 2.
Everything else is reachable today and simply unwritten.

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

## The policy matrix

Same phase, different mechanism, and the distinction is the point:

```
RLS     answers  which tenant's rows can this request EVER see?
policy  answers  what may this principal do INSIDE that tenant?
```

Cases where both deny at once prove neither. Each of these varies exactly one
thing.

| ID | Attack | Expected | Available from |
|---|---|---|---|
| P01 | same tenant, correct permission | allow | now |
| P02 | same tenant, permission absent | deny, and the response says nothing useful | now |
| P03 | permission held, but for another scope | deny | now |
| P04 | a denied request | never reaches the business query | now |
| P05 | client calls the API directly, bypassing the UI | deny | now |
| P06 | an unregistered permission code | build or startup failure | a permission registry |
| P07 | a grant whose window has closed | deny | now |
| P08 | the evaluator cannot decide | fail closed | now |

**P04 is the one that changes what the others prove.** Policy's guarantee is not
*"my check fired"* but *"no path granted"* — different claims that a test
conflates easily. A suite where the handler still runs and RLS happens to return
nothing looks identical to one where authorisation worked, so the denial is
asserted by the absence of the business transaction, not by the status code.

**Internally rich, externally flat.** `permission_missing`, `scope_mismatch`,
`grant_expired` and `scope_type_unknown` are distinguishable to the evaluator,
to logs and to audit, and indistinguishable to the caller. "You lack
`hr.employee.read` at `legal_entity MY02`" confirms MY02 exists and names the
grant to go phishing for; repeated across identifiers, the API becomes an
enumeration oracle one helpful error message at a time. The response carries a
`request_id` so support can correlate without the caller learning anything.

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
