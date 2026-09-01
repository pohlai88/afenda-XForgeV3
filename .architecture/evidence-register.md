# Xforge — Architecture Evidence Register

**Status:** Companion to `architecture-final.md` · **Retrieved:** 31 August 2026
**Purpose:** Keep external precedent, internal qualification and decision stability visible without re-litigating architecture.

---

## Grades

| Grade | Meaning |
|---|---|
| **P** | Production precedent — used by a large, real production platform |
| **S** | Standard or official architecture guidance — durable documented semantics |
| **V** | Vendor capability — validates that a chosen *replaceable* provider supports a required capability |
| **X** | Xforge qualification — executable proof required in this repository |

A FROZEN decision should normally have **P or S, plus X**. Rows that do not meet this are marked explicitly rather than quietly graded up.

## The rule

External precedent answers: *"Is this architecture pattern credible in serious production systems?"*
Xforge tests answer: *"Did we implement the pattern correctly here?"*

**Both are required before calling an implementation battle-tested.** Precedent qualifies the pattern; it never qualifies this implementation.

**Evidence confidence order:** database and standards semantics → independent architecture guidance → large production precedent → provider capability documentation → **Xforge qualification tests**. The last step is mandatory.

> Do not cite vendor scale claims as proof of Xforge correctness.

---

## Register

| Decision | External evidence | Grade | Xforge proof (AQS) | Status |
|---|---|---|---|---|
| Strict modular monolith | E01, E02 — precedent that the *shape* works when continuously engineered, **not** for these specific boundaries | P | AQS-001, AQS-020 | FROZEN |
| OpenAPI contract spine | E03, E04 | S/P | AQS-002, AQS-003 | FROZEN |
| Pooled PostgreSQL tenancy + RLS | E05, E06 | S | AQS-005 – AQS-008 | FROZEN |
| Tenant ≠ legal entity ≠ auth organisation | E06, E19 — partitioning guidance separates isolation from business modelling; auth products expose generic organisations, not statutory employers | S | UC-02, payroll fixtures | FROZEN |
| Bounded metadata customisation | E07, E08, E09 — precedent for the productivity, **and** direct evidence of the coupling Xforge rejects | P | AQS-009, AQS-010 | FROZEN |
| **Four planes + semantic registry** | **None. This is an Xforge synthesis**, reasoned from the coupling visible in E08 and the extension depth in E09 | **X only** | AQS-009 | FROZEN on failure-mode analysis — *fails the P-or-S rule, recorded deliberately* |
| Transactional outbox | E10, E11 | S | AQS-013 | FROZEN |
| At-least-once + idempotency | E10 (duplicate warning), E12 | S/P | AQS-014 | FROZEN |
| Immutable financial/payroll posting | E13 | P | AQS-012 | FROZEN |
| Pure, versioned payroll calculation | Deterministic effective-dated rule engines are standard auditability practice; jurisdiction-specific golden evidence is Xforge's own | S | AQS-016 | FROZEN |
| Least-privilege AI tool layer | E15 | S | AQS-017 | FROZEN |
| Staged online migration | E14 | P | AQS-018 | FROZEN |
| Mandatory per-operation policy declaration | **None. Xforge finding (UC-14)** — the predecessor guard was a spelling check, not a presence check | **X only** | AQS-021 | FROZEN on failure-mode analysis |
| Bound tenant per request | **None. Xforge finding (UC-15)** — host/session check is tautological for multi-membership principals | **X only** | AQS-008 | FROZEN on failure-mode analysis |
| Half-open effective-dated intervals + exclusion constraints | PostgreSQL range and exclusion-constraint semantics (E05 family) | S | AQS-024 | FROZEN |
| Valid time ≠ transaction time | Bitemporal modelling is long-established practice | S | AQS-024 | FROZEN |
| Database branch per PR | E16 | V | AQS-018, AQS-022 | STABLE / provider REVERSIBLE |
| Custom tenant domains behind an adapter | E17 | V | AQS-008 | STABLE / provider REVERSIBLE |
| Open-code UI primitives | E18 | V | design-system, a11y, ERP-primitive tests | REVERSIBLE |
| Auth behind a facade | E19, E21 | V | business topology stays outside the provider | STABLE / provider REVERSIBLE |
| Durable executor behind the outbox | E20 — *executor capability, not the source of durable business intent* | V | AQS-013 | REVERSIBLE |

---

## Primary sources

Every entry carries a URL. Entries without a verifiable retrieval are marked **UNVERIFIED** and must not be relied on until confirmed.

| ID | Source | URL | Retrieved |
|---|---|---|---|
| **E01** | Shopify Engineering — *Under Deconstruction: The State of Shopify's Monolith* | https://shopify.engineering/shopify-monolith | not re-verified |
| **E02** | GitHub Engineering — architecture and optimisation posts | https://github.blog/category/engineering/ | not re-verified |
| **E03** | OpenAPI Initiative — *OpenAPI Specification 3.1* | https://spec.openapis.org/oas/v3.1.0 | not re-verified |
| **E04** | GitHub — *REST API OpenAPI Description* | https://github.com/github/rest-api-description | not re-verified |
| **E05** | PostgreSQL — *Row Security Policies* / `CREATE POLICY` | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | not re-verified |
| **E06** | AWS Prescriptive Guidance — multi-tenant SaaS partitioning and RLS | https://docs.aws.amazon.com/prescriptive-guidance/ | not re-verified |
| **E07** | Salesforce Architects — *Platform Multitenant Architecture* | https://architect.salesforce.com/ | not re-verified |
| **E08** | Frappe Framework — *Understanding DocTypes* | https://docs.frappe.io/framework/user/en/basics | not re-verified |
| **E09** | Odoo — *Building a Module* / *View Records* | https://www.odoo.com/documentation/ | not re-verified |
| **E10** | AWS Prescriptive Guidance — *Transactional outbox pattern* | https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html | not re-verified |
| **E11** | Microsoft Azure Architecture Center — *Transactional Outbox* | https://learn.microsoft.com/azure/architecture/ | not re-verified |
| **E12** | Stripe API — *Idempotent requests* | https://docs.stripe.com/api/idempotent_requests | not re-verified |
| **E13** | Modern Treasury — *Ledgers Guarantees* | https://docs.moderntreasury.com/ | not re-verified |
| **E14** | Stripe Engineering — *Online migrations at scale* | https://stripe.com/blog/online-migrations | not re-verified |
| **E15** | OWASP GenAI Security — *LLM06:2025 Excessive Agency* | https://genai.owasp.org/ | not re-verified |
| **E16** | Neon — *Database branching workflow primer* | https://neon.com/docs/get-started-with-neon/workflow-primer | not re-verified |
| **E17** | Vercel — *Vercel for Platforms* | https://vercel.com/docs/multi-tenant | not re-verified |
| **E18** | shadcn/ui — *Base UI as the Default*, July 2026 | https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default | **verified 31 Aug 2026** |
| **E19** | Better Auth — *Organization Plugin* | https://better-auth.com/docs/plugins/organization | not re-verified |
| **E20** | Trigger.dev — *Idempotency* | https://trigger.dev/docs/idempotency | not re-verified |
| **E21** | Vercel — *Vercel acquires Better Auth* (7 Jul 2026; MIT retained, framework-agnostic, agent identity focus) | https://vercel.com/blog/vercel-acquires-better-auth | **verified 31 Aug 2026** |

> **Sources marked "not re-verified" were cited by predecessor drafts and carried forward.** Their URLs are recorded so they can be checked; until they are, treat them as claims rather than as confirmed citations. Verify before any of them is used to justify reopening a FROZEN decision.

---

## Claims checked during the final review

| Claim | Outcome |
|---|---|
| shadcn defaults to Base UI for new projects (July 2026); Radix still supported | **Verified** — E18 |
| "Base UI lacks Context Menu, Hover Card and Toast" (carried by four drafts) | **False.** All three ship. Open item deleted |
| Vercel acquired Better Auth 7 July 2026; MIT, framework-agnostic, same team | **Verified** — E21. Stated focus is agent identity: separate, revocable agent credentials |
| "Neon's HTTP driver cannot hold session state across statements" | **Unverified vendor claim.** Demoted to an implementation note; replaced by AQS-022, an executable driver test |
| "Vietnam Decree 13/2023"; "Indonesian local storage rules" | **Named but unverified.** Obtain legal advice before any residency commitment |
| "The team is Vietnam-based" (used to argue for re-examining the launch country) | **No evidence.** Not an input until confirmed |
| EPF / SOCSO / EIS are wage-band lookup tables rather than clean percentages | **Structurally correct and load-bearing.** Every rate, ceiling and band must still come from current official LHDN / KWSP / PERKESO publications at build time — never from a document or a model |

---

## Removed claims

Predecessor drafts argued the custom-field case twice using **fabricated statistics stated as fact** — "20,000 employees, 400 tenants, hundreds of generated columns, each NULL for 99.75% of rows." No measurement supports these numbers. The argument for the three-rung ladder holds on the structural point alone (a shared-schema table serves every tenant, so a column added for one is added for all), and the numbers have been removed rather than repeated.

Two predecessor documents reported desk analysis in PASS/FAIL tables with headline defect counts, which reads as test output. It was reasoning on paper. `architecture-final.md` Part II states this explicitly and drops the counts — the two documents that both claimed to have "validated the architecture" reported different totals, which is why the count is not the evidence.


## Verified 31 August 2026

Added after law 34, which exists because this register was built to grade
external precedent and then went unused -- 2 of 21 entries were ever verified,
while sessions were spent deriving what PostgreSQL documents in a sentence.

Not a backfill of the original 21. Those stay as they are until a decision is
reopened; re-verifying them on a schedule is the standing audit this register
is meant to prevent.

| # | Source | Retrieved | Grade | Supports | Outcome |
|---|---|---|---|---|---|
| E22 | [PostgreSQL, Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | 2026-08-31 | S | Superusers and `BYPASSRLS` roles ALWAYS bypass RLS; `FORCE` subjects only the table owner; TRUNCATE and REFERENCES are not subject to row security | ADOPT |
| E23 | [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html) | 2026-08-31 | S | Client-supplied tenant ids are selectors only, verified against membership; transaction-local context per request; schema-derived RLS coverage over hand-maintained lists; request role must lack `rolsuper`/`rolbypassrls`; prove connection reuse cannot leak | ADOPT |
| E24 | [Postgres RLS in practice](https://queryplane.com/blog/postgres-row-level-security-in-practice/) | 2026-08-31 | P | Permissive policies OR together; `SECURITY DEFINER` evaluates the owner's policies; `pg_dump` without `BYPASSRLS` exports zero rows under FORCE | ADOPT |
| E25 | [dependency-cruiser CLI](https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md) + `depcruise` 18.2.0 run locally | 2026-08-31 | V | Forbidden rules and cycle detection are first-class -- and it refuses `typescript >=7`, cruising 0 dependencies here | REJECT (deferred, ADR-024) |
| E26 | [typescript-eslint custom rules](https://typescript-eslint.io/developers/custom-rules/) | 2026-08-31 | V | Typed AST rules with a testing harness -- the target for semantic guards when touched | ADAPT (ADR-024) |

**What E23 confirmed we had already derived independently**, at considerably
greater cost than reading it: host-as-selector, `FORCE ROW LEVEL SECURITY`, a
non-owner request role, `SET LOCAL` per transaction, dynamic table enumeration
over a maintained list, and `rolsuper`/`rolbypassrls` assertions. ADR-022's
"Host selects. Membership authorises. Session identifies." is a restatement of
its first recommendation.

**What it gave us that reasoning had not**: the pooled-connection reuse proof
(T19), permissive-policy OR-stacking (T20), the `pg_dump` hazard (T21), audit
rows carrying the server-verified tenant, and the `SECURITY DEFINER` doctrine
now recorded in ADR-023.

## Backfilled 31 August 2026, before certifying the tenancy phase

Law 34's backfill is LAZY and triggered by dependency: a grandfathered decision
stops being exempt when the phase that rests on it is certified. Committing
`currentPhase: tenancy` makes five decisions due, so their evidence was written
first -- discovering at the moment of certification that the gate cannot be
satisfied would mean either backfilling under pressure or waiving the law, and a
law waived once is not a law.

| # | Source | Retrieved | Grade | Supports | Outcome |
|---|---|---|---|---|---|
| E27 | [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | 2026-08-31 | S | Deny by default -- "the application must always make a decision, whether implicitly or explicitly, to either deny or permit"; centralize the handling of failed access-control checks; validate permission on every request through middleware rather than per handler; handle every failed check "no matter how unlikely they seem" | ADOPT (ADR-010, ADR-019) |
| E28 | [OWASP Non-Human Identities Top 10 (2025)](https://owasp.org/www-project-non-human-identities-top-10/) | 2026-08-31 | S | Machine identities are a distinct risk class: NHI1 Improper Offboarding, NHI5 Overprivileged NHI, NHI7 Long-Lived Secrets | ADAPT (ADR-018) |

**Where precedent and this architecture diverge**, recorded in each ADR rather
than smoothed over:

- **ADR-003** -- OWASP and PostgreSQL establish FORCE RLS, a non-owner request
  role and transaction-local context. Neither argues for a SANCTIONED
  cross-tenant path on the grounds that without one somebody improvises a
  privileged connection. That is ours, held by T14/T15.
- **ADR-010** -- OWASP says CENTRALISE authorisation. It does not say WHERE. That
  it belongs to the application rather than the identity provider follows from
  membership having to be readable under the boundary it enforces.
- **ADR-015** -- the multi-membership tautology is in no source found. OWASP
  gives the right rule, and we would still have implemented it wrongly, because
  the rule and the tautology are indistinguishable from inside the code.
- **ADR-018** -- the NHI Top 10 catalogues machine-identity risk; it does not
  prescribe modelling a machine as a distinct principal TYPE. The audit
  requirement does. One provider claim behind this ADR remains UNVERIFIED and is
  flagged there.
- **ADR-019** -- deny-by-default is standard; a bidirectional permission
  vocabulary with tombstones is not, and is not yet implemented.

**Freshness.** STANDARD sources (PostgreSQL, OWASP, OpenAPI) are re-checked when
the architecture or a major version changes. PRODUCTION precedent stays valid as
precedent. PROVIDER capability (E25, E26, Neon, Vercel) is freshness-sensitive
and re-checked when depended upon -- E25 in particular carries a revisit trigger.

---

## Stage 0 baseline — route JavaScript, measured 31 August 2026

Grade **X**. This is an Xforge measurement, not external precedent: it grades
nothing and proves only what this build does on this commit.

Section 22 requires per-route budgets. The design-system plan requires the
measurement to come *before* the budget, because a threshold written first is a
number somebody invented, and the first reader to grep it treats it as evidence.

Measured by `tooling/perf/route-bundle-size.mjs` at commit `68b2184`, Next
16.3.3 with Turbopack, production build, gzip level 9:

| Route | Initial client JS | Spare under 180000 B |
|---|---|---|
| `/_global-error` | 133120 B (130.0 kB) | 46880 B |
| `/_not-found` | 140838 B (137.5 kB) | 39162 B |
| `/employees/[employeeId]` | 146330 B (142.9 kB) | 33670 B |

**The framework floor is 130 kB.** Roughly 89% of every route's budget is spent
before any Xforge code runs. The entire design system — tokens, primitives,
command palette, data grid — is being built into **33.6 kB of headroom** on the
only real screen. That number is the constraint Stage 6 is designed against, and
it is why the palette is dynamically imported rather than bundled.

**Checked against ground truth**, because manifest archaeology is exactly the
kind of measurement that is confidently wrong. The tool predicted 180358 B of
JavaScript for `/_not-found`; the running production server transferred
180803 B — 0.25%, attributable to its gzip level. (Both figures predate the
`noModule` correction below, which applies equally to each.)

**Two defects the first measurement caught, recorded because both would have
set a wrong budget silently:**

1. *Shared chunks counted twice.* `entryJSFiles` spells a chunk
   `static/chunks/a.js` and `clientModules` spells the same chunk
   `/_next/static/chunks/a.js`. Deduplicating the strings inflated the employee
   route by 16857 B. Fixed by deduplicating resolved paths on disk.
2. *The legacy polyfill bundle counted as initial.* Next loads it with
   `noModule`, so no browser supporting ES modules ever requests it — 39520 B
   that nobody downloads. Counting it put the employee route at 185850 B,
   **over** section 22's default, and the honest-looking response would have
   been to record an `explicit` exemption on the only real route in the
   repository, on day one, for bytes that do not exist. It is now measured and
   reported separately rather than dropped, so the exclusion stays visible.

**What this does NOT prove.** Nothing about runtime performance: no LCP, no CLS,
no TBT, no interaction latency. Those are the NAVIGATION and INTERACTION lanes
and are not yet implemented, so section 22's `largestContentfulPaintMs` sits in
the budget file with a threshold and no tool behind it — stated in the file
rather than left to be discovered. It also proves nothing about a CDN: the gate
is a stable proxy at a pinned gzip level, and real transfer will be lower.

**The gate.** `tooling/perf/check-budgets.mjs`, wired as the `perf-budgets`
verify stage and covered by 15 unit tests, 8 of which assert it *rejects* a
violation — ADR-024's rule, applied to the tool that enforces this table.

---

## Stage 1 — the UI grammar validates in bounded time, measured 31 August 2026

Grade **X**. An Xforge measurement against `ajv` 8.20.0.

The generated UI schema (`packages/ui/generated/schema.json`) expresses the
grammar as a union over permitted components at every slot. Written the obvious
way — `anyOf` over the eleven registered components — validation cost is
**exponential in nesting depth**, because a validator collecting all errors
explores every branch at every level and descends the whole subtree of each:

| Depth | `anyOf`, `allErrors: true` | discriminated `oneOf` |
|---|---|---|
| 6 | 110 ms | 3.6 ms |
| 8 | 548 ms | — |
| 10 | 4 700 ms | 0.1 ms |
| 12 | **80 598 ms** | — |
| 20 | not attempted | 0.0 ms |
| 40 | not attempted | 0.1 ms |

**Why this is a security finding and not a performance note.** Metadata
documents are *tenant configuration* — untrusted input, authored by anyone
permitted to customise a screen. A fifteen-level document would have hung the
validator: a denial of service in the metadata plane, one of the four
architecture planes. It was found only because a test asserted the schema
accepts a document deeper than `MAX_NESTING_DEPTH`, and that test never
returned.

**The fix** tags every union with an OpenAPI `discriminator` on `component`, so
branch selection is a lookup rather than a search.

**What this does NOT prove, and it matters:**

- `discriminator` is an **OpenAPI keyword, not JSON Schema 2020-12**. Correctness
  must not depend on it and does not — every branch carries a distinct
  `component` const, so exactly one can match and plain `oneOf` semantics are
  identical. A validator ignoring the keyword reaches the same verdict, slowly.
  **Only the cost depends on the tag.** Any validator other than ajv must be
  re-measured before it is trusted with untrusted input.
- The numbers are ajv 8.20.0 on one machine. The five-orders-of-magnitude gap is
  the finding; the individual timings are not a benchmark.
- Nesting depth is still **unenforced by the schema** — JSON Schema cannot
  express a recursion bound. `MAX_NESTING_DEPTH` remains a validator obligation
  and no validator implements it yet, because no metadata renderer exists to
  own one. Recorded here rather than left to be discovered.

---

## Correction — the E2E stage was testing a stale build, 31 August 2026

**Three verify runs reported "5 flagship E2E specs passed" against a build that
was not the one the gate had just produced.** Recorded as a correction rather
than a fix note, because the claim was made in this register's own commits.

A `next start -p 3100`, launched at 23:00:12 to check the Stage 0 route-size
metric against ground truth, outlived the task that started it — `TaskStop`
killed the wrapper shell, not the `next` child. Playwright's
`reuseExistingServer: !process.env.CI` then reused it on every subsequent run.

`pnpm verify` runs `build` and then `e2e`. For two hours the `e2e` stage
therefore exercised an artefact from before two rebuilds, and passed each time.

**Why nothing noticed.** Not one of the five existing specs depended on anything
the rebuilds changed — they assert DOM structure, keyboard behaviour and API
transport, all of which were identical in the stale build. The specs were
correct, the app was correct, and the gate was green; only the *subject* was
wrong. The first spec to read a computed style found the server returning
Internal Server Error for a CSS chunk whose filename no longer existed.

This is the repository's recurring defect in a new costume, and worth naming
precisely: a fact acquired a second source — "the build on disk" and "the build
being served" — the two agreed for as long as nothing rebuilt, and agreement is
indistinguishable from correctness right up until it ends.

**Fix.** `reuseExistingServer: false`, unconditionally. A gate that builds and
then tests must test what it built; a second of startup is not a reason to
leave that to chance.

**What this does NOT invalidate.** The unit, contract, tenancy, integration and
migration stages never touched the server. The Stage 0 route measurement read
build manifests from disk, not from that process, and its ground-truth check ran
against the server while it was fresh.

**And the affected E2E runs turn out to have been valid — measured, not argued.**

The first version of this entry reasoned that Stage 0 and Stage 1 touch no file
reaching the app bundle. That is an inspection claim about an import graph, and
`packages/ui` *is* imported by the application, so it rested on the index not
re-exporting the registry. The instrument that settles it without inspection is
the one we would demand of anyone else's claim: build both commits and compare
the client output.

| Commit | Client output, `BUILD_ID` normalised |
|---|---|
| `68b2184` — pre-Stage-0 baseline | `dce331e8224dc157…` |
| `464b2b5` — Stage 1 | `dce331e8224dc157…` |

Identical, 12 files each. The stale server was serving a client bundle
byte-identical to what those commits build, so their E2E results stand.

**The normalisation is itself a finding.** Two builds of identical source do NOT
produce identical output: three filenames carry a per-build random `BUILD_ID`.
Their *contents* are identical — 9 of 12 files match exactly, and the other 3
match in content and differ only in name. So `next build` is content-
deterministic, and a naive hash comparison reports a difference that is not one.
The first comparison run did exactly that and would have supported the opposite
conclusion.

That random id is also what makes build freshness checkable rather than
assumed, and `e2e/build-freshness.spec.ts` now asserts the served document
carries the `BUILD_ID` on disk and that every static asset it references exists
in this build and serves.

**Why the fix is unconditional rather than a note in a runbook.** That Stage 0
and Stage 1 were unaffected is luck, not design. Stage 2 is the first commit to
change an app-bundle input — `ui.css` and the generated `tokens.css` — and it is
exactly the commit whose specs caught the problem. Reverse the order and three
green runs would have been reporting on code nobody had executed.

---

## Stage 3 — Base UI verified against the installed artefact, 1 September 2026

Grade **X** for the measurements, **V** for the capability check. E18 recorded
that shadcn defaults to Base UI; this checks the package we actually depend on
rather than the article about it.

| Claim | Checked against | Outcome |
|---|---|---|
| `@base-ui/react` is the current package at v1.7.0 | npm registry, `dist-tags.latest` | Confirmed. The older `@base-ui-components/react` is stuck at `1.0.0-rc.0`, so the rename is real |
| Tree-shakable | `sideEffects: false` in the installed `package.json`, plus the measurement below | Confirmed |
| **No Table or DataGrid** | 83 subpath exports; nothing matching `table` or `grid` | Confirmed — the grid is ours to build, as the plan assumed |
| Dialog owns focus and labelling | `dialog/index.parts.d.ts`: Root, Trigger, Portal, Backdrop, Viewport, Popup, Title, Description, Close | Confirmed |
| `Input` wires itself to `Field` automatically | `input/Input.mjs` renders `Field.Control` internally | Confirmed by source, not by the doc comment beside it |
| `Checkbox` participates in `Field` too | `checkbox/root/CheckboxRoot.mjs` calls `useFieldRootContext()` | Confirmed |

**Adding Base UI cost the employee route nothing — measured, not assumed.**

| | `/employees/[employeeId]` |
|---|---|
| Before `@base-ui/react` + Dialog | 146330 B |
| After | 146330 B |

Byte-identical. The barrel file does not force unused primitives into a route.

**The cost is DEFERRED, not zero, and repeating this measurement per tranche
would be true and misleading.** Nothing here renders a Base UI component, so
nothing has yet paid for its floating, portal and focus-management internals --
a cost paid ONCE at the first real mount and then amortised across every
component sharing it. Measuring zero again for tranches 2, 3 and 4 would invite
the aggregate conclusion that Base UI is free.

The informative measurement is therefore at the FIRST REAL MOUNT -- the stage 5
harness or the stage 7 artifact -- and not at each tranche. Until then the only
claim supported is the one made here: an unused primitive costs an unrelated
route nothing.

**Re-measured after Skeleton and EmptyState: 146330 B -> 146333 B.** Three
bytes, and worth stating precisely rather than rounding to zero. Inspecting the
route's client chunks shows they contain no reference to `Skeleton`,
`EmptyState`, `Dialog`, `xf-skeleton` or any Base UI module -- nothing leaked.
The delta comes from content-hashed chunk FILENAMES changing length, and those
names appear inside the bootstrap chunk.

So the metric carries a few bytes of naming noise whenever chunk content shifts.
Recorded so nobody spends an afternoon hunting three bytes, and so a future
delta of a few hundred is read as real rather than dismissed as the same noise.

**Two defects found in the wrapper by checking rather than trusting:**

1. *The trigger was not a button — and the first fix was an overcorrection.*
   It was written as `<Dialog.Trigger render={<span />}>` with a `Button` inside,
   which replaced real button semantics with a `<span>` carrying the handler and
   nested one interactive element in another. The response was to conclude no
   control could go there and make the slot take text. **That was wrong.**
   `render?: React.ReactElement | ComponentRenderFn<…>` is Base UI's composition
   mechanism for exactly this case: the trigger slot accepts a `Button`, and the
   runtime composes it rather than wrapping it.

   The fix was never to narrow the language. Doing so would have set a precedent
   for Tooltip, Popover, Menu and Combobox, each of which composes a caller's
   control the same way — and the narrowing was invisible as a mistake because
   the resulting grammar still *worked*, on a smaller vocabulary.
2. *The `List` contract permitted what its component forbade.* Deriving one prop
   per slot turned a latent disagreement into a compile error: the contract said
   `min: 0` while the component required children. An empty collection is an
   EMPTY STATE — a different component that says something useful — never a
   `<ul>` with nothing in it, which is what the screen already does.

   This is the **first case where deriving props from contracts caught something
   no test would have.** Both halves were internally consistent and every suite
   was green; only the derivation put them in the same place. Worth recording
   for the day someone proposes hand-maintaining the prop types, because the
   argument for the derivation is not tidiness — it is that this class of
   disagreement is otherwise invisible.

**The debt this stage creates, stated rather than discovered later.** Dialog is
the first contract whose `interaction.profile` is in
`PROFILES_REQUIRING_AT_EVIDENCE`. Its keyboard and focus behaviour is delegated
to Base UI and **is not yet verified in a browser here**, because nothing mounts
a Dialog: the conformance harness that would mount one is stage 5, and building
a second mounting mechanism now would be the two-sources defect again. No
metadata renderer exists either, so nothing can reach the contract yet. A unit
test names the owed evidence so the list cannot grow while nobody records
anything.

Two qualifications on that list, recorded now rather than argued later:

- **`Field` is not a meaningful evidence unit on its own.** Its behaviour is
  label-to-control, description-to-control and error-to-control association,
  none of which exists without a control. The evidence fixtures are therefore
  compositions — Field+Input, Field+Checkbox, later Field+Combobox — never
  `Field` in isolation. Its profile marks the obligation; the fixture is how the
  obligation gets discharged.
- **Stage 8's gate must be PENDING before the design-system phase.** Every
  contract here ships at `interactionRevision: 1` with no recorded evidence, so
  a gate written as "revision must not exceed the revision with evidence" is red
  the day it is written and stays red until an assistive-technology session
  nobody has scheduled. It needs the `unmet()` treatment — a certification
  precondition, not a permanently-red stage people learn to scroll past.

---

## Stage 5 — the conformance harness, and what it found, 1 September 2026

Grade **X**. The harness renders the emergency-contacts screen from
configuration and compares the result against the hand-built screen that ships.

**What it establishes.** The accessible trees are IDENTICAL — roles, names,
states and order — for the empty state and the populated list, and the Tab order
matches. The grammar can express the screen it was designed from. It refuses an
unregistered component, a Button where only ListItem is permitted, and a
document nested past `MAX_NESTING_DEPTH`.

The depth bound was recorded as owed by "the validator" when the generated
schema could not express it. **This is that validator**, and the obligation is
discharged rather than still noted.

### The finding: a fifth of the vocabulary could appear in no document

`Field` was accepted by no slot anywhere. `Input` and `Checkbox` are reachable
only through `Field`, so three of fifteen contracts were unreachable — valid,
type-checked, schema-correct vocabulary that no document could legally contain.

Nothing else could have seen it. The compiler checked components against
contracts. The schema checked documents against the grammar. The guards checked
imports and stylesheets. **Not one of them asks whether a component can ever be
used**, and the only thing that does is trying to use it.

The naive fix would have reintroduced a defect: letting a layout slot accept
kind `field` admits a bare `Checkbox`, whose accessible name comes from a Field
that is no longer there. So capability is split in two —

| Capability | Meaning |
|---|---|
| `field-control` | a raw control, named by the Field that wraps it — Input, Checkbox |
| `form-field` | the labelled result, which layout may hold — Field |

`Stack` accepts `form-field`. A unit test now asserts every contract except
`Page` (the root, contained by nothing) is accepted somewhere.

### The A11y-2 debt is discharged; A11y-3 is not

Dialog, Field, Input and Checkbox had never been mounted anywhere in this
repository. Their behaviour was delegated to Base UI and confirmed by reading
its source, which is not the same as observing it. Hand-authored APG conformance
specs — not generated from the contracts, so they can disagree with them — now
verify in Chromium that:

- the trigger is a real `<button>`, neither a `<span>` wrapper nor a nested button
- the dialog is named by its title and described by its description
- focus moves in on open, does not escape under ten Tab presses, and returns to
  the trigger on Escape
- the text input and the checkbox each take their accessible name from their
  Field, and the input its description
- every control, including the checkbox, meets the 24px target floor

**Still owed: A11y-3, now for one contract rather than four** — see ADR-025.
The gate is derived from `interaction.profile` and covers components that manage
focus themselves or announce state the DOM does not carry: `modal`, `composite`,
`composite-grid`. Field, Input and Checkbox rest on native semantics that axe
checks statically and the specs above check in Chromium, so they are no longer
gated — a deliberate reduction whose residual risk (announcement order,
verbosity, virtual-cursor traversal, none of which A11y-2 observes) is accepted
rather than eliminated. They remain in scope for the first session that runs.

Dialog is the one contract still owing, and has no recorded session. That is a
single sitting rather than a batch, which is the point of the reduction.

### Honest limits

- The harness is a **Playwright fixture**, injected with `setContent` from a
  Vite-built bundle. It is not a route, so none of it ships: a route would put
  the runtime registry, the generated schema and a JSON Schema validator on
  somebody's critical path and spend budget nobody allocated.
- It is **not a metadata renderer and must not become one.** The permitted
  pipeline is static config → schema validation → depth validation → registry
  resolution → render. No API, policy, permissions, expressions, workflow,
  persistence, routing or conditional visibility.
- The seven-state vocabulary (`loading`, `partial`, `forbidden`, `conflict`,
  `error`) is **not** exercised, because it does not exist yet — stage 4 is
  unbuilt. `empty` and `ready` are covered because the screen has them.
- The `dialog` document is **not part of the shipping screen.** It is the
  smallest document that mounts the components owing evidence, which is what the
  conformance specs needed and what nothing else provided.

### Still deferred: the first-mount bundle cost

The harness bundles to 132 kB gzipped, but that number answers nothing about the
product: different bundler, and it includes `ajv`, which no route will ever
ship. The informative measurement remains what a real route pays for its first
Base UI component, and no route mounts one yet.

### The class of check reachability belongs to

Every gate that existed before validated a RELATION: component against contract,
document against grammar, import against the dependency direction. Reachability
was the first that validated a **property of the grammar itself**, and that is
why it stayed green for so long while being false.

Two more of the same class were added while the question was fresh, and one
dead slot now trips four independent checks:

| Property | Failure it catches |
|---|---|
| every component is accepted somewhere | vocabulary no document can contain |
| every slot resolves to a component | a slot that can never be filled, so its owner is partly unusable |
| every capability is provided AND accepted | a property nothing reads — `form-field` enforcing nothing |

The third is subtler than it looks: `form-field` exists to keep a bare Checkbox
out of layout, and it does that only while some slot still accepts it. Rewrite
the last such slot to a kind list and the capability remains declared, remains
provided, and quietly enforces nothing.

### Two claims from the last entry, corrected

**The harness does not accrete state.** `e2e/global-setup.ts` runs
`delete from emergency_contact` unscoped, so every run starts empty for both
employees. The concern was reasonable and does not apply.

**The harness is not exploiting a missing constraint.** `employee_id` carries no
foreign key because **there is no employee table** — the schema holds
`emergency_contact`, `tenant`, `tenant_domain` and `tenant_membership`, and
nothing else. Law 14's person → employee → employment is HR-phase work.

So the fabricated id is legal against today's schema rather than slipping past a
weakened one. It becomes illegal the day an employee table and its foreign key
land, and the fixture will then need to seed a real employee. Recorded because
that failure will arrive in a phase where nobody is thinking about a UI harness.

### A named rule, after paying for it three times

> **Do not assert on an instantaneous value when the property is about a settled
> state — and when you switch to waiting, pin the destination.**

Three instances this round, each looking unrelated:

| Where | The instantaneous thing | The settled property |
|---|---|---|
| `tokens.css` mode blocks | which block the generator emitted last | the composed value, whatever the order |
| E2E spec files | which filename sorts first | each suite's own data, independent of order |
| dialog focus trap | `activeElement` during the wrap | where focus comes to rest |

The third was a 1-in-6 flake that always failed on the fourth Tab, in a dialog
with exactly four focusable descendants — a diagnosis rather than a symptom, and
only visible because it was characterised with `--repeat-each` instead of
re-run.

**The correction to the correction matters as much.** Replacing the instant read
with `expect.poll` tolerated the transition and also accepted focus LEAVING the
dialog and being restored a moment later, which is the escape the test exists to
catch. Waiting widens the passing set unless the destination is pinned: the
assertion now requires the sequence to visit exactly four distinct elements and
repeat with period four.

A fourth instance will look different again, which is why this is written as a
rule rather than three observations.

### Two distinctions to carry into stage 4

**`PartialReason` may need to be plural.** A bounded read that hit its cap AND
had an enrichment source fail is one state in the type and two things to tell
the user. A single `reason` forecloses that silently. To be settled when the
wire marker is decided — either a list, or a recorded rule that the first reason
wins and why.

**Renderable is not producible, and they need separate checks.** `Field` was
unreachable because no slot accepted it: a static property of the grammar, which
the harness can decide. A STATE is unreachable if no code path constructs it,
which is a property of the experience layer and invisible to the harness. A
green "every state renders" check is not evidence that anything produces
`partial` — and reading it as such is exactly how `partial` becomes decoration.

---

## Stage 4A — `partial` gets a producer before it gets a type, 1 September 2026

Grade **X**. Recorded because the interesting part is what adding ONE test file
exposed, not the feature.

**The producer is real, not manufactured to justify the state.** The
emergency-contacts read was UNBOUNDED — one pathological employee and a screen
attempts arbitrarily many rows. Bounding it is a safety fix that happens to
produce genuine incompleteness, which is the only kind of producer worth having.

It fetches `LIMIT + 1` and returns at most `LIMIT`. That extra row is the whole
mechanism: `returned === limit` does not prove a further row exists, so
inferring incompleteness from a count would report a complete list of exactly
`LIMIT` as truncated forever. An integration test pins that boundary.

`completeness` is present on EVERY response. A marker that appears only when
something is wrong is one whose absence a client reads as success without having
looked — and every client that forgets is silently correct until it matters.
Reasons are a LIST: a bounded read that hit its cap while an enrichment source
failed is one response with two independently meaningful degradations, and a
precedence rule discards one. `enrichment_unavailable` is deliberately undefined
— nothing produces it.

### Four defects from adding one integration file, three of them pre-existing

| Found | Property it violated |
|---|---|
| a forged `VerifiedTenantContext` | only `packages/tenancy` may construct one (guard caught it) |
| integration files raced on seeding | tests sharing a database must not run in parallel |
| the **unit** stage ran `*.integration.test.ts` | a stage's name must match what it runs |
| the fixture's `valid_from` boundary | law 20's half-open interval, across two clocks |

The third had been true for months and was invisible because exactly one
integration file existed: a stage called "unit tests" was running database
tests, in parallel, and reporting their count as unit tests. The published
figures were overstated — 443 unit, 17 integration, not 460 unit.

**The fourth cost three wrong diagnoses**, and the signature that settled it was
one I had glossed: only the FIRST test failed and the rest passed. A wiped
membership fails everything; a BOUNDARY fails only until time moves past it.
`valid_from` defaults to the DATABASE's `now()` while `hasActiveMembership`
compares against NODE's `new Date()` — two clocks either side of a half-open
interval.

**Still latent:** `tests/fixtures/tenancy.ts` has the same race for every caller,
including the contract suite. Fixed locally rather than in the shared fixture,
whose callers include the tenancy attack suite; recorded so the next
intermittent "membership denied" is recognised rather than re-diagnosed.

**The durable fix was additive seeding, not serialisation.** `seedTenancy`
clears `tenant_domain` and `tenant_membership` unscoped to give itself a known
starting state — correct for one file, unusable from two whatever the ordering.
The bounded-read fixture inserts only what it needs and deletes nothing, so two
files converge instead of destroying each other. Serialisation is defence in
depth; it was never the guarantee.

### Integration fixture law

Four hidden assumptions surfaced the moment a SECOND integration participant
existed. None was a new defect; each had been true and unverifiable while there
was one of everything. Written as rules, because the fifth will look different
again:

> **1. A stage's name must match what it runs.** A stage called "unit tests" may
> not execute anything that needs a database. It did, for months, and reported
> the count as unit tests.
>
> **2. Suites sharing a database do not run in parallel.** Defence in depth, not
> the guarantee — see rule 3, which is what actually holds.
>
> **3. Fixtures are ADDITIVE. A test may create state it owns, and delete state
> it uniquely owns. It may not restore global truth by clearing a shared
> table.** `seedTenancy` cleared `tenant_domain` and `tenant_membership`
> unscoped to give itself a known starting state: correct for one file,
> unusable from two whatever the ordering. Additive fixtures converge;
> destructive ones race.
>
> **4. A time-bound fixture states its own clock.** Never the column default,
> and never an interval subtracted from `now()`. `valid_from` defaulted to the
> DATABASE's clock while the check compared against NODE's, and a margin of
> `now() - interval '1 second'` would have made the symptom vanish while leaving
> two clocks either side of a half-open boundary. `FIXTURE_VALID_FROM` is a
> fixed instant, so no clock is consulted at all.
>
> **5. No semantic state without a producer.** Applied to
> `enrichment_unavailable`, and the reason `partial` got a bounded read before
> it got a type.

Rule 4 is now fixed in the SHARED fixture rather than only where it was found.
T18 depends on a membership resolving before it revokes one, so it carried the
same race; 67 tenancy assertions still pass with validity stated explicitly.

### Producibility and renderability have separate owners, permanently

> A component fixture proving `{ status: 'partial' }` renders proves nothing
> about whether production code can construct it. An integration test proving a
> read truncates proves nothing about what an operator sees.

| Question | Owner |
|---|---|
| can this state be produced? | the repository, against real PostgreSQL |
| does it survive the wire? | the contract test |
| is the meaning preserved? | the experience mapper (stage 4B) |
| can it be rendered? | the conformance harness (stage 4C) |

Recorded as a named rule so a future "partial state test" cannot quietly become
one check standing for four.

---

## An enforcement mechanism must prove that it can fail, 1 September 2026

The underlying law behind the guard-proof harness, promoted from practice after
it caught a guard that could never have fired.

> A guard matching nothing is INDISTINGUISHABLE from a clean workspace. The
> only way to tell them apart is to make every guard reject something on
> demand.

A crashing guard says "I do not know". A silently neutered one says "I checked,
and everything is fine" — which is worse, because it is indistinguishable from
evidence.

| Fact | Established by |
|---|---|
| the guard CAN reject | a violating fixture it must flag |
| the guard does not over-reject | a clean near-miss it must not flag |
| the repository complies | the workspace scan |

Three different facts. `22 proven, 0 broken` is the first two; `PASS ... 325
file-checks` is the third. Collapsing them is how `function check() { return [] }`
becomes the greenest guard in the repository.

### The escape that arrived six times

A regex word boundary reaching a file as a literal BACKSPACE (U+0008). It
compiles, lints, type-checks, reads correctly in an editor, and never matches.

The sixth occurrence was **inside the guard written to catch the fifth** —
`/\bwhere\b/i` arrived as `/<BS>where<BS>/i`, so the where-clause exemption never
fired and every scoped delete looked unqualified. Found in minutes only because
the mutation harness reported it BROKEN.

Two responses, and the second matters more:

- `no-control-characters-in-source` rejects invisible characters that can change
  meaning — C0 except tab, newline and return, plus U+00A0, U+200B, U+2028,
  U+2029 and the bidi overrides U+202A–U+202E. Written with no escape sequence
  anywhere, because a guard against mangled escapes that used one could be
  disabled by the bug it exists to catch.
- **The cause is upstream.** Backslash escapes do not survive this write path.
  Regex escapes are written byte-wise or through file tools, never through a
  shell heredoc.

**What the guard cannot see, stated rather than implied:** an escape arriving as
a REAL newline. Tab, newline and return must stay legal, so that case is outside
it — and it is exactly what broke this guard's own fixture, one line after the
guard was written. Discipline in the write path is what covers it, not the guard.

### What `fixtures-delete-only-what-they-own` found on its first scan

Three violations, one of them a false safety claim:

`emergency-contacts.contract.test.ts` set a tenant context and issued a
context-free DELETE, commented *"RLS is FORCED, so even the owner is subject to
policy"*. Checked against the live database rather than reasoned: the role is
`postgres`, with `rolsuper` and `rolbypassrls` both true. A superuser bypasses
row security unconditionally and FORCE binds only the table OWNER — so the
per-tenant loop deleted every tenant's rows, twice, and would have taken any
other suite's with them.

`tests/fixtures/tenancy.ts` records fixing exactly this once already. **The same
false assumption was living in a second file** — the two-sources defect, and
this time wearing a comment that read as reassurance.

The rule is deliberately an under-approximation: "additive" is not decidable by
pattern, an unqualified DELETE is, and the defect actually hit sits inside what
it catches.

## Stage 4B — the experience state vocabulary, and who produces each member

`no semantic state without a producer` was until now a rule applied by hand. This
records the four facts a state must satisfy and names the owner of each, because
they are genuinely different questions and this project has twice mistaken one
for another.

| `ResourceState` member | PRODUCED BY (a real code path, today)                         | proven by |
|---|---|---|
| `loading`   | the query has not settled                                       | mapper test |
| `empty`     | 200, `completeness: 'complete'`, zero rows                      | mapper test |
| `ready`     | 200, `completeness: 'complete'`, >= 1 row                       | mapper test |
| `partial`   | `emergency-contact` repository probes `LIMIT + 1` and reports `hasMore` (4A) | 4A repo + contract tests, mapper test |
| `forbidden` | `ApiProblem` with 403 from the policy layer                     | mapper test |
| `error`     | any other rejection                                             | mapper test |

`WriteOutcome.conflict` is produced by a 409 carrying a stale version token
(ADR-013). It is deliberately NOT a `ResourceState` member: no read can produce
it, and a union member no reader can construct is the exact modelling error the
producer rule exists to catch.

### What this does NOT prove

- That the states RENDER correctly, or that each is distinguishable to a screen
  reader. Producibility and renderability have separate owners; 4C owns the
  second and it is not yet done.
- That the real screen uses this mapper. `emergency-contacts.tsx` still reads raw
  query flags. Until it is wired, the mapper is correct and unused -- which is a
  weaker claim than it looks, and is recorded rather than glossed.
- That the vocabulary is complete. It is complete with respect to what the
  transport can say TODAY; `redacted` and `enrichment_unavailable` are named as
  absent-with-no-producer, not as omissions.

### Finding: two type systems, one type, opposite answers

orval emitted its string enums as `typeof Code[keyof typeof Code]` over a `const`
object. Biome's type inference resolved that to `never` and reported every `case`
in a switch over it as unreachable ("the value passed to switch can never equal
this value"). tsc resolved it to the literal union.

**The first argument recorded here was wrong, and is kept because the correction
is the point.** It said tsc must be right because `assertNever` in the default
branch type-checks ONLY IF the cases narrow the discriminant to `never`. That
does not discriminate between the two hypotheses: `assertNever(x)` accepts `x`
whenever `x` is `never`, and `x` is `never` both when a union was narrowed away
AND when it was `never` from the start. The observation is equally consistent
with Biome being right.

What actually settles it is the case clause. Against a `never` discriminant,
`case 'result_cap':` is a comparison between types with no overlap, and tsc
rejects that. tsc accepts it here, so the discriminant is not `never` -- and
Biome is wrong.

The conclusion was right and the reason was not, which matters because the reason
is what the next reader reasons FROM. A comment asserting a fact about a type,
with nothing producing that fact, is the same shape as the RLS safety comment one
week earlier.

**Resolved rather than annotated.** orval 8.27 takes
`override.enumGenerationType: 'union'`, which emits `export type PartialReasonCode
= 'result_cap'`. Biome and tsc then agree, all three suppressions are retired, and
the header paragraph explaining them is deleted. Nothing outside `generated/`
consumed the const objects as values, so the change cost two regenerated files.

No type-level assertion pinning the members was added, deliberately. It would
have earned its place while the suppressions existed -- something had to fail if
the emit shape changed. With them gone, two checks already cover it: `assertNever`
breaks the build if the union grows a member, and reverting the config turns the
lint stage red again by reproducing the false positives. A third would be
infrastructure without a named pain.

This is the defect class again, one fact and two sources agreeing until they did
not. Caught by a red lint stage, not a guard, and no guard is proposed: "two type
checkers disagree" is not a shape a path regex can see.

## The guard suite checks 52 of 210 files, and claims to check 159 more

Extending the mutation harness to assert that a rejection is ACTIONABLE -- a
non-empty message, no interpolated `NaN`/`null`/`undefined`, a real line number --
found nothing: 23 proven, 0 broken. The check was then proven able to fail by
breaking a guard's message on purpose and observing BROKEN, because a check that
has never rejected anything is not yet evidence.

Writing it surfaced something larger. `file` reports `run-guards.mjs` as
containing escape sequences, and it does: six literal ESC bytes in the ANSI colour
constants. `no-control-characters-in-source` refuses exactly that, and its
`applies()` returns true for the path. The workspace scan never asks it, because
`sourceFiles()` offers **zero** files under `tooling/`.

Two sources for "what is source", agreeing for as long as nobody compared them:

```
repository files tracked by git      210
offered to the guards                 52
claimed by some guard, never offered 159
findings hiding in those files        38
```

Classified, because the number alone would be alarming and misleading:

| class | count | verdict |
|---|---|---|
| `.architecture/*.md`, `CLAUDE.md` -- prose QUOTING a forbidden pattern | 20 | not violations |
| `tooling/architecture/fixtures/index.mjs` -- the deliberate violating fixtures | 7 | not violations |
| `tooling/architecture/guards/index.mjs` -- a guard's own matching source | 2 | not violations |
| `tests/architecture/tenancy/*` -- architecture tests exercising the pattern | 3 | needs a decision |
| `tooling/architecture/run-guards.mjs` -- literal ESC in source | **6** | **real, and fixed** |

So the narrow scan universe is not an oversight; it is an unstated exclusion list
doing real work. What it is not is a DECIDED one. It excludes documentation and
fixtures for good reasons that were never written down, and it excluded the
harness's own source for no reason at all.

The six were fixed by building the colour constants from `String.fromCharCode(27)`,
so no literal control character remains in any tracked file -- verified by
scanning all 210.

**Deliberately NOT done here:** widening `sourceFiles()`. That is a decision with
32 exclusions to design, and designing them badly would produce a guard suite that
is green because it was told to be. Recorded with the counts so the next person
inherits the measurement rather than the impression.

**What this does not prove:** that 52 is the right universe, or that the other 22
guards have accurate `applies()` predicates. It proves only that `applies()` and
`sourceFiles()` disagree by 159 files and that the disagreement was concealing
real findings.

## `WriteOutcome` has five members and one producer

Reads got the producer discipline applied member by member. Writes did not, and
the provenance table above showed it by having a single row.

| `WriteOutcome` | producer today | status |
|---|---|---|
| `conflict` | `modules/hr/index.ts` returns 409; `ApiProblem.isVersionConflict` | REAL, tested |
| `idle` / `saving` / `saved` / `failed` | the mutation hook's own states | NOT YET WIRED |

The last four are not speculative -- react-query genuinely produces idle/pending/
success/error, and `MutationOutcome` is a faithful restatement of them. But
"faithful restatement of a library's states" is a weaker claim than "a code path
in this repository constructs it", and the difference is exactly what rule 5 is
for. They become producer-backed at 4C.0, when the screen stops reading
`list.isPending` and `create.isPending` directly. Until then the honest word is
PENDING, not PROVEN.

## The scan universe is now an enumeration, and `applies()` is its only owner

Widened to every tracked textual file. `sourceFiles()` walked three roots and
offered 52 of 210; `trackedFiles()` enumerates 211 and filters only binaries,
detected by a NUL byte rather than an extension list.

A longer exclusion list in the runner was the obvious fix and the wrong one: it
keeps two owners of "is this file subject to guards" and makes the second one
longer. Exclusions now live on the guard whose property they are an exclusion
FROM, which is the only place the question is answerable. Documentation is
exempt from the delete guard and emphatically not from the control-character
one, and a scan-level list cannot say that -- which is precisely how it hid six
real findings.

```
before   345 file-checks across  52 files
after    700 file-checks across 211 files, 4 exempt, 2 dormant
```

**The 32 reds, each taken as a decision.** Twenty-six collapsed into one derived
rule rather than twenty-six entries: four guards govern EXECUTABLE TYPESCRIPT,
and every one of the 26 was either `.md` prose quoting the rule to explain it or
tooling `.mjs` containing the pattern it matches. The rule was derived from the
evidence, not asserted ahead of it, so its scope is known to be exactly those
cases.

Four needed a named file and survive as declared exemptions, each recording where
the content is checked INSTEAD:

| file | why | checked instead by |
|---|---|---|
| `T02-missing-app-predicate.test.ts` | the unqualified DELETE is the test's subject | the test, more strictly: it asserts the delete returned exactly `[A_ROW]` |
| `resource-state.ts` | the mapper IS the boundary | 16 mapper tests |
| `use-emergency-contacts.ts` | the controller | exhaustive switches ending in `assertNever` |
| `api/[[...route]]/route.ts` | the SERVER side of the same app | contract tests and the tenancy proof suite |

The documentation twenty are checked NOWHERE, and that is written on the guard
rather than implied. Nothing verifies that a code example in `.architecture/`
still reflects the code.

### Two invariants kept, and one of them fired immediately

`no guard governs zero files` -- the depcruise failure, where a tool is
installed, configured, green and blind. It went red on first run against
`ai-tool-no-data-access` and `legal-entity-binding`, whose subjects (`packages/ai`,
`modules/payroll/infrastructure`) do not exist yet. Dormancy is the honest
version of the same zero, and the difference is that somebody wrote it down: a
guard may declare `dormant` with a reason, is then REPORTED every run, and cannot
quietly stay dormant once its subject arrives. Undeclared, it is red. Proven able
to fail by pointing a live guard at nothing.

`exemption counts appear in the output`. 159 files accumulated in silence because
no number was ever printed.

### The `.tsx` proxy enforced a narrower property than the one stated

The first version of the boundary guard banned transport vocabulary from `.tsx`.
What is worth having is that a NAMED, SMALL set of files in `apps/` touches the
generated client. Those coincided only because exactly one `.ts` imported it --
one participant, two descriptions, agreeing. A second `.ts` helper would have
reintroduced the second state machine without going near a `.tsx`.

Replaced with an allowlist, which found a third participant on its first run:
`app/api/[[...route]]/route.ts`, the server mount, legitimate and invisible to the
extension rule.

## What eats the backslash: answered

Seven occurrences, and the mechanism was never established -- "the file tool
holds" was a data point, not a cause. Established now, by probe:

```
emitted              reaches the interpreter as      lands on disk as
'\\n'   (two)       '\n'   (one)                 0x0A
'\n'    (one)       a real newline                  0x0A
'\\0'   (two)       '\0'   (one)                 0x00
```

That table was itself corrupted by the mechanism it describes, and the damage
is the strongest demonstration available: every backslash in it arrived halved,
so the middle column of row three became a literal NUL byte. It sat in this
file for two commits, invisible to an editor and to git -- which inspects only
the first 8KB for its own binary heuristic, and the byte was at offset 61045.
It is written here by constructing each backslash from `chr(92)`, which is the
mitigation this section prescribes, applied to the section prescribing it.

**One backslash level is consumed in transport, before any interpreter**, inside a
quoted heredoc that performs no expansion. Whatever the inner language does with
the SURVIVING single backslash is what reaches disk. Every occurrence follows:
`\b` became a backspace 0x08, and `\0` became a NUL -- the latter inside
`trackedFiles()`, whose own binary detector would then have excluded its own
source.

It also predicts, rather than merely observing, that Write/Edit are safe: their
content is a JSON argument, not interpreter source, and never passes through the
halving step.

The mitigation is now a rule with a reason: **build backslashes from
`chr(92)` / `String.fromCharCode(92)`, or use the file tools. Never rely on
doubling.**

## A file could exempt itself from every guard by containing the byte one forbids

`trackedFiles()` decided a file was binary by looking for a NUL in its contents
and withheld it from the scan. So the exact character
`no-control-characters-in-source` exists to reject was also the character that
made a file invisible to that guard. Not one file's problem: a permanent,
structural hole in that guard's coverage, and self-concealing in the way that
makes a hole survive.

It hid from the tools you would check with, too. Git inspects roughly the first
8KB for its own binary heuristic, and the byte was at offset 61045, so the
evidence register diffed as text, grepped as text, and looked fully covered while
being offered to nothing. Two sources for "is this file binary", disagreeing, and
the one deciding guard coverage was the one nothing displayed.

**Classification is now an assertion, not a filter.** A file is binary because its
PATH says so. `DECLARED_BINARY` is a stated pattern and is EMPTY of matches today
-- measured, not assumed: every extension tracked here (css, json, jsonc, md, mjs,
sql, ts, tsx, yaml, yml and the dotfiles) is textual. Content can no longer change
a file's enforcement class, so malformed contents are a finding rather than an
exemption.

The moment the filter came out the scan went red on
`.architecture/evidence-register.md:1037 — control character U+0000`. The guard
found it immediately once it was allowed to see it.

| proof | result |
|---|---|
| the real register, NUL removed | offered again: 210 files -> 217 |
| an expected-text `.md` carrying a NUL | not classified away |
| the invisible-character guard receives it | rejects it -- fixture `-nul-in-markdown` |
| full workspace | green, register inside the scan universe |

### A number changed and was read past

`211 files` becoming `210` was printed on two consecutive gate runs and neither
was noticed. A printed count is evidence; only an assertion is a check. The runner
now asserts conservation:

```
offered + declared binary == tracked
```

Proven able to fail by dropping one file from the enumeration:

```
Error: scan universe does not conserve: 216 offered + 0 declared binary != 217 tracked
```

That is this project's own guard law applied one level up -- to the scan, rather
than to the guards it feeds. It would have gone red at the commit that introduced
the NUL.

### The table that ate itself

Every backslash in the mechanism table above arrived halved, which is why row
three's middle column BECAME a literal NUL instead of reading a backslash followed by a zero. The section
documenting that doubling does not survive was destroyed by doubling not
surviving. Rebuilt by constructing each backslash from `chr(92)` -- the mitigation
that section prescribes, applied to the section prescribing it.

This paragraph did it AGAIN on the way in, and the guard caught it: the append
that wrote this section carried a NUL to line 1117, inside the sentence
describing how a NUL gets introduced. Third occurrence in one session. What
stopped it was not discipline -- discipline had just been written down two
paragraphs above and did not survive its own next edit. It was the guard, seeing
the file for the first time because this change let it.

### Two defects introduced while making this change, both caught by the gate

**A repo-wide claim from a file-scoped search.** `trackedFiles()` changed from
returning an array to returning the offered set and the withheld set together.
The claim that only `run-guards.mjs` consumed it came from a grep run against
`run-guards.mjs`. `tests/unit/seeded-employee-owner.test.ts` also consumed it and
broke. One participant, two descriptions, agreeing until a second participant
appeared -- the same shape as everything else this register records, arriving in
the change written to close an instance of it.

**A cast is where type-checking stops.** That call site read
`(trackedFiles() as string[])`, so the compiler could not report that the
function no longer returned an array. It failed at RUNTIME, in a suite about
employee identity that had nothing to do with the change. Fixed at the owner
rather than the call site: `util.mjs` now declares its return shape, so consumers
receive a type instead of asserting one.

Worth generalising: an `as` on a value crossing a module boundary converts a
compile-time check into a runtime hope, and the failure surfaces somewhere
unrelated to the edit that caused it.

**What this does not prove.** That no other classifier in the repository decides
by content. `classify()` in `tooling/source-universe.mjs` is path-based and was
not audited for this property; only the binary decision was found and fixed.

## Six read-state obligations, six mutation proofs

4C.2 landed with one of its six specs shown able to fail. The other five carried
the risk the first one demonstrated: `forbidden` had passed by TIMING rather than
by being right -- `getByRole('alert')` matched Next's route announcer as well as
the component's alert, and which one won depended on when the announcer appeared.
That is the E2E form of a guard matching nothing, and it was found by accident.

Each spec was then mutated at the claim it makes, rebuilt, and run alone:

| claim broken | verdict |
|---|---|
| nothing from a settled state is on screen while loading | RED |
| empty states its meaning instead of rendering a list | RED |
| ready offers a Save on every row | RED |
| partial keeps the data usable | RED |
| forbidden offers no retry affordance | RED |
| error offers a retry affordance | RED |

Six of six falsified. The battery is a throwaway probe, not a standing check, and
that is the honest description: it is a measurement taken at one commit, not a
mechanism that will notice if a spec later stops checking its claim.

**The first attempt was not a proof and looked like one.** Flipping `retryable` to
`true` for a forbidden problem left the `forbidden` spec green, and the reason is
that `toResourceState` branches on `code`, never on `retryable`, so the flag never
reaches that rendering. A mutation that changes a fact the spec does not claim
demonstrates nothing, and it demonstrates nothing in the same shape as a passing
test.

### One selection strategy, so all six share a failure mode

Every state is now addressed by its own `data-testid`, with its ARIA role asserted
ON that element. Never by a page-scoped role query.

Both roles are ambiguous at page scope, not just one: Next injects
`#__next-route-announcer__` with `role="alert"`, and an info-toned `Alert` carries
`role="status"` alongside `Status` itself, so `empty` and `partial` each render a
second one.

`Status` gained `testId`, which `Alert` and `List` already declared -- the
inconsistency was `Status` lacking it, not the specs needing it. `contractVersion`
1 -> 2 because the public vocabulary grew; `interaction.revision` unchanged,
because no behaviour moved and no assistive-technology evidence is invalidated.

**Still not producer-proven, deliberately:** `ResourceState.error` with
`retryable: false`. `toProblem` sets that flag false only together with
`code: 'forbidden'`, which routes to the `forbidden` state, so the false branch of
the retry conditional cannot be reached today. No synthetic fixture was added to
manufacture coverage for it. 4C.5 is the named owner: an unknown wire code needs a
reload rather than a retry, and that is the second producer.

## The composition root authenticated every production request as a stub

`apps/web/app/api/[[...route]]/route.ts` applied `devPrincipal` with no
environment gate. Every request in a production build authenticated as
`dev-user` holding `hr.employee.read` and `hr.employee.update`, scoped to
`DEV_TENANT`, which fell back to the fixture tenant when `DEV_TENANT_ID` was
unset.

**What kept it inert.** `resolveRequestTenant` re-verifies against
`tenant_membership` (ADR-022, ADR-023), and `dev-user` owns no membership row, so
a clean production database refused at "Tenant not resolved". Reachable, inert,
and one row from not being inert.

**It was recorded nowhere and covered by nothing.** No ADR, no register entry, no
deferral note; no guard and no test named `devPrincipal` or `dev-user`. The
tenancy suite proves the MECHANISM -- 67 assertions, 30/30 of the matrix -- and
nothing asserted the application was wired to that mechanism rather than to a
stub. A stub is a legitimate phase artefact; an unrecorded one is not.

The fallback contradicted a rule stated nineteen lines above it. `appDatabaseUrl()`
refuses a default connection string because *"a fixture credential compiled into
the application is no longer a fixture"* -- and directly below, the tenant did
exactly that. The `tenant_domain` defect again: a comment asserting what the code
beside it refutes.

### Fixed by failing closed on an OPT-IN, and by moving the fact to its owner

**The first fix was wrong in both directions, and the gate said so.** It tested
`NODE_ENV === 'production'`. `next start` sets NODE_ENV to production, so the E2E
suite -- which exists precisely to exercise the shipped artefact -- lost its
principal and seven specs went red. And a real deployment that never set
NODE_ENV would have been handed one. A variable meaning "which build" is not a
variable meaning "who may authenticate", and using it as both is the two-sources
defect in a single expression.

So the stub is turned ON deliberately: `XFORGE_DEV_PRINCIPAL=enabled`, never
enabled by default. That is what fail-closed has to mean when the signal is
MISSING rather than when it says the wrong thing. Proven able to fail on its own
terms rather than by borrowing the earlier red: removing the opt-in from the
harness makes the empty-state spec fail because the API refuses. 33/33 with it,
red without.

`developmentPrincipal()` throws without that opt-in; `devTenantId()`
has no fallback, mirroring `appDatabaseUrl()`. Both resolve inside the middleware
try, so a misconfiguration and a production build present as the 500 a developer
already knows how to read rather than an unhandled throw. The harness supplies
`DEV_TENANT_ID` from `TENANT_A` exactly as it already supplied the credential.

### The employee sweep had an unfinished half

`7f4c51e` gave `EMPLOYEE` one owner. The tenants were left with eight declaration
sites, measured:

| site | before | now |
|---|---|---|
| `tests/fixtures/tenancy.ts` | the owner | unchanged |
| `apps/web/.../route.ts` | literal fallback, PRODUCTION | env, no fallback |
| `emergency-contacts.contract.test.ts` | two literals beside an import OF THE SAME MODULE | derived |
| `isolation.integration.test.ts` | two literals | derived |
| `platform-access.test.ts` (x3) | literals, no import | derived |
| `T08-no-raw-tenant-id.test.ts` | literal | derived |

`packages/policy/tests/evaluate.test.ts` keeps `11111111-1111-1111-1111-111111111111`
-- all ones, not a v4 uuid, a different value for a different fact. That is the
collision rule working as intended rather than an exception to it.

### `production-carries-no-fixture-identity`

A guard, because the sweep alone is a discipline. It reads the identities FROM
`tests/fixtures` rather than holding a copy -- the same derivation
`BUSINESS_MODULES` uses on the modules directory -- so adding a fixture identity
needs no change to the guard.

Proven twice: against a fixture, and against the real repository. It rejects the
committed composition root at line 60 and accepts the fixed one. 25 guards proven.

**What this does not prove.** That no other stub is wired into a composition
root. `devPrincipal` was found by following a UUID, not by asking the question;
nothing enumerates the places where a phase artefact stands in for a real
subsystem, and no guard proposed here would find the next one.

## `verify --ci` could exit 0 having enforced nothing

Three branches, in this order: fail, then zero-pass, then blocked. The zero-pass
branch exited 0 unconditionally and sat ABOVE the rule that makes a blocked stage
a failure in CI. So a `--ci` run in which every stage was empty, pending or
blocked reported success -- the literal sentence `verify.mjs`'s own header
forbids: *"verify was green" eventually comes to mean "the database tests never
ran"*. The header was right and the control flow did not implement it.

**Reordering two branches would have been the wrong fix.** It repairs the
observed case and leaves this one:

```
0 pass · 0 blocked · 10 empty · 4 pending · --ci   ->  success
```

still green, and the finding's title still true. So the rule is stated
positively rather than as branch order: **a CI verification with zero PASS
stages is never successful.**

`decideGateOutcome({ blocked, ci, fail, pass })` is now a pure function and the
verdict is a state machine tested as one. `pending` and `empty` are deliberately
NOT parameters: they decide nothing, and taking them would invite a reader to
believe they might.

| PASS | BLOCKED | ci | exit | kind |
|---:|---:|---|---:|---|
| 1+ | 0 | yes | 0 | green |
| 1+ | 1+ | yes | 1 | blocked-ci |
| 0 | 1+ | yes | 1 | nothing-enforced-ci |
| 0 | 0 | yes | **1** | nothing-enforced-ci |
| 0 | 0 | no | 0 | nothing-enforced |

The fourth row is the one a reorder would have left green.

**`pnpm verify:ci` was executed, not merely described.** The previous draft of
this work claimed a first `--ci` execution and then ran only `pnpm verify`. Both
now run and both report FULL GREEN, and `--ci` had never executed anywhere before
this.

**What this does not prove.** That `--ci` is safe as remote merge authority.
Nothing has run it on a machine that inherited nothing from this workstation,
and `.github/workflows/verify.yml` triggers only on pull requests and pushes to
`main`, so a branch push would not execute it either. The semantics are fixed;
the independence is not established.

### The escape halving, fourth occurrence

Writing the replacement console output introduced real newlines into JS string
literals, because `\n` arrives halved and the interpreter read it as an escape.
It was a parse error rather than a silent defect this time, and rebuilt from
`chr(92)`. Recorded because the mitigation was already written down in this file
and doubling was still the first thing reached for -- which is the argument for
using the file tools rather than for trying harder.

## The inverse of F7: production source relying on a dev-only declaration

`fixtures-are-not-production-dependencies` stops test material entering a
production closure. Nothing checked the mirror. Biome's
`noUndeclaredDependencies` cannot: it accepts any manifest section as
"declared", so `import x from 'vitest'` in shipped source is silent.

It breaks at INSTALL TIME IN A CONSUMER rather than here. `pnpm install --prod`
omits devDependencies, so the import resolves on this machine and in CI, where
everything is installed, and fails wherever the package is actually consumed.
A green gate for a closure that cannot be installed.

`production-source-declares-what-it-imports` resolves each import against the
nearest `package.json` ABOVE the file -- walked, not listed -- and rejects one
declared only in `devDependencies`.

**"Production-legal" is derived, not narrowed to `dependencies`.** A peer is a
declared expectation the consumer satisfies; an optional one is declared and
handled. `devDependencies` is the single section that says "not needed to run
this package", which is exactly the claim a production import contradicts.

### It found two things about itself before it found anything about the code

**Type-only imports are erased**, so a production install omitting the package
cannot break them, and the types are needed at BUILD time -- when
devDependencies are present. Found on the guard's first run:
`workspace.aliases.ts` takes `Alias` from vite and nothing resolves vite at
runtime. Declaration-time and consumer-time are separate questions, which is the
distinction raised earlier about `postgres` in `@xforge/fixtures` and is why it
was not assumed either way.

**The subject took three statements to state.** `!== 'test'` let
`vitest.config.ts` through -- a config importing its own tool is correct.
`classify(f) === 'source'` then let `tooling/` through, where the nearest
manifest is the root, which declares ZERO dependencies and 27 devDependencies by
design. The property is about a package a CONSUMER installs, so the subject is
the three roots a consumer gets: `apps`, `modules`, `packages`.

Each narrowing was found by the guard rejecting something correct, not by
reasoning ahead of it.

| case | verdict |
|---|---|
| production source -> dev-only | REJECT |
| test source -> dev-only | ACCEPT (not governed) |
| production source -> dependency | ACCEPT |
| production source -> dev-only, TYPE import | ACCEPT |

Two fixtures, resolved against the real `modules/hr` manifest so the proof is of
derivation rather than of a list: change that manifest and the fixtures change
meaning with it. 26 guards proven.

**What this does not prove.** That the closure actually installs. Nothing here
runs `pnpm install --prod` and imports the result; the guard reasons from
manifests, which is a strictly weaker claim than the one the defect is about.

**Observation, not acted on:** `classify()` has no `tooling` class and returns
`source` for that tree, which is why this guard states its roots rather than
deriving them. Adding one would touch every consumer of `classify()` and is not
in this change.
