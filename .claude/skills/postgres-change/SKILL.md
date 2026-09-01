---
name: postgres-change
description: How to change anything that lives in PostgreSQL here — tables, columns, indexes, RLS policies, views, functions, migrations, effective-dated ranges, money columns. Use this BEFORE writing SQL or a Drizzle schema change, and before adding a view, a materialized view, or a SECURITY DEFINER function over a tenant-owned table, because each is a new read path evaluated as whoever defined it rather than as the caller. Also use it when reviewing a migration, when a query is slow behind a policy, or when deciding the type of a monetary or temporal column.
---

# Changing the database

Law 11 says every tenant-owned table has `tenant_id`, with RLS enabled AND
forced. That is true, it is qualified by T11, and it is not the boundary.

The boundary is a question, and it takes the same form for every object:

> **Whose privileges evaluate the base table on this read path, and would that
> role bypass RLS?**

A caller reads the base table as itself. A caller reading through a view or a
`SECURITY DEFINER` function reads it as *that object's owner*. RLS is skipped
when the evaluating role is a superuser, holds `BYPASSRLS`, or owns the table
and the table is not `FORCE`d — and it is then skipped for that read path, not
for the table.

## Measured, not assumed

PostgreSQL 17.10, 2026-09-01, as `app_user` — a real non-superuser with
`rolbypassrls = false`, owning nothing — with `app.tenant_id` set to `a`, over a
table carrying `ENABLE` and `FORCE`, owned by a non-superuser role, one row per
tenant:

| Read path | Evaluated as | Bypasses? | Rows |
|---|---|---|---|
| base table | `app_user` | no | 1 |
| view owned by a superuser | that superuser | **yes** | **2** |
| view owned by a `BYPASSRLS` role | that role | **yes** | **2** |
| view owned by the table's owner, `FORCE` on | table owner | no | 1 |
| view owned by the table's owner, `FORCE` **off** | table owner | **yes** | **2** |
| view `WITH (security_invoker = true)` | `app_user` | no | 1 |
| `SECURITY DEFINER` fn owned by a superuser | that superuser | **yes** | **2** |
| `SECURITY DEFINER` fn owned by the table's owner | table owner | no | 1 |
| plain (invoker) function | `app_user` | no | 1 |
| matview built by a superuser | *nobody — a stored result* | n/a | **2** |
| matview built by the table owner at tenant `a` | *nobody — a stored result* | n/a | 1, **and a tenant-`b` caller reads tenant `a`'s row** |

Read the two `FORCE` rows together: same view, same owner, same query — the
answer changes with `FORCE` on the base table. `FORCE` **does** carry through
the view. What decides the outcome is never the object type; it is the
evaluating role.

That is the correction this document exists to make, because the framing it
shipped with — *views, matviews and SECURITY DEFINER functions bypass RLS even
when it is FORCEd* — is false as stated, and false in the direction that
teaches the wrong reflex. It is a list of three object types to memorise, it is
already incomplete (`SET ROLE`, trigger functions, event triggers), and it
stops a reader asking the question that generalises.

It was written here, not inherited. The source it was credited to states the
view rule correctly and owner-qualified; the categorical version was introduced
in summarising it. That is graded below, because getting the attribution wrong
is the same defect one level up.

> Every derived object over a tenant-owned table is a new read path. The base
> table's proof does not carry across it.

Two further measurements show a derived path can differ even when nothing
bypasses:

- a policy written `TO app_user` returned **2 rows** on the base table and
  **0** through a view owned by another role — the policies selected are the
  *view owner's*, and where none apply, RLS denies.
- `current_user` **inside** a policy body still evaluated as `app_user` through
  that same view. So policy *selection* follows the view owner while the policy
  *expression* does not. A policy that reads correctly on the base table can
  mean something different one path up.

## Ownership is why this matters here

`packages/db/bootstrap.sql` gets the application role right, deliberately:
`app_user` is `LOGIN NOBYPASSRLS NOSUPERUSER`, owns nothing, and holds DML
only. Nothing above is a hazard for the application connection.

The migration path is the exposure. Migrations run as `postgres`, which is a
superuser and owns every table, so **any view or `SECURITY DEFINER` function
created by a migration is owned by a superuser** — the `2` rows above, exactly.
The measurement is not synthetic here; it is this repository's default.

The structural fix outranks any checklist item, because it turns three things a
human must remember into conditions that cannot arise: a migration role that
owns the schema and is **not** a superuser and lacks `BYPASSRLS`. A view
created by such a role keeps the policy by construction, and `FORCE` — already
unconditional per ADR-003 — is what keeps it. Until that role exists, the
checklist below is the fallback, and it is only a fallback.

## The three derived paths, and what to do about each

**Views** — always `WITH (security_invoker = true)` (PG15+; we run 17.10). The
view then evaluates as its caller, which is the only owner-independent answer.
There is no reason to create a view over a tenant-owned table without it.

**Materialized views** — `security_invoker` is *rejected*:
`ERROR: unrecognized parameter "security_invoker"`, and `CREATE POLICY` is
defined for tables, not matviews. But the reason to refuse one is not bypass. A
matview **persists the result of an earlier execution**; a later reader gets
those stored rows, and the source tables' RLS is never re-evaluated for them.
Measured above: a matview built correctly — by a non-bypassing owner, under
`FORCE`, with tenant `a` bound — served tenant `a`'s row to a tenant-`b`
caller. Doing everything right still produced cross-tenant data at rest. Do not
build one over a tenant-owned table. A genuine reporting rollup is
`withPlatformAccess()` work — audited, admin-only, law 12 — not a convenience
in the tenant path.

**`SECURITY DEFINER` functions** — the property means the function executes
with the privileges of its **owner** rather than its caller. It is not defined
in terms of RLS and does not exist to defeat it: measured above, a definer
function owned by the table's own non-bypassing owner kept the policy. It
bypasses when its owner would — which, on the migration path here, is always.

This is where the categorical framing actually came from, and it is worth
seeing exactly. Supabase's rule reads: *"`SECURITY DEFINER` functions run with
the creator's privileges and bypass RLS on any tables they touch."* The first
clause is the definition, and it is portable. The second is an inference from
it that holds on their platform — where functions are owned by `postgres` — and
does not hold here, measured twice above. A vendor's rule is written against a
vendor's defaults, and object ownership is exactly the default that differs.

Avoid it on tenant-path operations. Where elevated execution is genuinely
intended, take Supabase's hardening, which is sound wherever it runs: a
non-exposed schema, `SET search_path = ''` on the function, `REVOKE EXECUTE`
from every role that should not call it directly (functions are executable by
`PUBLIC` by default), and an explicit identity check inside the body. A plain
invoker function needs none of this and keeps the policy — prefer it.

## Policies

**Which clauses a policy may carry is fixed by the command.** Measured, with
PostgreSQL's own words:

| `FOR` | `USING` | `WITH CHECK` | Getting it wrong |
|---|---|---|---|
| `SELECT` | required | illegal | `WITH CHECK cannot be applied to SELECT or DELETE` |
| `DELETE` | required | illegal | as above |
| `INSERT` | illegal | required | `only WITH CHECK expression allowed for INSERT` |
| `UPDATE` | yes | yes | — |
| `ALL` | yes | yes | — |

**For `ALL` and `UPDATE`, an omitted `WITH CHECK` falls back to `USING`.** So a
`FOR ALL USING (tenant_id = ...)` policy — the ordinary tenancy shape — already
validates writes. Measured: under that policy alone, inserting another tenant's
row failed with `new row violates row-level security policy`, and the caller's
own-tenant insert succeeded.

Write the applicable predicates explicitly anyway — an `ALL` policy with both
stated survives being split into command-specific policies later — but know the
real failure it guards against, which is narrower: a *command-specific* set
where a `FOR INSERT ... WITH CHECK` is more permissive than the
`FOR SELECT ... USING` beside it, letting a caller write rows it cannot read
back. Under a single `FOR ALL` policy that cannot happen.

The read predicate and the proposed-row predicate express the same tenant
boundary unless a documented reason says otherwise.

### Binding the tenant

`SET LOCAL app.tenant_id = $1` **is not valid SQL.** `SET` accepts no bind
parameters: `PREPARE p(text) AS SET LOCAL app.tenant_id = $1` fails with
`syntax error at or near "SET"`. Anyone following that advice literally must
interpolate a tenant id into statement text, in the one place in the system
where that must never happen. Use the parameterisable form — measured to
prepare, bind, and take effect:

```sql
SELECT set_config('app.tenant_id', $1, true)   -- third argument: transaction-local
```

The law is about lifetime, not syntax: **RLS context is transaction-local
(`set_config(..., true)` or `SET LOCAL`), never connection-session state.** A
session-level `SET` outlives the request on a pooled connection and the next
tenant inherits it — T19, and the single most reproduced multi-tenancy bug in
the published material surveyed below.

### `current_setting`, and one trap that is not in the manuals

- `current_setting('app.tenant_id')` raises `unrecognized configuration
  parameter` when the parameter has never been set on that connection.
- `current_setting('app.tenant_id', true)` returns NULL instead.

Both fail **closed** under plain equality. The shape that fails **open** is
`current_setting(...) IS NULL OR tenant_id = current_setting(...)`, which is
exactly what someone writes to stop a test erroring. Never write it.

Measured here, and worth knowing before relying on that raise: **once the first
transaction-local set has committed, the parameter persists on the connection
as an empty string.** The one-argument form stops raising and returns `''` from
then on. Equality still fails closed (`'a' = ''` is false), so the boundary
holds — but on a pooled connection the error-based safety net exists only for
the first request of that connection's life. Do not build anything on it.

### Indexes

Index the column a policy filters on. Tenant-path composite indexes normally
lead with `tenant_id`, because every query under RLS carries that predicate
whether it asked to or not — but that is a default, not a law. An unusual query
shape may want a different leading column, and the way to settle it is
`EXPLAIN (ANALYZE, BUFFERS)`, not this sentence.

Two things bite before index order does:

- Wrap the lookup as `(SELECT current_setting('app.tenant_id', true))`.
  Measured: the bare call stays in the qual and is evaluated per row, while the
  wrapped form plans as `Filter: (tenant_id = (InitPlan 1).col1)` with an
  `InitPlan` — evaluated once.
- A non-`LEAKPROOF` function in your own predicate forces the policy quals to
  be evaluated first, which is both the usual reason an index goes unused under
  RLS and a channel by which an error message can reveal a filtered row.
  *Documented behaviour, not measured here — confirm with `EXPLAIN` before
  citing it as the cause of a specific slow query.*

## Half-open ranges are the database's job, not review's

Law 20 requires effective-dated ranges to be half-open `[from, to)` AND
structurally non-overlapping. `structurally` currently has no structure behind
it: there is no `EXCLUDE` constraint and no `btree_gist` in the repo, so nothing
rejects an overlapping membership. Review is doing a job PostgreSQL will do.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- lets = join && in one index

ALTER TABLE tenant_membership ADD CONSTRAINT tenant_membership_no_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    user_id   WITH =,
    tstzrange(valid_from, valid_to, '[)') WITH &&
  );
```

`btree_gist` is a **trusted** extension (measured: 1.7, `trusted = t`), so a
database owner with `CREATE` can install it without superuser — which matters,
because under the role separation above the migration role should not be one.

Measured on 17.10:

| Insert | Result |
|---|---|
| `[Jan, Jun)` then `[Jun, Sep)` — adjacent | **accepted** — touching is not overlapping under `[)` |
| `[Mar, Apr)` inside an existing range | rejected, `conflicting key value violates exclusion constraint` |
| two rows with `valid_to = NULL` | rejected — unbounded upper overlaps unbounded |
| same range, different `tenant_id` | accepted |
| **`tenant_id` or `user_id` NULL, twice, identical** | **accepted — NULL keys never conflict** |
| **`valid_from = valid_to`, twice, inside an existing range** | **accepted — an empty range overlaps nothing** |
| `valid_to` before `valid_from` | rejected before the constraint is reached: `range lower bound must be less than or equal to range upper bound` |

The adjacency row is the one that matters. It is the behavioural difference
between `[)` and `[]`, and it is why the bounds argument is written explicitly
rather than left to a default: a range built as `[]` would reject a membership
beginning the instant the previous one ends, which is the normal case.

The `same range, different tenant_id` row means the constraint is tenant-scoped
because `tenant_id` is one of its keys. Leave it out and you have forbidden two
tenants from having overlapping memberships for the same user.

The bottom two rows mean `CHECK (valid_to IS NULL OR valid_to > valid_from)` is
not about reversed ranges — those already error before the constraint sees
them. It is about the **equal** case, which builds an empty range the
constraint cannot see. Add the `CHECK`.

Three more things the constraint does not do by itself:

- **NULL keys escape it.** `NULL = NULL` is not true, so a row with a NULL
  `tenant_id` or `user_id` never conflicts with anything. Both need `NOT NULL`,
  or the hole sits exactly where the boundary is.
- **Retained non-current rows break it.** If revoked or superseded memberships
  stay in the table, the constraint rejects legitimate new ones. Either scope
  it (`WHERE status = 'active'`) or state that such rows are hard-deleted.
- **It depends on law 21 holding.** `tstzrange(timestamptz, timestamptz, text)`
  is immutable. With plain `timestamp` columns the implicit cast is only
  stable, and the constraint will not build: `functions in index expression
  must be marked IMMUTABLE`. The type rule is load-bearing for the range rule.

Migration 0003 left an open question — which clock is authoritative when the
first production writer lands. This constraint does not answer it. It makes the
answer enforceable once given.

## Types that carry a law

Repository law first, PostgreSQL behaviour second. They are not the same kind
of claim, and only the second is measured.

| Column kind | Use | Never | Law |
|---|---|---|---|
| money | `numeric(p,s)` | `float`, `real`, `double precision`, the `money` type | 19 — `money` carries a session-dependent locale (`lc_monetary`) and is not portable |
| instant | `timestamptz` | `timestamp`, `timetz`, `timestamptz(0)` | 21 — a precision specifier rounds on write, silently |
| civil date | `date` | a timestamp at midnight | 21 — the zone is the legal entity's, not the runtime's |
| domain identifier | `uuid` | `serial`, `bigserial` | — |
| local surrogate key | `generated always as identity` | `serial`, `bigserial` | — |

**Repository convention, not a correctness law:** prefer `text` plus a named
`CHECK (length(...) <= n)` over `varchar(n)`. The reason is not that `varchar`
truncates on insert — measured, it errors: `value too long for type character
varying(3)`. It is that a `CHECK` can be added `NOT VALID` and validated
afterwards without holding a long lock, whereas narrowing a `varchar(n)`
rewrites the table. Two related measurements worth carrying: an **explicit
cast**, `'abcd'::varchar(3)`, *does* truncate silently to `abc`; and a `char(5)`
holding `'ab'` occupies 5 octets while `length()` reports 2 — the padding is
real but invisible to most expressions.

Law 19 is about JavaScript as much as SQL: `numeric` in the column is undone by
a driver that hands you a JS `number`. Check what the driver returns before
assuming the column type settled it.

## What this does not prove

The measurements above establish PostgreSQL's behaviour on our version, on
synthetic tables, at one point in time. They now cover the owner and `FORCE`
cases that the first version of this document asserted without exercising. They
still say nothing about whether OUR policies are correct — only
`tests/architecture/tenancy/` does that, and only for the cases it covers.

Our schema has zero views, zero materialized views and zero `SECURITY DEFINER`
functions today, so the hole is latent rather than live. Two cases are NOT
covered by T01–T21 and would be new attack cases, not edits to existing ones:

- a view or materialized view over a tenant-owned table
- an overlapping effective-dated range

Use the `attack-case` skill if you add them — it is a three-document change, and
the evidence rows belong in the register.

What this document currently offers for the first four checklist items is a
human remembering, and law 29 says invariants are enforced by guards. The guard
that would replace them queries the **built** database after migration rather
than grepping migration text: no matview over a tenant-owned table; every view
over one carrying `security_invoker`; no `SECURITY DEFINER` function outside an
allowlist; and no tenant-owned table whose owner is a superuser or holds
`rolbypassrls`. The last check mechanises the ownership section, and asking the
database rather than the source text is the distinction the T-suite already
draws. It is named here, not built — building it is law 30 work, with the pain
now measured.

## Before you call it done

- [ ] Every new view over a tenant-owned table has `security_invoker = true`.
- [ ] No materialized view over a tenant-owned table. If there is one, it is
      platform-access work with an audit record, not tenant-path work.
- [ ] No new `SECURITY DEFINER` function; or it is hardened as above and the
      reason is written down.
- [ ] The role owning tenant-owned tables, and any view over them, is not a
      superuser and does not hold `BYPASSRLS`; or the deviation is recorded and
      the object is `security_invoker`.
- [ ] `FORCE ROW LEVEL SECURITY` is present on every tenant-owned table.
- [ ] `app_user` remains a non-owner, `NOSUPERUSER`, `NOBYPASSRLS`, DML only.
- [ ] Every policy carries the clauses its command allows — `USING` for
      `SELECT`/`DELETE`, `WITH CHECK` for `INSERT`, both for `UPDATE`/`ALL` —
      expressing the same tenant boundary unless a reason is written down.
- [ ] Tenant context is bound with `set_config(..., true)` or `SET LOCAL`,
      inside a transaction, with the tenant id passed as a bind parameter and
      never interpolated into statement text.
- [ ] No policy contains `current_setting(...) IS NULL OR ...`.
- [ ] Money is `numeric`; instants are `timestamptz`; no precision specifiers.
- [ ] Effective-dated table has an `EXCLUDE` constraint keyed by `tenant_id`,
      `NOT NULL` on every scalar key, and a
      `CHECK (valid_to IS NULL OR valid_to > valid_from)`; or a stated reason it
      does not.
- [ ] `docker compose up -d` and `XFORGE_PHASE=tenancy pnpm verify` green, no
      stage BLOCKED.

## Where this came from

Law 34: fourteen published Postgres skills were retrieved and graded on
2026-09-01. What survived is above. What did not:

| Source | Outcome | Why |
|---|---|---|
| `troykelly/claude-skills@postgres-rls` | ADAPT | Supplied the view / matview / `SECURITY DEFINER` surfaces — the one thing here that reasoning had not produced. Re-read at source on 2026-09-01 to check an accusation this document had made against it. The accusation was **false**. It states the view rule correctly and owner-qualified — *"Views run with creator's privileges by default. Views owned by superusers bypass RLS entirely"* — gives superuser/`BYPASSRLS` and owner/`FORCE` their own named sections, and checklists *"Views not owned by superuser roles"*. It nowhere claims `SECURITY DEFINER` exists to bypass RLS; it presents definer functions as a way to shorten a policy chain. Its `(SELECT ...)` subquery wrap independently corroborates the index section above |
| ↳ that skill's `USING` / `WITH CHECK` rule | **REJECT** | *"Missing `WITH CHECK` allows inserting data you can't see."* Measured false on 17.10 for `ALL` and `UPDATE`, where an omitted `WITH CHECK` falls back to `USING` — the foreign-tenant insert was rejected. This is the one claim this document genuinely did inherit and repeat. Its `SET LOCAL` example also interpolates a literal tenant id, the surface named above |
| `supabase/agent-skills@supabase-postgres-best-practices` | ADAPT | 34 rule files, the highest-trust source in the set and the most installed. Supplied the `search_path = ''` / REVOKE / identity-check hardening verbatim, and is the true origin of the categorical bypass framing — *"run with the creator's privileges and bypass RLS on any tables they touch"* — quoted and answered in the body above: platform-true for them, not portable. Its `(select auth.uid())` wrap independently corroborates the `InitPlan` point. Its least-privilege rule corroborates our application role, but governs who *connects* and never who *owns*, so the ownership section stays `no-direct-match`. Tenant identity is `auth.uid()` throughout; ours is a verified `withTenant()` context, so its policy bodies do not transfer. Note its RLS rule sets context with a session-level `set app.current_user_id = '123'` **inside the "Correct" example** — the pooling hazard T19 exists for, shipped by the most-installed Postgres skill in the registry. Read for its rules, not its examples |
| `wshobson/agents@postgresql-table-design` | ADOPT (types only) | Type table above. Independently reaches Laws 19/20/21, including `[)` as the default bounds scheme |
| `neondatabase/agent-skills@neon-postgres` | ADAPT (pooling only) | Its pooled-vs-direct connection section is the operational form of T19. The rest is Neon platform operations |
| `patricio0312rev/skills@multi-tenant-safety-checker` | **REJECT** | Teaches the hole it warns about: its tests use `SET` not `SET LOCAL`, and its SQL-injection regression test rests on a false premise — it asserts `parseInt("1 OR 1=1 --")` is `NaN`; it is `1` (verified). A test that passes for a reason that is not true |
| `affaan-m/ecc@postgres-patterns`, `wispbit-ai/skills@postgresql-*` | REJECT | Derivatives of the Supabase skill — `affaan-m` credits it explicitly. Re-reading the same source through a lossy copy is not corroboration |
| `github/awesome-copilot@postgresql-optimization`, `@postgresql-code-review`, `planetscale/database-skills@postgres`, `mindrally/skills@postgresql-best-practices` | REJECT | Competent general tuning and review guidance with nothing tenancy-specific. Nothing here that the Supabase rule files do not cover better |
| `prisma/skills@prisma-postgres`, Azure / Aurora variants | REJECT | Provisioning and vendor operations. We use Drizzle |
| `dadbodgeoff/drift@row-level-security`, `schema0/skills@schema0-rls` | REJECT | Could not be retrieved: no valid `SKILL.md`, and an unresolvable name |

Two of fourteen would not even download. That is the ordinary state of this
ecosystem and the reason the grading step is not optional.

### There is no official PostgreSQL skill

Re-searched 2026-09-01 to validate the above against an authoritative source.
The PostgreSQL Global Development Group publishes none — there is no
`postgres/` or `postgresql/` publisher in the registry. Every candidate that
reads as official is official *to a vendor*: `supabase/`, `prisma/`,
`neondatabase/`, `microsoft/`, `aws/`, `planetscale/`, `github/`. Each
documents its own platform's defaults, which is precisely where a tenancy rule
stops transferring — Supabase's definer-function idiom is sound *because* their
objects are owned by `postgres`, and that premise is not ours. `no-direct-match`.
The authority for everything above is PostgreSQL's behaviour on 17.10, which is
why it is measured here rather than cited.

Published RLS *audit* skills were searched too, to see whether the guard named
above already exists. `ekhorkov/rls-audit` and
`yoanbernabeu/supabase-pentest-skills@supabase-audit-rls` check `ENABLE`,
`FORCE` and missing policies; neither queries `relowner`, `rolbypassrls`,
`prosecdef`, or a view's `reloptions`. `no-direct-match` for the ownership
guard: nothing off the shelf performs it, which is an argument for building it
and not for assuming it is covered.

### The lesson is in the troykelly rows

They are CLAUDE.md's review prompt arriving twice.

The first time: a fact acquired a second source. A published skill said a view
can bypass RLS, a measurement here returned 2 rows, and the two agreed right up
until someone asked *why* 2. The measurement was real; the rule written beside
it was not.

The second time is worse, because it was this document. The summary came out
more categorical than the source it summarised, and was then cited as that
source's position — so the next reader would have gone and "corrected" a skill
that was already right. Grading a source protects you from importing its
errors. It does nothing about the ones introduced in the act of importing, and
nothing checked that step until the claim was read back at source.

Which is the rule: **quote the sentence you are grading.** A grade recorded
without one is a grade of what you remember reading.
