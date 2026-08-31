---
name: attack-case
description: Scaffold a new T-numbered tenancy attack case across the qualification suite, the attack matrix, and the evidence register. Use when adding an attack to phase-1-attack-matrix.md.
disable-model-invocation: true
---

# Adding an attack case

An attack case is not a test file. It is a coordinated change to three governed
documents, and it is wrong if any one of them is missing:

| Where | What lands there |
|---|---|
| `tests/architecture/tenancy/TNN-<name>.test.ts` | the executable proof |
| `.architecture/phase-1-attack-matrix.md` | the row, and the claim it makes |
| `.architecture/evidence-register.md` | the source — **only if prior art drove it** |

T19–T21 each took all three. T17 and T18 came from review and took two.

## The rule that governs this

> A frozen specification may be EXTENDED; what it must never be is quietly
> narrowed to match what the code turned out to do.

So: never renumber, never repurpose a retired ID, never soften an existing row's
`Expected` because the implementation disagrees. If the code disagrees with the
matrix, one of them is wrong and that is the finding — resolve it as a change
with a reason, not as an edit that makes the red go away.

## Steps

### 1. Establish where it came from

Answer this before writing anything, because it decides whether an evidence row
is required:

- **From published prior art** → an `ENN` row in the evidence register is
  mandatory, with a retrieval date, a grade, what it supports, and an outcome.
  Law 34. Say plainly what the source gave you that reasoning had not — that
  contrast is the whole value of the register.
- **From review or reasoning** → no evidence row. Say so in the matrix
  commentary rather than leaving the provenance unstated.

### 2. Pick the ID and the claim

Next free `TNN`. Write the claim as the thing that must remain TRUE, in the
present tense, the way the existing rows do — "no context survives the
checkout", "access WIDENS, never narrows". A claim you cannot state in one line
is usually two attacks.

### 3. Write the test

Model it on `T20-permissive-policies-or.test.ts`, which is the fullest example
of the mutating shape. Non-negotiables:

- Import from `./harness`. Never open a connection of your own, and never build
  a fixture schema — the thing under test must be the code that ships, or the
  proof is about a program nobody runs.
- `describe.skipIf(!reachable)` and `beforeAll(async () => { if (reachable) await seed() })`.
  Without a database the case must skip, not fail and not silently pass.
- If the test mutates database state, drop it in a `finally` **and** again in
  `afterAll` — the second one is what saves the next test when the first path
  is skipped by an early throw.
- End a mutating case with `await assertBoundaryIntact()` then `await closeAll()`.
  A test that proves an attack fails but leaves the boundary weakened has
  traded one hazard for a worse one.
- Prove the negative AND the restoration. T20 asserts isolation holds, then that
  the widening policy breaks it, then that dropping it restores isolation.
  Without the third assertion the test cannot distinguish "attack blocked" from
  "everything is broken".

### 4. Add the matrix row

`| TNN | <attack> | <expected> | <available from> |`

The fourth column carries information: `now` if it is reachable at this slice,
otherwise the slice that unblocks it. Do not write `now` for something that
cannot run — the ratio exists to separate *not written yet* from *cannot be
written yet*, and a number that means two things means neither.

Then extend the commentary below the table. A row with no prose is a claim
nobody has to defend.

### 5. Add the evidence row, if step 1 said so

`| ENN | [source](url) | YYYY-MM-DD | P\|S\|V\|X | <what it supports> | ADOPT\|ADAPT\|REJECT |`

Grades and outcomes are defined at the top of the register. `no-direct-match`
with the sources examined is a stronger answer than a loosely related article.

### 6. Run it

```
docker compose up -d
XFORGE_PHASE=tenancy pnpm verify
```

Raising the phase locally is what makes the tenancy stages mandatory here. A
case that reports PENDING during its own phase is a failure, and a case that has
only ever been reasoned about has not been qualified.

## Before you call it done

- [ ] The test FAILS when the protection is removed. Check it, do not assume it —
      a case that passes against a broken implementation proves nothing, which is
      the objection ADR-024 raises against a tool that runs against zero files.
- [ ] Matrix row added, never renumbered, commentary extended.
- [ ] Evidence row added if prior art drove it — or provenance stated if not.
- [ ] `assertBoundaryIntact()` passes afterwards.
- [ ] `XFORGE_PHASE=tenancy pnpm verify` is green, with no stage BLOCKED.
