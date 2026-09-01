```
STATUS: REVIEW RECORD, 2026-09-01 — NOT CURRENT STATE
CURRENT STATE AUTHORITY: .architecture/project-state.md
FINDINGS AS ANSWERED:   .architecture/evidence-register.md
```

Preserved as written, unedited, because a review is evidence of what was true
when it was taken. Four of its claims were corrected in review and the
corrections live in the register, not here: the introduction undercounts its own
findings (four describe ways a bad state reports green, not two); findings 1 and
2 contradict each other, and the accurate claim is "no test that calls
`guard.check()`"; finding 4's summary undercounts what sits below it; and 8.1
attributes the lost comment subject to `7be1e4f`, which `git log -L` and
`git log -G` on the damaged form both place in `ec03a85` instead.

Read it for the findings and the evidence. Do not read it for what is fixed.

---

# Code quality review and refinement — `tooling/`

## Context

`tooling/` (22 files, 5,814 lines) is the enforcement spine: the source universe,
the verify stages, three guard families, the generators and the perf gate. Its
own stated standard is stricter than ordinary code quality — architecture-final.md
23.2, quoted at the top of `guards/index.mjs`:

> "A guard that has never been observed to reject a deliberate violation is not
> yet trusted."

and CLAUDE.md's standing review prompt:

> having fixed something in one place, ask what else holds a copy of that fact.

I read all 22 files and executed the guards, the mutation harness and
`verify --coverage` to check claims against behaviour rather than against prose.

**The code is in good shape.** 24/24 source guards are PROVEN, law coverage
reports 0 unaccounted, and the commentary is unusually load-bearing. The findings
below are not stylistic; every one is an instance of a category this repository
has already named, found by asking its own two questions of its own tooling.

Nothing here is a live incorrectness in the *product*. Two are holes in the gate
that would let a bad state report green, which is the failure mode the whole
directory exists to prevent.

---

## Findings

Ordered by consequence. Evidence for each was executed, not inferred.

### 1. Four contract guards are unproven, and structurally cannot be proven

`contract-guards.mjs` exports 4 guards. `mutationTest()` in `run-guards.mjs`
iterates **only** `guards` (the source family), so:

- no contract guard has a mutation fixture,
- none is exercised by any vitest test (`grep contractGuards` → only its own file
  and `stages.mjs`),
- and the UNPROVEN→FAIL mechanism that protects source guards does not reach them.

`version-token-on-updates` is the one whose *predecessor already shipped broken* —
the file header records it passing its fixture and then false-positiving on the
first real route. It is now checked in the right place and verified by nothing.

Same shape in the config family: **`adr-has-evidence` has no test** (the other
6 config guards each have one). It is the law-34 guard.

Five guards, running in `pnpm verify`, never observed to reject anything. That is
ADR-024's depcruise failure — configured, green, and blind.

### 2. `adr-has-evidence`'s rules are re-implemented in its own test file

`tests/config-guards.test.mjs:242-250` re-derives the guard's three regexes
character-for-character instead of calling `guard.check()`:

| | `config-guards.mjs` | `tests/config-guards.test.mjs` |
|---|---|---|
| section | `:295` `/^##\s+Prior art/m` | `:242` identical |
| dated source | `:302` `/\|\s*20\d\d-\d\d-\d\d\s*\|/` | `:245` identical |
| negative claim | `:310` `/does NOT prove/i` | `:248` identical |

The test passes against its own copy. Change the guard and the test stays green —
a fact with two homes, checked by neither. This is finding 1's cause, not a
separate defect.

### 3. `verify --ci` can exit 0 having run nothing

`verify.mjs:208-247`, in order:

```js
if (failed)          { … process.exit(1) }
if (n(PASS) === 0)   { console.log('Nothing is actually enforced yet.'); process.exit(0) }  // ← no ci check
if (blocked.length)  { … if (ci) process.exit(1) … }
```

The "nothing enforced" branch is evaluated **before** the CI blocked-is-failure
rule and exits 0 unconditionally. A `verify:ci` run in which every stage is
EMPTY / PENDING / BLOCKED — zero passes, any number blocked — reports success.

That is the literal sentence the module's own header forbids: *"'verify was
green' eventually comes to mean 'the database tests never ran'."* The header is
right and the control flow does not implement it.

### 4. Law coverage understates itself, and three `reviewOnly` reasons are now false

The `guards` stage restates which laws it enforces (`stages.mjs:107`) instead of
deriving it from the guards. Measured drift:

| law | enforced today by | `reviewOnly` currently says |
|---|---|---|
| 7 | `tokens-are-the-authority` | "no mechanical test for 'one authoritative source per fact'" |
| 8 | `stylesheet-names-roles-not-primitives` | "activates in the metadata phase" |
| 13 | `no-forged-tenant-context` | (covered via the `rls` stage — undercount only) |
| 32 | `database-image-matches-ci`, `ci-provides-fixture-env` | "self-referential: this file is the definition it refers to" |

`verify:coverage` prints *"8 review or phase gate"*; three of those eight are
mechanically guarded right now. `reviewOnly[7]` says no mechanical test exists,
directly above a guard whose own comment opens *"Law 7: every fact has one
authoritative source."*

This is precisely the `tenant_domain` entry in CLAUDE.md's defect list — a
comment asserting something the code beside it contradicts — and the same
two-homes cause as #2.

### 5. Two CSS guards report the wrong line for repeated declarations

`tokens-are-the-authority:644` and `stylesheet-names-roles-not-primitives:906`
both match against `withoutComments` and then locate the line with
`src.indexOf(m[0])` — the **first** occurrence in the original source. Executed:

```
.a { padding: var(--space-5); }      reported line 1   (correct)
.b { padding: var(--space-5); }      reported line 1   (should be 2)
.c { padding: var(--space-5); }      reported line 1   (should be 3)
```

Findings are correct; their locations are not. A guard whose output points at the
wrong line trains people to distrust it. (`unusableFinding()` in `run-guards.mjs`
already asserts a finding is *actionable* — a non-integer line is BROKEN — so this
sits just under a check that was written for exactly this concern.)

### 6. The operationId rule has two implementations, both running

| | |
|---|---|
| `stages.mjs:278-294` | walks `doc.paths`, own `verbs` array, collects missing `operationId`, FAILs |
| `contract-guards.mjs:53-67` | walks `doc.paths`, own `VERBS`, collects missing `operationId`, violation |

Both run in one `pnpm verify` (the `contract` stage and the `guards` stage). The
operation **count** is computed twice too (`stages.mjs:286` vs
`contract-guards.mjs:160`), and the verb list is written three times — those two
plus `emit-openapi.ts:31`. They agree today.

### 7. Guard exemptions are never checked for staleness

`scanWorkspace()` prints every `exempt` entry unconditionally. If an exempted file
is renamed or deleted, the entry is reported as an active exemption forever.

All 4 current exemptions are live — verified. The asymmetry is the point:
`check-budgets.mjs:54-60` already catches exactly this for routes ("*budgeted but
not built — a stale entry silently stops gating anything*"). The same reasoning
was applied to budgets and not to exemptions.

### 8. Smaller items

- **`guards/index.mjs:741`** — a doc comment lost its subject in transit:
  `*  sits at the bottom of the dependency direction.` (double space, no noun;
  `cat -A` confirms no control character). Introduced in `7be1e4f`. The file
  documents this exact class of loss five paragraphs earlier.
- **`run-guards.mjs:145-156`** — `extraOk ? unusableFinding(…) : null` then
  `if (extraOk && unusable)`: the guard is redundant, since `unusable` is `null`
  whenever `!extraOk`. Three branches collapse to a linear `if / else if / else`.
- **`run-guards.mjs:108`** — extra fixtures are matched by `startsWith(id + '-')`.
  No collision today (checked all 24 ids); silently mis-attributes if one guard id
  ever becomes another's prefix.
- **`scanWorkspace()`** — `read(f)` sits inside the per-guard loop: **720 reads
  for 215 files** (3.3×). It runs on every `Write|Edit` via the PostToolUse hook.
- **`emit-openapi.ts:26-27`** — cwd-relative `mkdirSync('contracts')`, where
  `tokens.mjs:72` and `emit-ui-schema.ts:65` both derive `ROOT` from
  `import.meta.dirname`. Correct under `pnpm`, wrong from any other cwd.
- **`no-hand-edit.mjs`** — mixes `\n` / `’` escapes (`:65-68`) with the
  deliberate `String.fromCharCode(10)` (`:78-82`) in adjacent branches of one
  function. Pick one; the file's own subject matter argues for the latter.
- **`contract-guards.mjs:29`** — `deref` returns the unresolved node past depth 10
  rather than throwing, so a pathological `$ref` chain yields a silent false
  positive ("no version token") instead of an error. `tokens.mjs:154` throws in
  the same situation.

---

## Approach

Fix the **cause** in each case, not the symptom — the causes are the two the
repository already names.

### A. One proof harness for all three guard families  *(findings 1, 2)*

Generalise `mutationTest()` in `run-guards.mjs` to take a family rather than
closing over `guards`. Each family declares its own fixture shape:

| family | fixture input | already has |
|---|---|---|
| source | `(path, source)` | `fixtures/index.mjs`, 24 fixtures |
| contract | an OpenAPI document fragment | **nothing** |
| config | an `env` object | vitest cases for 6 of 7 |

Then UNPROVEN is a `guards`-stage FAIL for every family, exactly as it is for
source guards today (`stages.mjs:150-159` needs no change — it already fails on
any unproven entry).

Write the missing fixtures: 4 contract (violating + clean each) and 1 config
(`adr-has-evidence`). Then **delete** the hand-copied regex block at
`tests/config-guards.test.mjs:230-253` and replace it with a call to
`guard.check()` on the real ADRs — the test keeps its intent (the tenancy phase
can be certified) and stops owning a second copy of the rule.

Law 31 is satisfied: the mutation harness exists, and contract + config are the
second and third real use cases proving the generalisation.

### B. Derive law coverage from the guards  *(finding 4)*

Build the `guards` stage's `enforces` from
`[...guards, ...configGuards, ...contractGuards].map(g => g.law)` instead of the
hand-written array at `stages.mjs:107`. Then delete `reviewOnly[7]`,
`reviewOnly[8]` and `reviewOnly[32]`, which assert an absence the code refutes.

`verify:coverage` already fails loudly on an unaccounted law, so the derived list
is self-checking from that point on.

### C. Fix the exit ordering  *(finding 3)*

In `verify.mjs:213`, gate the zero-pass branch on blocked stages — under `--ci`,
BLOCKED must decide before "nothing enforced" does. Add a case to
`tests/phase-authority.test.mjs`, which already owns the phase/status rules.

### D. Correct line reporting  *(finding 5)*

Track offsets while stripping comments, or match against `src` and skip matches
that fall inside a comment range. Both CSS guards share the
`withoutComments` + `indexOf` shape, so extract one helper and use it twice —
that removes the third copy of the pattern rather than fixing two instances of it.

### E. Give the contract's verb list and operationId rule one owner  *(finding 6)*

Export `VERBS` from `contract-guards.mjs`; have `stages.mjs` and
`emit-openapi.ts` import it. Reduce the `contract` stage to what only it can do —
the `openapi: 3.1.0` assertion and running the boundary tests — and let
`operation-id-required` own the operationId rule alone, taking the operation
count from `scanContract().checked`.

### F. Assert exemptions are live  *(finding 7)*

In `scanWorkspace()`, an `exempt` entry whose path no guard claims is a violation,
worded like `check-budgets.mjs`'s stale-route message. Same treatment for a
`dormant` declaration on a guard that now governs files.

### G. Finding 8

Restore the lost subject at `guards/index.mjs:741` (`7be1e4f` gives the context);
flatten the `run-guards.mjs` branch; hoist `read(f)` into a per-file cache in
`scanWorkspace()`; derive `ROOT` in `emit-openapi.ts` like its two siblings;
settle on `String.fromCharCode(10)` in `no-hand-edit.mjs`; throw in `deref` past
the depth limit.

---

## Files

| file | findings |
|---|---|
| `tooling/architecture/run-guards.mjs` | A, F, 8 |
| `tooling/architecture/contract-guards.mjs` | A, E, 8 |
| `tooling/architecture/fixtures/index.mjs` | A |
| `tooling/architecture/guards/index.mjs` | D, 8 |
| `tooling/architecture/config-guards.mjs` | A |
| `tooling/architecture/tests/config-guards.test.mjs` | A (delete the copied regexes) |
| `tooling/verify/stages.mjs` | B, E |
| `tooling/verify/verify.mjs` | C |
| `tooling/verify/tests/phase-authority.test.mjs` | C |
| `tooling/generate/emit-openapi.ts` | E, 8 |
| `tooling/hooks/no-hand-edit.mjs` | 8 |

Reuse rather than re-invent: `classify()` (`source-universe.mjs`), `unusableFinding()`
and the `PROVEN/BROKEN/UNPROVEN` vocabulary (`run-guards.mjs`), `unmet()` and the
status constants (`stages.mjs`, `lib/util.mjs`), and `check-budgets.mjs`'s
stale-entry wording for F.

---

## Verification

Ordered so each step's evidence is visible before the next.

1. **`pnpm guards:mutate`** — must report the new total (24 source + 4 contract +
   7 config = 35) with **0 broken, 0 unproven**. Today it prints `24 proven`.
2. **Prove the new fixtures actually bite** — revert one contract guard's body to
   a no-op and confirm `guards:mutate` turns it BROKEN, then restore. A fixture
   that has never failed proves nothing; this is ADR-024 applied to the change
   itself.
3. **`pnpm verify:coverage`** — still `0 unaccounted`, and laws 7, 8 and 32 must
   now read as guard-enforced rather than `review / phase gate`.
4. **`node -e`, the CSS line check** — the three-identical-declarations case from
   finding 5 must report lines `[1,2,3]`.
5. **`pnpm verify:list`** — the derived `enforces` renders (it drives `TITLE_WIDTH`
   and the law column).
6. **`pnpm vitest run tooling/`** — the four tooling suites, including the new
   `verify --ci` exit-ordering case and the rewritten `adr-has-evidence` test.
7. **`pnpm verify`** — full local gate. The last stage (`gate leaves no trace`)
   is the real check on this change: it asserts the run left the checkout exactly
   as it found it.
8. **`XFORGE_PHASE=tenancy pnpm verify`** — the phase raise must still behave, since
   B alters what the coverage machinery reads.

Do **not** stage anything mid-run — the idempotence stage reads `git status
--porcelain`, and touching the index during a run turns it red for the wrong
reason.
