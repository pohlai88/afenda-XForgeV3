# Project state

## What this file owns

Three things, and nothing else:

```
  in flight     the breakdown of the stage being worked, and where it stopped
  undecided     questions with no owner yet, and what each one blocks
  deferred      what was deliberately not done, and the reason
```

## What it must never restate

```
  the phase           .architecture/state.json          the repository owns it
  decisions           .architecture/adr/
  evidence            .architecture/evidence-register.md
  the architecture    .architecture/architecture-final.md
  what was done       git log
  the laws            CLAUDE.md
```

A state file is the easiest place in a repository for the defect this project
keeps having: a fact acquires a second source, the two agree, and nothing
complains in between. Every line below either has no other home, or is a pointer
carrying no substance of its own.

**Where this file and an owner disagree, the owner is right and this file is
stale.** Nothing enforces that. It is the honest statement of a document whose
subject moves, written here rather than discovered later — the way
`CLAUDE.md`'s "there is no remote to configure" survived the arrival of the
remote because no line said which of the two to believe.

## As of

This file describes the tree at the commit that last modified it:

```
  git log -1 --format='%h %ad  %s' --date=short -- .architecture/project-state.md
```

Neither that commit nor the gate result at it is written down here.

A block used to stand in this place naming the commit, the date, the branch, and
`pnpm verify — 13 pass · 0 fail · 1 pending · tree unchanged`. That last line was
transcribed from commit 76ffcdb's own message: this file took ownership of a fact
the rules table one section above assigns to `git log`, four lines below the
sentence declaring it must never restate what was done. The easiest place in a
repository for a fact to acquire a second source turned out to be the paragraph
warning about it.

A gate result is derived from execution. It is true at the moment it is measured
and silently untrue afterwards, and nothing in the sentence tells a reader which
one they are holding. `pnpm verify` is the only thing that can answer it for the
tree in front of you, so it is referenced and never quoted.

## In flight — Phase 2 design system, stage 4C

Stage 4 gave the experience layer a state vocabulary. 4C makes each member
something a person can be shown, and proves it.

```
  4C.0  wire the mapper into the real screen              DONE    76ffcdb
  4C.1  one owner for enforcement scope                   DONE    76ffcdb
  4C.2  read-state behavioural conformance                DONE    2273122
  4C.3  write-outcome behavioural conformance              NEXT
  4C.4  cross-axis composition
  4C.5  accessibility, and error containment
  4C.6  interaction and action conformance
```

**The seventh state was retired, and that is a correction rather than a cut.**
The original plan listed seven mutually exclusive screen states with `conflict`
among them. 4B found that `conflict` has no read producer: it is the outcome of
a write whose version token was stale, while the read underneath may be
perfectly `ready`. So conformance has two axes, not one list, and
`ready + conflict` is a list with a banner rather than a choice between them.

### 4C.2 — what each read state must prove

Appearance is not the obligation; behaviour is. A state that looks right and
permits the wrong action has not been proven.

```
  loading      progress is exposed, and no stale interaction acts as if current
  empty        an explicit empty meaning, not an absence of content
  ready        the normal actions are available
  partial      the data is usable AND its incompleteness is visible
  forbidden    permission semantics, and no retry affordance at all
  error        failure semantics, and retry ONLY when `retryable`
```

### 4C.4 — the combinations worth exercising

The point of two axes is that these exist. Testing each axis alone would not
reach any of them.

```
  ready   + conflict          the case the old model could not express
  partial + conflict
  ready   + add pending
  ready   + save pending
  partial + save pending      if editing a bounded list is permitted at all
  forbidden + idle writes     write controls must not remain interactive
  error     + idle writes     beneath a terminal read state
```

## Undecided

**An error boundary that collapses the mapper's throw into `error` loses the
remedy.** `toResourceState` refuses an unrecognised wire code rather than
inventing a meaning for it, and it runs during render, so the throw needs
containing. But a stale tab that met a new reason code needs a RELOAD, and
`error` offers "Try again" — the precise failure `retryable` exists to prevent,
which is that a control appears for something it cannot fix. Probably a distinct
problem code. Blocks 4C.5. The boundary should also scope to the resource
surface rather than the app shell: one unknown code should not turn the whole
product into an error screen.

**The gate has a flake, and the machine accumulates load.**
`tests/unit/ui-contracts.test.ts` timed out at 5s in one full run and passed
251/251 in isolation; repeated gate runs leave chrome and node processes behind.
A gate that goes red for reasons unrelated to the code trains people to re-run
rather than read, which is the same failure as a verdict that does not mean what
it says. Whole-gate totals moved 135 -> 153 -> 173 -> 164 with no corresponding
change. GE-005 records the measurement rule; it does not cover contention.

**Two singletons still force per-file test isolation.** `driver` and `sink` in
`packages/db` are set-at-boot wiring and benign in production, but they are the
whole reason the tenancy stage instantiates its module graph 22 times for ~23s.
Removing them permits `isolate: false` on those projects. Not a correctness
defect -- the one that was is fixed in `0c8d022`.

**Whether to open the PR now.** Opening it against `main` is the first execution
of `pnpm verify --ci` on a machine that inherited nothing from the workstation,
which `state.json` records as never having happened. `--ci` turns BLOCKED into
failure, and four stages need services the runner must actually provide —
integration tests, migration compatibility, selected E2E, build. A first red
there is the check finally running, not a regression. Worth choosing the moment
deliberately rather than discovering it.

## Deferred, and why

```
  Stage 3 remainder        Combobox · Section · FieldGroup · Toolbar · Toast ·
                           Table. Deferred at the point where AT-evidence debt
                           and the grammar-expressiveness question were both
                           accumulating; the harness answered the second.

  A11y-3 for Dialog        One sitting with a screen reader, unscheduled.
                           ADR-025 makes the requirement risk-based, so this is
                           a named obligation rather than an open-ended one.

  Base UI first-mount      Never measured. The per-route budget covers bytes,
  cost                     not the cost of the first component mount.

  documentation examples   Nothing verifies that a code sample in
                           `.architecture/` still reflects the code. This is the
                           stated price of narrowing four guards to executable
                           TypeScript, and it is paid nowhere else.

  sourceFiles()            Still exists, still used by config-guards with
                           explicit arguments. Only the guard runner was moved
                           off it. Not a second scope owner today, because
                           nothing calls it bare — worth re-checking if
                           something does.
```

## What a resuming session needs, that the code does not say

The repository records what was decided and what was proven. It does not record
the shape of the argument that produced them, and two are load-bearing here:

**Producibility, renderability, and mapping are three different facts with three
different owners.** A state can be constructible, mappable, and unrenderable.
4A gave `partial` a producer, 4B mapped it, 4C.0 rendered it — and until 4C.0 the
screen discarded the completeness envelope, so a truncated list drew as a
complete one. The vocabulary was correct and the screen contradicted it.

**An enforcement mechanism must prove that it can fail.** Every guard here has a
violating fixture and a clean one, and the harness additionally asserts a
rejection is actionable. That rule was earned: a guard was reported PROVEN while
its message read `NaN`, and it was caught by eye.
