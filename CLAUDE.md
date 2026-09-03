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
32. The fast loop is the canonical definition of repository green: Biome, tsc, the
    unit and browser Vitest projects, and byte-identical regeneration.
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

Work lands on feature/* branches and is pushed to origin
(github.com/pohlai88/afenda-XForgeV3). That is the whole workflow.

THERE IS NO CI, NO PULL-REQUEST GATE AND NO BRANCH PROTECTION, BY DECISION. The
owner removed them on 2026-09-03 after they became a blocker on the coding road
rather than a check on it: `.github/workflows/verify.yml` does not exist,
`package.json` declares no `verify` script, and `tooling/verify/` holds one
helper. Earlier versions of this file described all three as if they existed
and prescribed a protection rule "before the first merge"; that text is gone,
and the decision is recorded here so it is not re-litigated by the next agent
reading an older ADR.

  Do not propose CI, a required check, a pull-request gate, branch protection
  or a `verify` script. Do not append "no CI ran" or "the PR is the check" to
  a report. Report what ran and its result, then stop.

"Green" therefore means one thing: the fast loop passed on the machine that made
the change, with every command's exit code read directly (never through a pipe
into grep or tail -- two commits landed red that way on 2026-09-03). An ADR's
qualification is that loop plus the evidence-reviewer passes recorded in the
ADR. "Nothing external has run this" is true of everything here and is not a
finding.

# Phases

.architecture/state.json holds the phase, and the repository owns it. The
environment may raise it locally and may never lower it.

  Advancing currentPhase is a phase-COMPLETION event, never a phase-start one.

  Phase 1 work begins        XFORGE_PHASE=tenancy locally
                             -> that phase's checks become mandatory HERE, and
                                anything unbuilt goes red immediately
  all exit criteria pass     commit currentPhase: tenancy
                             -> from that commit on, the loop requires it permanently

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

The fast loop, run by whoever made the change -- agent or human -- with each
command's exit code read directly:

  pnpm exec biome ci .                                   lint and format
  pnpm exec tsc --noEmit -p tsconfig.json                types (tests included)
  pnpm exec vitest run --project unit                    no database, no browser
  pnpm exec vitest run --project browser                 Chromium; when behaviour changes
  pnpm gen:tokens && git diff --exit-code packages/design/generated
                                                         law 27: regeneration is byte-identical

That is the gate. There is no aggregate `pnpm verify`, no `--ci` mode and no
BLOCKED state; the earlier design with those words was deleted with the guard
subsystem (a3cf31b) and is not coming back. An agent runs the loop after every
change that can alter a verdict and says which commands ran and what they
returned. A prose change needs `biome ci` alone.

Two habits the loop cannot enforce and the repository keeps paying for:

  RED FIRST   a new check is watched failing before the code that satisfies it
              lands, and the commit message says what went red. A check that
              has never failed is decoration (checks-that-can-fail skill).
  EXIT CODES  `cmd | tail -1` reports tail's exit status. Write output to a
              file and test the command's own status, or do not claim green.

The database-backed projects (`contract`, `integration`, `architecture`) run
when their subject changes, by the person with the database; law 33 still
holds for them: a run leaves the checkout exactly as it found it.

A question not answered here is answered in .architecture/adr/ — consult it
rather than re-deciding. Changes to a FROZEN section arrive as an ADR, never as
a competing draft.
