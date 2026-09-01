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
34. Search prior art before proposing an architectural pattern. Record what
    was found, what was rejected, and what it does not prove. Do not build
    infrastructure a mature tool already provides.

Canonical architecture: .architecture/architecture-final.md
Decisions:              .architecture/adr/
Evidence:               .architecture/evidence-register.md
Next phase's spec:      .architecture/phase-1-attack-matrix.md
Current state:          .architecture/project-state.md

# Prior art

Law 34 exists because it lapsed once already. The evidence register was built to
grade external precedent and then went unused: 2 of 21 entries were ever
verified, while sessions were spent deriving what PostgreSQL documents in one
sentence and OWASP publishes as a cheat sheet.

  search BEFORE designing.  gate BEFORE freezing.

An exploratory sketch needs no evidence record. A FROZEN decision needs:
sources with retrieval dates and the claim each supports, the alternatives
reviewed, and -- the load-bearing part -- what the prior art does NOT prove.
"AWS recommends RLS" establishes that the pattern is credible. It says nothing
about whether ours is correct; only the qualification suite does that.

Three outcomes are all valid, and REJECT is evidence too:

  ADOPT   the pattern fits as published
  ADAPT   sound, but needs Xforge constraints
  REJECT  conflicts with a requirement here -- record why

Where nothing comparable exists, record `no-direct-match` with the sources
examined. That is stronger than pretending a loosely related article proves
the design.

A governance tool earns authority by rejecting a known violation and by showing
it inspected the expected source population -- never by exiting 0. depcruise
reported "no violations found" against this repository having cruised 1 module
and 0 dependencies, because it cannot parse TypeScript 7. Installed, configured,
green, and blind. Any replacement must pass both proofs before it is adopted,
and the guard it replaces is deleted in the same commit (ADR-024).

The verify stage checks only that these fields are PRESENT. It cannot tell
whether a source is good, relevant, or was read -- that is review. A guard whose
name overclaims is worse than none, which is why it is called
`adr-has-evidence`.

# Repository workflow

The initial commits established this repository and its default branch. That
was a one-time exception: with zero commits there is nothing to branch from,
and reconstructing history to satisfy a branch-first rule would have bought
ceremony, not architecture.

  From here onward: feature/* -> PR -> main. No direct commits to main.

Recorded here so it is not re-litigated, and so "the last change went straight
to main" is never cited as precedent.

The default branch was renamed master -> main when the remote was created. The
rename is only safe because .github/workflows/verify.yml was renamed with it: it
triggered on `branches: [master]`, so on a repository whose default branch is
`main` the required check would never have run. A required check that cannot
fire is worse than no check, because the branch protection UI reports it as
configured.

main is NOT protected. Being precise about that matters, because a policy
written down reads exactly like a policy enforced:

  branch policy         DEFINED     this file
  CI workflow           DEFINED     .github/workflows/verify.yml
  remote CI execution   NOT SHOWN   nothing has ever run it
  branch protection     NOT ACTIVE  the remote exists, nothing is set

That last row read "there is no remote to configure" until 2026-09-01, when it
was found stale by the simple act of looking: origin has been
github.com/pohlai88/afenda-XForgeV3 for some time, carrying main and four
feature branches. The paragraph documenting facts that drift from their
documentation had itself drifted. Corrected in place AND recorded, because the
correction is the more useful artefact -- and because nothing here could have
caught it. No guard reads a claim about a remote.

One consequence is easy to assume wrongly, so it is written down: pushing a
feature branch runs NO CI. verify.yml triggers on pull_request and push against
main only. A pushed branch is off-machine backup; the pull request is the check.

The remote exists. Apply exactly this, BEFORE the first merge and not after --
a protection rule weaker than the local gate teaches people the gate is
optional:

  required check        verify / verify  (pnpm verify --ci)
  pull request          required, no direct push, no force push
  up to date            branch must be current with main before merge
  BLOCKED stages        a failure, which --ci already enforces

  Until then: Phase 1 may be DEVELOPED locally, and may not be MERGED to
  main. Phase 1 is where the tenant isolation proof lands, and that is the
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

# The defect this project keeps having

A fact acquires a second source. The two agree, and go on agreeing, until they
do not -- and nothing complains in between, because agreement is indistinguishable
from correctness right up to the moment it ends.

  next-env.d.ts          classify() knew generated DIRECTORIES; this was a file
  behaviour guards       each invented a path regex instead of asking classify()
  Principal.tenantId     policy's tenant vs the database's verified context
  tenant_domain policy   a comment saying it could not be tenant-scoped, above a
                         tenant-scoped policy
  branches: [master]     the rename landed on main and not on the trees pushed

Five appearances. Every one was caught by something else -- a red build, a
compiler, a reviewer's question -- and none by a guard aimed at the category,
because the manifestations have nothing in common at the level a guard can see.

No check is proposed. This is a REVIEW PROMPT, and the prompt is:

  having fixed something in one place, ask what else holds a copy of that fact.

It is the first question to ask of any fix, and the last one to ask of any new
subsystem.

# Verification

  pnpm verify:fast  while writing, and for a commit that cannot change behaviour.
  pnpm verify       before committing anything executable. BLOCKED tolerated.
  pnpm verify:ci    BLOCKED is a failure. CI MUST use this.

WHICH ONE, AND WHEN. The full gate is for changes that can alter behaviour. A
commit of prose, a deletion of files nothing imports, a comment -- the fast loop
already answers those, and the full gate answers them in three minutes instead
of twenty seconds.

The first version of this rule said "before every commit", and that was worse
than useless: it got applied to a markdown edit and to a three-file deletion,
and defended as consistency. A rule followed past the reason for it is how a
gate becomes something people route around, which is the failure this whole
section exists to prevent. If a change cannot alter a verdict, the fast loop IS
the check.

The fast loop is guards, typecheck, lint and unit. The criterion is mechanical
rather than a judgement about importance -- an authorship stage needs NO external
service, NO build artefact and NO browser -- and each stage DECLARES it with
`authorship: true` in tooling/verify/stages.mjs. The runner filters on that
declaration and holds no list, so a stage that later grows a database leaves the
fast loop by editing one line beside itself rather than by someone remembering.

It names the stages it did not run, every single time, and says to run the full
gate before committing. A fast check whose limits go unstated is the easiest
thing in a repository to mistake for the gate -- and `--fast --ci` is refused
outright, because the CI gate is not a subset of anything.

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
