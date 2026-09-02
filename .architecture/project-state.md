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

## In flight — Phase 2 design system, stage 6

Stage 4C is complete, every row of it. What is being worked now is stage 6, the
two patterns, and its FIRST decision was its scope.

```
  Table            passive tabular content            DONE
  CommandPalette   keyboard-first command surface     DONE   (composite)
  DataGrid         composite grid, inline edit        DONE   (composite-grid)
```

**THE A11Y-3 DEBT WENT FROM ONE SESSION TO THREE, and that is the price of
stage 6 rather than a surprise.** ADR-025's point was never that the number
stays at one; it was that the number is known when the obligation is INCURRED.
It was: `contractsOwingAtEvidence()` moved the moment the two contracts declared
their profiles, four tests went red naming them, and the gate now reports
`CommandPalette, DataGrid, Dialog`. Nobody edited a list. What is owed is three
sittings with a real screen reader, and none has happened.

**BEHAVIOURAL CONFORMANCE FOR TWO PROFILES IS NOW OWED TOO, and it was found by
a test that existed to find exactly this.** `names every profile that has no
contracts yet` listed `composite` and `composite-grid` as dormant, and its
comment said the day a contract declares one, this goes red -- "which is exactly
when somebody needs telling that no conformance exists for it". It went red. So:

```
  STALE from the packages/design cutover until 2 Sep 2026: every spec named
  below had been DELETED while this table read as live coverage. Rewritten
  against what exists; see ADR-030 and POLICY.md 3i.

  none            design-system-conformance.spec.ts    DERIVED from profile
  live-region     A11y-3 GATED (ADR-030)               Alert, Status
  native-control  design-system-conformance.spec.ts    DERIVED from profile
  form-control    a11y-conformance.spec.ts             Input, Textarea
  modal           A11y-3 GATED                         Dialog, Sheet
  composite       A11y-3 GATED                         Command, DropdownMenu, Select
  disclosure      A11y-3 GATED                         Tooltip
  composite-grid  --                                   no contract declares it
```

**That third column is the part worth having looked up.** The first draft of this
table said "exists" five times, which was written from memory and was wrong twice:
only three suites derive their subjects from `interaction.profile`. `modal` and
`form-control` are covered by specs naming Dialog, Field, Input and Checkbox
individually. So the property ADR-025 relies on -- a contract joining the gate by
declaring what it is -- holds for the A11Y-3 obligation and does NOT hold for
behavioural conformance in two of five profiles. A second `modal` contract would
inherit the evidence debt automatically and inherit no conformance at all.

Not written in the same commit, deliberately. A browser spec cannot be executed
from the authorship loop -- `globalSetup` builds the app and seeds PostgreSQL --
and an unrun spec is the thing this repository is most careful not to count as a
check. Writing two suites nobody has watched fail would buy the appearance of
coverage for the two profiles with the least of it.

**WHAT IS PROVEN TODAY, precisely.** `CommandPalette` delegates nearly all of its
gated behaviour to Base UI -- focus trap, `aria-activedescendant`, listbox and
option roles, arrow traversal -- so what is unproven here is the composition, not
the mechanics. `DataGrid` has no such backing: Base UI ships no grid, so its
one-tab-stop roving focus, its arrow and Home/End traversal, and its Enter/F2
editor are written in `data-grid.tsx` and asserted only at source level by
`the grid implements the model it claims`. That test proves the branches EXIST.
It cannot prove focus lands where they say.

**A LINT SUPPRESSION IS LOAD-BEARING, so it was made to rest on something.**
`<table role="grid">` trips `noNoninteractiveElementToInteractiveRole`, and the
rule is right in general: it guards against markup claiming a widget nobody
implemented. Suppressing it on a sentence would be the "a named control is not a
control" trade. The suppression names the test above, and the test asserts every
key the sentence claims -- so trimming the model turns a green test red instead
of leaving a comment describing a component that no longer exists.

**Table first, and the reason is A11y-3 debt rather than difficulty.** Every
gated contract stage 6 adds is another screen-reader session, and the first one
— Dialog — is still owed. `CommandPalette` is `composite`; `DataGrid` is
`composite-grid` plus inline edit. `Table` is passive, so it adds none, and
ADR-025 exists precisely to stop those obligations arriving as an unscheduled
batch at the certification gate.

**Four contracts, not one**, and the shape was forced by a constraint worth
recording: `index.tsx` is imported by server components, so it has no React
context, and a single cell contract cannot learn from context whether it sits in
the header. A `header` boolean would leave a `<th>` in the body
representable. So `TableHeaderCell` is its own contract and the illegal
arrangement is unsayable rather than discouraged. The header slot is REQUIRED
for the same reason: a table with unnamed columns is close to unreadable with a
screen reader, and a grammar that permits one produces it eventually.

Sorting is NOT included. A sort control is a Button reordering data the
application owns, and the `aria-sort` state it implies is behaviour — which
would move the contract off `profile: 'none'`. It arrives with a screen that
needs it.

**Nothing was written to test it.** The conformance suites derive their subjects
from the registry, so the four contracts arrived already covered: unit tests
went 533 to 589, and inertness picked all four up with generated documents. That
is what the derivation was for.

### Two states the vocabulary was missing, found by looking rather than by a check

Neither is a stage-6 pattern; both are the existing components being finished.

**TONE REACHED THE READER THROUGH HUE AND NOTHING ELSE.** An Alert's four tones
differed by colour alone, two of them the red/green pair that deficiency
collapses, and the defence was a sentence: two comments in `packages/ui` said the
copy carries the meaning. That is true when the author writes "Payroll run
failed" and false when they write "Cannot continue", and nothing anywhere
executed the difference. `09-xforge.md` had already named this as the one rule
uncovered by every automated check here. `tone-mark.ts` draws one silhouette per
tone -- a triangle for warning so the "look before you act" tone survives at a
size where an inner glyph is a smudge -- and the assertion is keyed off the
contract's tone enum, so a fifth tone is red the day it is declared. The mark
paints in `currentColor`, which means it lands on a text/surface pair the
generator already measures rather than becoming the first foreground nothing
checks.

**PRESSED DID NOT EXIST, AND SECONDARY HOVER WAS BORROWED.** Every control had
rest, hover, focus and disabled and nothing for the moment the pointer is down --
so on a touch screen, where there is no hover at all, a tapped button looked
exactly like an untouched one. Fixing it surfaced the more interesting half:
secondary hover read `surface.sunken`, the recessed-container role, so a hovered
button and an inset well were one token and neither could move alone. That is the
`surface.info`-wearing-the-accent-tint collision one tier down, and it was
invisible because on paper a hover and a well happen to want the same grey. They
do not on black. Three roles now exist -- `surface.accent-active`,
`surface.raised-hover`, `surface.raised-active` -- and the pressed direction is
theme-dependent by construction: darker on paper, lighter on obsidian, stopping
at ink.800 rather than 750 because 750 is the disabled fill and a pressed control
must not land on a dead one's colour.

**A NEW SOURCE FILE IS INVISIBLE TO EVERY GUARD UNTIL IT IS TRACKED.** The guards
enumerate `git ls-files`, which reads the INDEX, so `tone-mark.ts` and the whole
of `tooling/design-system/` were skipped in silence while the run reported green
over 915 file-checks. Staging them took it to 954. This is the "runner never sees
the file" shape and it hides one level up from where anyone looks: the guard is
correct, the file simply is not in its universe. No check is proposed here
because the guard that would catch it needs the same universe to be complete;
what is recorded is the working rule -- **regenerate, `git add`, then gate**, and
that applies to new SOURCE for guard visibility, not only to generated output for
cleanliness.

## Stage 4C — the breakdown, complete

Stage 4 gave the experience layer a state vocabulary. 4C makes each member
something a person can be shown, and proves it.

```
  4C.0  wire the mapper into the real screen              DONE    76ffcdb
  4C.1  one owner for enforcement scope                   DONE    76ffcdb
  4C.2  read-state behavioural conformance                DONE    2273122
  4C.3  write-outcome behavioural conformance              DONE    d0524fc
  4C.4  cross-axis composition                            DONE
  4C.5  accessibility, and error containment              DONE
  4C.6  interaction and action conformance                DONE
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

### 4C.3 — what each write outcome must prove

Only producer-backed outcomes. All five are reachable: the controller derives
them from react-query's own closed status union through an exhaustive switch, so
`idle`, `saving` and `saved` are as real as `conflict`.

```
  idle       no outcome is claimed -- a stale banner reports something untrue
  saving     the control that started it is disabled and says so, and the
             write is NOT represented as done
  saved      the control returns to actionable, and nothing claims a problem
  conflict   five obligations, below
  failed     distinguishable from conflict, and the read still visible
```

`conflict` carries the load, and each line is a separate way to get it wrong:

```
  the existing ResourceState remains visible
  it is not rendered as a read failure
  the attempted write is not represented as successful
  the user is given a RESOLUTION PATH, not only a diagnosis
  assistive technology can discover it
```

The fourth is why `conflict` came off the read axis at 4B. An error says
something broke; a conflict says someone else changed this and here is what to
do. Collapsing them loses the only part that tells the user what to do next.

`conflict` and `failed` are the discriminating pair on this axis, the same shape
as `forbidden` and `error` on the read axis: either alone is satisfied by a
screen that renders one banner for everything.

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

Seven written, six passed on the first run and one found a defect: beneath an
`error` the Add control was enabled, so a caller could create a contact in a
collection they could not see -- a duplicate of something they were never shown.
`readSucceeded()` now lives with the vocabulary in `@xforge/ui/state`, exhaustive
and ending in `assertNever`, so a new read state is a compile error rather than a
silent default into one answer. `empty` is the case that keeps the rule honest:
it is a SUCCESSFUL read and adding the first record is the entire point of it.

### 4C.6 — what a declared interaction profile must prove

The row is labelled "interaction and action conformance"; the scope that survived
review is narrower and cleaner, and `action` sits inside it. `kind: 'action'` is
Button alone, while `none` and `live-region` are not actions at all.

**THE RULE.** `interaction.profile` is a declaration of OBSERVABLE BEHAVIOUR,
never a mechanism for selecting or escaping tests.

THE STATE THIS STAGE WAS OPENED AGAINST, in the past tense because the stage
closed and it is no longer true. `ui-contracts.test.ts` asserted

```
  profile === 'none'  <->  revision === 0
```

which compares two fields of the SAME declaration to each other. Both could be
wrong together and nothing read the component. ADR-025 derives the entire
assistive-technology gate from `interaction.profile`, so a contract escaped that
gate with a one-word edit every check passed. Combobox, Select, Switch,
RadioGroup, CommandPalette and DataGrid each join the gate ONLY if their
declaration is honest, and none of them exists yet.

That weld also spent `revision` on encoding profile-ness: a `none` contract
could not bump its revision for an unrelated reason, and a new interactive
contract could not start at 0. It is gone, rather than left beside the real
check where it would read as corroboration; what replaced it keeps only the
direction that mattered, that a behavioural profile carries a positive revision.

**SUBJECTS ARE DERIVED, NEVER LISTED.** Every obligation below reads its subject
set from the registry by profile. A list of component names would reintroduce
exactly what ADR-025 removed, one level down, and would protect today's
seventeen contracts and none of the six still to come.

```
  none            the contract ROOT introduces no interaction stop: not
                  natively focusable, no author-created tab stop, no interactive
                  role of its own, and navigation does not land on it.

                  AND NO LIVE-REGION MARKER OF ITS OWN -- no `aria-live`, no
                  `role="alert"` or `role="status"`. This clause was not in the
                  first draft and was added by WRITING THE MUTATION TABLE: a
                  live region is not focusable and carries no interactive role,
                  so inertness as originally scoped would have passed a
                  mis-declared Alert or Status. The hole was found by
                  construction, which is the whole argument for building the
                  table before the conformance it measures.

                  AND IT WIRES NO ACCESSIBLE RELATIONSHIP -- nothing it renders
                  is named or described BY REFERENCE to another element it
                  rendered. Added for the same reason, one row later: a Field is
                  not focusable, declares no interactive role and carries no
                  live-region marker, so every clause above passes one
                  mis-declared as inert. Naming a control it rendered is the one
                  signature that separates the two.

                  BY REFERENCE is load-bearing. A Button inside a ListItem is
                  named by its own text and wires nothing; `Card` points at a
                  heading its CALLER owns, which is not the contract supplying
                  both ends. The obvious form of this rule -- "no descendant
                  control has an accessible name" -- rejected List and ListItem
                  while still missing Field, whose control is a
                  `span[role=checkbox]` no tag-based selector sees.

                  DESCENDANT INTERACTIVITY IS OUTSIDE THIS ASSERTION. Card,
                  Stack, List and ListItem legitimately contain Buttons; `none`
                  describes the root's semantics, not its children's. A naive
                  "nothing inside is focusable" is false for every container,
                  and a test written to pass against that falsity is worse than
                  none.

                  NOT "handles no keys" -- that decays into reading the
                  implementation for handlers rather than observing behaviour.

  native-control  the declared native element is PRESERVED, and a disabled
                  public state cannot activate its action. Enter and Space are
                  both asserted, because they are different facts: Enter
                  activates on keydown and Space on keyup, so a component that
                  has quietly reimplemented activation in `onKeyDown` passes the
                  Enter assertion by construction and only Space catches it. No
                  further keys are specified -- this proves the native control
                  was preserved, it does not restate the HTML specification.

  form-control    4C.5 is the authority. Not duplicated here.

  live-region     the component exposes the intended role AND politeness. Role
                  alone is what 4C.2 already asserts; the polite/assertive split
                  is a separate fact and is currently asserted nowhere.

  modal           the conformance harness is the authority. Not duplicated here.
```

**THE GATE MUST BE SHOWN TO DETECT DISHONESTY, not merely to agree with honest
declarations today.** Those are different claims and only the second protects a
component that does not exist yet. For each contract whose profile is not
`none`, flipping the declaration DOWN to `none` must turn something red, on the
`fixtures/families.mjs` model -- including its `because`, since a fixture that
fails for the wrong reason proves nothing and proves it in the shape of a pass.

Lateral flips are NOT covered, and that is recorded rather than assumed closed:
`native-control` is a strictly weaker gate than `form-control` -- name,
description, target floor and axe all fall away -- so Button mis-declared as
`native-control` is a real downgrade. The full matrix is not built here.

**THE DEFERRAL IS DORMANT, NOT ABSENT.** `composite` and `composite-grid` have
zero contracts, and conformance written for them now would be green having
governed nothing. So the set of profiles with no contracts is asserted to be
exactly those two: it goes red the day the first Combobox lands, which is
precisely when somebody needs telling.

Every profile with contracts must have a non-zero proof population, and the
profiles must sum to the registry -- an unknown profile fails rather than
falling out of every bucket unnoticed.

## Undecided

**The generator's filler order is a conformance decision, not a detail.** A slot
declaring both a capability and kinds gets the cheapest KIND, because
capability-first made `Stack` generate `Stack{Field{Checkbox}}` and the
inertness suite then reported Stack as wiring a relationship that was the nested
Field's doing. That is the root-versus-subtree distinction reappearing in the
generator rather than in the assertion, which is the harder place to see it. A
slot whose ONLY option is a form-control would put it back, and would need the
wiring attributed by differencing the child mounted alone. No slot is shaped
that way today, so it is recorded rather than built.

**The screen's live regions mount together with their content, which is the
pattern that does not announce.** `Status` renders only in `case 'loading'`, and
each `Alert` only inside its own state branch, so the region and its message
enter the DOM in the same commit. The reliable pattern is a region already
present and then mutated; inserting both at once is routinely missed by NVDA and
JAWS. WHOSE OBLIGATION IS THIS is the part to get right, and it is not the
component's: `Status` is handed its children by a caller and cannot guarantee it
was mounted earlier, so demanding pre-existence of the CONTRACT would force an
API change while proving nothing about the screen. The obligation belongs to the
consumer. Splits cleanly from A11y-3: whether the region is present before the
message is deterministic and checkable in a harness; what a screen reader
actually said is not, and stays there. Shapes 4C.6's live-region work.

**The tone -> politeness mapping now has ONE owner, and the open half is
whether that owner should be the contract.** It had four: the Alert contract's
comment, the component's comment, and `aria-live` and `role` computed from
`tone` in two INDEPENDENT ternaries -- so a single edit could ship
`role="alert"` with `aria-live="polite"`, which contradicts itself and reads
fine in a diff. `packages/ui/src/live-region.ts` now pairs role with politeness
so that combination is unwritable, and both comments point at it instead of
restating it.

**Politeness in CONTRACT DATA is REJECTED for now, and the rejection is the
useful record.** It looked like the fuller fix — the generated schema and a
metadata renderer could read it — but the two live-region contracts need
different shapes: `Status` has a fixed politeness and `Alert`'s is decided by a
prop's value. Expressing both means a general mechanism for prop-conditional
behaviour, which would be the first in this vocabulary, built for exactly two
cases that disagree. Law 31 wants a second real use case to prove an
abstraction, and two cases needing two shapes is not that. There is also no
metadata renderer yet, so the benefit is entirely anticipated.

What would change the answer: a third live-region contract whose politeness is
prop-conditional, or a metadata renderer that actually needs to read it. Until
then the residual cost is one second copy — `Status` asserting its own
politeness — which is recorded below rather than paid for with a mechanism.

Its own module was chosen over `contracts.ts` for a measured reason: `index.tsx`
importing the registry would drag the whole vocabulary into every bundle
carrying an Alert, and per-route budgets are enforced.

One consequence is recorded rather than hidden: `Status` takes no discriminating
prop, so nothing derives its politeness and the conformance spec asserts it
directly. That IS a second copy, kept deliberately, because the alternative is a
silent hole where a progress indicator becomes assertive and interrupts every
reader on every load. It would stop being a copy if politeness moved into the
contract, which is rejected above.

**THE READINESS FIX NEEDS A VOCABULARY DECISION, which is why it is still open
after the politeness work rather than in spite of it.** The transitions that
matter are not the initial load — they are `ready -> conflict` and
`ready -> failed`, where the user has just acted and the answer arrives in a
region that did not exist a moment earlier. Neither obvious fix is free:

```
  persistent region   the region must render with NO content, and `Alert`
                      requires children and paints a coloured banner. A live
                      region permitted to be empty and invisible is a new
                      primitive -- a change to the VOCABULARY, not to a screen.

  separate announcer  the standard pattern, and it CONTRADICTS what 4C.6 built:
                      announcer and Alert would both announce, so the Alert
                      would have to stop being a live region -- which is the
                      profile it declares and the thing the politeness
                      conformance proves.
```

The DOM-level property is cheap and deterministic and could be asserted today,
but it would assert a property the screen does not have, and a red test for
undecided behaviour is the permanently-red stage this repository refuses. The
decision comes first, and it is not one to take while closing a stage.

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
  Stage 3 remainder        DONE. Combobox, Section, FieldGroup, Toolbar and
                           Toast all landed; Table came off this list at stage 6.
                           The two questions that deferred them are both settled
                           -- the harness answered grammar expressiveness, and
                           the AT-evidence debt is now mechanical rather than
                           remembered, so incurring it is a decision somebody
                           makes rather than a surprise at certification.

                           IT COST TWO MORE SESSIONS: Combobox and Toolbar are
                           `composite`, so the owed set went three to five. Toast
                           cost none, because it has no contract -- see below.

  A11y-3, five contracts   Combobox, CommandPalette, DataGrid, Dialog, Toolbar.
                           Five sittings with a screen reader, unscheduled --
                           and now MECHANICALLY OWED rather than remembered. The
                           `a11y-evidence` stage reads
                           `.architecture/a11y-evidence.json`, derives who is
                           gated from the profile, and treats evidence recorded
                           below a contract's `interaction.revision` as absent
                           rather than as partial credit. PENDING while the
                           design-system phase has not started, BLOCKED once it
                           has -- so it is a certification precondition and not a
                           stage anybody learns to scroll past.

                           The evidence itself cannot be generated. That is the
                           point of the level: axe and the browser specs already
                           agree the tree is correct, and what they cannot
                           observe is what a screen reader actually says.

  focus across a state     4C.5 took A11y-2 only as far as REACHABILITY, which
  swap                     is state-specific. Where focus GOES when a surface is
                           replaced under the user is not implemented: retry a
                           failed read and the button holding focus unmounts, so
                           focus falls to `<body>` and a keyboard user restarts
                           from the top of the document. Deferred rather than
                           half-tested, because the test is easy and the
                           behaviour is not -- and a red test for behaviour
                           nobody has decided on is the permanently-red stage
                           this project already refuses to ship.

  a distinct problem       REJECTED, recorded so it is not re-proposed. The
  code for a stale         boundary contains the mapper's throw at the resource
  bundle                   surface, so it never becomes a `ResourceState` and
                           the read vocabulary was left alone. Adding a member
                           to a union whose rule is "every member has a
                           producer" would have bought a second way to say what
                           the boundary already says.

  Base UI first-mount      Never measured. The per-route budget covers bytes,
  cost                     not the cost of the first component mount.

  documentation examples   Nothing verifies that a code sample in
                           `.architecture/` still reflects the code. This is the
                           stated price of narrowing four guards to executable
                           TypeScript, and it is paid nowhere else.

  sourceFiles()            Gone. This row said it was "still used by
                           config-guards with explicit arguments"; config-guards
                           had already moved to trackedFiles(), so nothing
                           called it at all — and the suppression keeping its
                           default parameter alive cited a run-guards.mjs call
                           site that no longer existed either. Three statements
                           about one function, none of them true. Deleted with
                           walk() and IGNORED_DIRS.
```

### Toast has no contract, and that is the decision rather than an omission

A toast is not PLACED in a document, it is PUSHED -- at a moment the document
knows nothing about, by code reacting to something that just happened. The
contract vocabulary deliberately cannot carry actions, and a toast is the reply
to one.

Giving `ToastViewport` a contract was the tempting half-measure, since a viewport
IS placed. It was rejected because the contract would then have to declare an
interaction profile and neither answer is true: `live-region` claims an
`aria-live` the viewport does not carry (Base UI puts the live semantics on each
Toast.Root), and `none` routes it into an inertness suite asserting that a
component which announces nothing announces nothing -- false of the thing as a
whole. `boundary.tsx` is the precedent: `ErrorBoundary` has no contract either,
because no document can say "and catch render errors here".

The consequence is worth stating plainly: Toast is reachable from code and NOT
from a metadata document, and it adds no assistive-technology obligation because
it declares no gated profile. The second half of that sentence is a real gap in
coverage, not a saving -- what a screen reader does with a toast queue is exactly
the sort of thing A11y-3 exists for, and nothing here will ever ask for it.

## What a resuming session needs, that the code does not say

The repository records what was decided and what was proven. It does not record
the shape of the argument that produced them, and three are load-bearing here:

**Producibility, renderability, and mapping are three different facts with three
different owners.** A state can be constructible, mappable, and unrenderable.
4A gave `partial` a producer, 4B mapped it, 4C.0 rendered it — and until 4C.0 the
screen discarded the completeness envelope, so a truncated list drew as a
complete one. The vocabulary was correct and the screen contradicted it.

**An enforcement mechanism must prove that it can fail.** Every guard here has a
violating fixture and a clean one, and the harness additionally asserts a
rejection is actionable. That rule was earned: a guard was reported PROVEN while
its message read `NaN`, and it was caught by eye.

**A compile-time check written in `e2e/` is real only as of 4C.5.** That
directory was outside `tsconfig.json`'s `include`, so `tsc --noEmit` never saw
it, and any type-level guard written there would have been decorative — the
exact shape of a check that cannot fail. `tests/**/*.tsx` was missing for the
same reason, which is why the `Window` augmentation in `tests/harness/mount.tsx`
was invisible to the spec that reads it. Both are in the program now, and the
a11y tables are keyed on the state unions precisely because that is finally
enforceable rather than aspirational.
