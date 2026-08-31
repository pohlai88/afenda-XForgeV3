# Architecture laws

1.  Modular monolith until measured evidence justifies extraction.
2.  Frontend-led is build order; API-first is architectural authority.
3.  Every business operation has a typed route contract before its handler.
4.  Every route contract carries a policy declaration — a permission and scope,
    or the explicit literal 'public'. No declaration, no mount.
5.  Business UI reaches the backend only through generated contract clients.
    One transport, one policy path. No Server Action business API.
6.  React UI never imports repositories, Drizzle, DB handles, or another
    module's internals.
7.  Every fact has one authoritative source. No mega definition owns unrelated
    concerns.
8.  Data, Contract, Experience and Policy are separate planes joined by stable
    semantic identifiers.
9.  Core business truth is explicit TypeScript plus relational PostgreSQL data.
10. Metadata composes repetitive experience and tenant variation. It never
    replaces high-integrity domain modelling.
11. Every tenant-owned table has tenant_id, with RLS enabled AND forced.
12. Tenant DB access only through withTenant(); cross-tenant access only through
    withPlatformAccess(), which is audited and restricted to apps/admin.
13. A request context carries exactly one tenant_id, bound at an explicit
    selection step and re-verified against membership on every request.
14. Tenant, legal entity, organisational structure and authentication stay
    distinct. person → employee → employment; one employee per person per
    legal entity.
15. Payroll and statutory scope is legal_entity, and operates on employment
    periods — never tenant, never employee.
16. Modules never import another module's repository or private persistence.
17. Consequential state transitions use explicit commands, never status patches.
18. Final payroll and accounting history is immutable. Correct by reversal and
    replacement.
19. No JavaScript floating-point number represents monetary truth.
20. All effective-dated ranges are half-open [from, to) and structurally
    non-overlapping.
21. Civil dates derive from the legal entity's IANA zone, never the runtime clock.
22. Mutable documents carry a version token. Stale writes are rejected with 409,
    never merged.
23. Country rules are effective-dated and never spread as if(country) branches.
24. Compliance connectivity is separable from transactional ledger truth.
25. AI uses the same commands, policies and tenant isolation as human clients.
26. AI never receives a database connection, and never gains a tool merely
    because an entity exists.
27. Generated state is never hand-edited.
28. Production migrations follow expand → backfill → switch → contract.
29. Architecture invariants are enforced by guards, not prose.
30. New infrastructure requires a named, measured pain.
31. Generalise a platform abstraction only after a second real use case proves it.
32. pnpm verify is the canonical definition of repository green.
33. A green verification run leaves the checkout exactly as it found it.

Canonical architecture: .architecture/architecture-final.md
Decisions:              .architecture/adr/
Evidence:               .architecture/evidence-register.md
Next phase's spec:      .architecture/phase-1-attack-matrix.md

# Repository workflow

The initial commits established this repository and its default branch. That
was a one-time exception: with zero commits there is nothing to branch from,
and reconstructing history to satisfy a branch-first rule would have bought
ceremony, not architecture.

  From master onward: feature/* -> PR -> master. No direct commits to master.

Recorded here so it is not re-litigated, and so "the last change went straight
to master" is never cited as precedent.

master is NOT protected. Being precise about that matters, because a policy
written down reads exactly like a policy enforced:

  branch policy         DEFINED     this file
  CI workflow           DEFINED     .github/workflows/verify.yml
  remote CI execution   NOT SHOWN   nothing has ever run it
  branch protection     NOT ACTIVE  there is no remote to configure

Once a remote exists, apply exactly this -- a protection rule weaker than the
local gate teaches people the gate is optional:

  required check        verify / verify  (pnpm verify --ci)
  pull request          required, no direct push, no force push
  up to date            branch must be current with master before merge
  BLOCKED stages        a failure, which --ci already enforces

  Until then: Phase 1 may be DEVELOPED locally, and may not be MERGED to
  master. Phase 1 is where the tenant isolation proof lands, and that is the
  one check that most needs to have actually executed somewhere other than the
  machine that wrote it.

# Phases

.architecture/state.json holds the phase, and the repository owns it. The
environment may raise it locally and may never lower it; --ci ignores it.

  Advancing currentPhase is a phase-COMPLETION event, never a phase-start one.

  Phase 1 work begins        XFORGE_PHASE=tenancy locally
                             -> that phase's checks become mandatory HERE, and
                                anything unbuilt goes red immediately
  all exit criteria pass     commit currentPhase: tenancy
                             -> from that commit on, CI requires it permanently

So currentPhase reads "the furthest phase this architecture has CERTIFIED", not
"the phase someone is working on". A stage that reports PENDING during its own
phase is a failure, which is what makes the local raise real evidence rather
than a quiet PENDING discovered at merge.

# Verification

  pnpm verify      local. BLOCKED stages are reported loudly and tolerated.
  pnpm verify:ci   BLOCKED is a failure. CI MUST use this.

A stage is BLOCKED when its phase has started but a prerequisite is missing --
no database, no browser. A check that did not run is not a check that passed,
and without that distinction "verify was green" eventually comes to mean "the
database tests never ran".

The last stage asserts law 33: the gate must leave the checkout exactly as it
found it. It is the only check here that does not depend on the source
universe's category vocabulary being complete -- twice now, every tool agreed
about a file and every tool was wrong, and a red build found it rather than a
guard. Asking a behavioural question instead of a classification one catches
that whole class, including the next category nobody has thought of yet.

A question not answered here is answered in .architecture/adr/ — consult it
rather than re-deciding. Changes to a FROZEN section arrive as an ADR, never as
a competing draft.
