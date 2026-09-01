---
name: checks-that-can-fail
description: Write checks that are able to go red, and finish changes across every copy of the fact they touch. Use this whenever writing or editing a test, guard, lint rule, validator, CI stage, assertion, or any code whose job is to detect a problem; whenever parsing another tool's output to decide pass/fail; whenever fixing a bug, renaming something, moving a file, or changing a constant, path, or rule that might exist in more than one place; and whenever a check went green on the first try and you have not yet seen it go red. Reach for it even when the request sounds routine — "add a test", "make the build check X", "rename this" — because the defects it prevents are invisible in review and look exactly like success.
---

# Checks that can fail

Write it so that **if it were wrong, something would say so.**

Two things routinely fail that test, and both are invisible in review because
both are indistinguishable from success:

- a check whose success path does not require its subject to exist
- a fact stored in more than one place

A passing suite and an empty suite print the same green. Two copies that agree
and one source behave the same. The gap opens later, and by then the green light
has been trusted for months. That delay is the whole problem: nobody
re-examines a check that has never complained.

Neither habit below is exotic. Both survive code review routinely, which is why
they need a deliberate pass rather than good intentions.

---

## 1. Make the check go red before you trust it

**The move: break the thing it checks, and confirm it fails. If you cannot make
it fail, you have not written a check.**

Do this once, at the moment you write it, while the mutation is cheap. Undo the
break afterwards. This single habit catches most of what follows, because every
shape below survives exactly until someone tries to trip it.

If you cannot break the subject easily, that is itself the finding — a check you
cannot exercise is one nobody can trust later either.

### Shapes to look for

**Zero satisfies your pattern.** `/(\d+) passed/` matches `0 passed`. A suite
that skipped every case exits 0 and often prints no `passed` token at all, so
"could not read a count" and "everything passed" arrive as the same value.

Parse the count, then require it to be positive. Treat *unreadable* as a
failure of its own rather than a cosmetic gap — a `?` where a number should be
is the report telling you it has nothing, and it should not be able to sit
beside a green.

**The subject set is empty.** A rule that runs over a file list, a table, a
route set, or a query result reports nothing wrong when it is handed nothing.
One guard forbidding float arithmetic in money code matched exactly one file —
the design document explaining the prohibition — and reported green over zero
lines of executable code.

Assert the population, not just the findings. And if the subject genuinely does
not exist yet, say so out loud with a declared pending or dormant state, so a
zero reads as "not applicable yet" instead of as "clean".

**Failure and success return the same value.** A resolver that cannot follow a
reference returning "no properties" is indistinguishable from "there are no
properties". A parse that fails returning `[]` looks like a clean file.

Return a distinct *could not evaluate* outcome and propagate it. "I did not
check this" and "this is fine" are different claims, and collapsing them is how
a red appears with a reason that is false — which costs more than no check,
because someone debugs the wrong thing.

**The test exercises a shape production does not use.** A fixture written
against `@scope/modules/hr/...` when every real import writes `@scope/hr/...`.
The check passed its fixture happily and had never once seen a real violation.

Derive fixtures from real code: copy an actual call site, or generate the case
from the same source production reads. If you hand-write one, grep the codebase
for its shape first and confirm something actually looks like that.

**Matching loosely where the strong form is the point.** `includes('!dist')` is
satisfied by `!!dist`, `!dist-old` and `!**/distribution`. If a specific form is
required, match it exactly, per entry, rather than searching a joined string.

**Counting instead of asserting.** "874 files checked" is evidence. Only a
comparison is a check. A number nobody compares against an expectation gets
printed, read past, and cited later as though it had been verified.

**The runner never sees the file.** A check exists only if the tool that would
run it includes the file it lives in. A `tsconfig.json` whose `include` misses a
directory means `tsc` never reads the type-level guard written there. A
`testMatch` that does not match means the spec is never collected. A workflow
triggering on a branch the repository does not use means the required check
cannot fire — while the branch-protection UI reports it as configured.

This is not the empty-subject-set shape wearing a hat. A rule handed no files
can at least report zero; a file outside the runner's scope produces **no signal
of any kind**, so there is nothing to notice and no count to distrust. It also
hides one level up from where you are looking: the check reads correctly, and
the defect is in a config file you did not open.

Confirm inclusion the same way you confirm anything else here — break the file
on purpose and watch the tool complain. If nothing complains, the tool is not
reading it, and every check in that directory is decoration.

### The conservation trick

When you split a set into buckets, assert the buckets sum back to the input:

```
if (kept.length + skipped.length + failed.length !== total) {
  throw new Error(`lost ${total - kept.length - skipped.length - failed.length} items`)
}
```

This is worth reaching for because it catches silent drops in categories you did
not think to model — which is precisely the class you cannot enumerate in
advance.

---

## 2. When you change a fact, find its copies

**The move: after making a change work, ask what else holds a copy of that
fact.** Ask it before you consider the change finished, not during review.

Everyone agrees with "don't repeat yourself" and this still happens constantly,
because copies do not look like copies. They look like a comment, a fixture, a
config file, an error message.

### Where copies hide

- a **comment** stating the rule the code beside it implements
- a **test fixture** encoding the same expectation independently
- an **error message** quoting a path, flag, function or file name
- **another tool's config** restating the same set — CI workflow, tsconfig,
  linter ignore list, Dockerfile, editor settings
- **docs** describing the behaviour, especially decision records
- a **default parameter** that duplicates a constant
- the same **literal** — a URL, port, path, magic string — in a second file

### Search moves that actually find them

- grep the literal you changed
- grep the **old** name; a rename leaves it behind in comments and strings
- grep the **concept**, not only the token: if the column is `valid_from`,
  search `effective_from` too, and vice versa
- if you changed a *mechanism* rather than a value, enumerate every consumer and
  check each one. **Partially completed migrations are the most common form** —
  two of three call sites converted, the third left on the old contract and
  silently doing nothing.

### Prefer deriving; failing that, prefer loud

If two places need the same fact, have one read it from the other. Where that is
genuinely impossible — a shell script cannot import a TypeScript constant — add
something that compares them, so divergence is an error rather than a surprise.

Where even that is impractical, at minimum add an assertion that turns "silently
stopped working" into "went red". A test that the referenced file still exists
costs one line and converts an invisible failure into an obvious one.

---

## 3. Comments are claims nothing executes

A comment stating a rule is a copy of that rule with no test attached. It goes
stale in complete silence.

- Write comments that explain **why**, because the reason survives a refactor
  that the description does not. "Sorted lexically, which is why the index is
  zero-padded" stays true; "returns four items" does not.
- **Never describe another file's behaviour without opening it.** "This is
  called with no arguments by X" was false, and a lint suppression rested on it,
  keeping dead code alive for months.
- When you add a doc block, **look at what is directly above it**. Two stacked
  `/** */` blocks mean only the last one attaches to the declaration; the others
  document nothing while reading exactly as though they do.
- If you write that something was removed, renamed or moved, **confirm it was**.

The test for a comment you are about to write: if the code changed underneath
it, would this sentence become obviously wrong, or quietly wrong? Prefer
sentences that would become obviously wrong.

### A named control is not a control

The expensive form, because it does not merely go stale — it **buys something**.
A document justifies removing or weakening one check by naming another:

> "the linter already catches that" · "these rest on native semantics the
> scanner checks statically" · "the integration suite covers it" · "typecheck
> would reject it"

Each of those trades away real coverage for a claim nobody executed, and the
trade is what makes it worse than a wrong sentence. The reduction ships. The
control it was traded for may never have existed.

Before accepting such a trade — writing one, or reading one in an ADR, a README,
a review comment — verify the named control **exists, runs, and covers the thing
being given up**. All three, because they fail separately:

- a tool absent from the lockfile was never a control
- a tool present but never invoked reports nothing, forever
- a tool that runs can still be blind — green having inspected an empty source
  population, which is §1's first shape wearing a vendor's name

Nothing mechanical will catch this: no guard reads a sentence asserting that a
check exists. It is caught by asking, of any justification that names a control,
whether you have seen that control fail.

---

## 4. Ask the repository rather than reasoning from memory

Local rules live in the repository, and your recollection of them is a second
source. Before writing code that a project's own tooling will judge:

- **Find the gate.** Look at `package.json` scripts, `Makefile`, or the CI
  workflow, and run the cheapest check that covers what you touched. Narrow
  commands beat the full suite while iterating.
- **Call the authority, do not restate it.** If a module already answers "is
  this path generated?" or "is this role permitted?", call it. Re-deriving its
  rule at your call site creates the second source this whole skill is about,
  and it is the hardest kind to spot because both copies are correct on the day
  they are written.
- **Read the rule before satisfying it.** If a check rejects your code, find
  what it actually asserts. Editing until the red goes away can satisfy the
  letter while defeating the purpose — and if the rule is genuinely wrong, that
  is a finding worth raising, not something to route around.

Run the narrow check after writing, and say plainly which broader checks you did
not run. "The fast loop is green and the integration tests did not run" is an
honest report; "it passes" is not.

---

## The two questions

Before calling a change done:

1. **If this were wrong, what would say so?** If the answer is "nothing", you
   have written something that looks checked and is not.
2. **What else holds a copy of the fact I just changed?** Ask this of every fix
   — it is the last question of a bugfix and the first question of a new
   subsystem.
