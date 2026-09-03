# ADR-031 — Component policy is authored; the React primitive is a projection

**Status:** Proposed · 2026-09-03
**Not FROZEN because the qualification slice has not been run**, not because the
repository is unready. See Verification — four conditions, all of them about this
decision rather than about restoring anything.
**Relates to:** ADR-028 (Tailwind + shadcn base), ADR-029 (one UI system),
ADR-024 (governance ratio), ADR-025 (AT evidence is risk-based).

## Context

On 2026-09-03 one command — `shadcn add --all` — put 43 vendored components into
`packages/design/src/components/ui/`. Everything that followed is the argument
for this ADR, and none of it is hypothetical:

**232 utility references resolved to nothing.** The generator deliberately closes
nine Tailwind namespaces (`--color-*`, `--text-*`, `--radius-*`, `--shadow-*`,
`--leading-*`, `--tracking-*`, `--font-weight-*`, `--breakpoint-*`,
`--container-*`) so a screen cannot reach a number nobody here chose. The
vendored components are written against exactly those erased scales. The closure
worked; what it caught was the library installed on top of it.

**23 classes write a design value instead of naming a role.** Every one is in a
vendored component: `rounded-[4px]`, `text-[0.8rem]`, `p-[3px]`, `leading-snug`,
`tracking-widest`, `bg-[oklch(from_var(--primary)_0.93_calc(c*0.4)_h)]`.
`tests/unit/design-system-classes.test.ts` reports them and nothing prevents
them, because the guard that would have — `no-bespoke-styling` — was deleted the
same day.

**A hand-fix to a vendored file is reverted by the next install.**
`tracking-tight` was removed from `empty.tsx`. `shadcn add --overwrite` restores
it, silently, and no check would report it.

**Six colour roles had to be invented to make one component work.** `sidebar.tsx`
alone required `sidebar`, `sidebar-foreground`, `sidebar-accent`,
`sidebar-accent-foreground`, `sidebar-border` and `sidebar-ring` — 49 dead
references until they existed. The component demanded tokens; the token file had
no way to know a component wanted them.

The common shape: **the component is the authority and the token file is
downstream of it**, which is backwards, and every symptom above follows.

### The law-30 precondition is now met, and that matters

`packages/design/src/contracts.ts` — the component registry, 209 lines, deleted
in `ae4e294` one commit before this session — declined to build this layer, in
writing:

> NO SLOT GRAMMAR YET, and that is a decision. The system this replaces carries
> `slots` and `props` per contract because a metadata renderer was planned to
> read them. No renderer exists. Building the grammar before its only consumer
> would be infrastructure ahead of a measured pain (law 30), and a grammar
> nobody validates against drifts from the components silently.

That was correct when written. The pain is now measured, in the four paragraphs
above. This ADR exists because the precondition that file named has been
satisfied — not because a grammar became fashionable.

The same commit took the component registry itself, so ADR-029's claim that "all
33 keep their id, profile, slots and revision" is no longer true of this
checkout.

## Prior art

### What already exists here is a NAMESPACE, not an implementation

The distinction matters, because otherwise a later reader takes the existing
`component` enum as prior authorisation for a compiler. It is not. Three separate
things wear the word:

| | Exists? | Where |
|---|---|---|
| 1. component **policy kind** | **yes** | `define-policy.mjs:20` — `POLICY_KINDS` is `['foundation', 'component', 'interaction', 'projection']`. The kind is declared; no tree implements it and `index.mjs` composes three. |
| 2. component **token tier** | **yes** | `vocabulary.mjs:60` classifies it; `vocabulary.mjs:78` sets `ALLOWED_EDGES.component = ['component', 'semantic']`, so a component token may never reach a primitive — allowing that "makes the semantic layer optional decoration". `generators/tokens.mjs:711` enforces `COMPONENT_TOKEN_CEILING`, **0 of 12 used**, with a protocol to raise it "in its own commit with the count and the reason". |
| 3. component **policy grammar and projection** | **no** | slots, axes, adapters, recipes, compiler. None of it exists. |

So **the repository already reserves the namespace for this decision, including
its dependency boundary and its anti-proliferation ceiling.** Carbon's
core-versus-component split and the discipline against minting tokens freely are
already adapted here and can be read in `vocabulary.mjs` rather than cited.

What ADR-031 decides is item 3, which is new.

### External approaches reviewed

**Base UI** as the behaviour layer. Verified in session, quoted below. Unstyled,
exposes state as data attributes, exposes CSS variables for geometry. The correct
thing to adapt rather than reimplement.

**shadcn as distribution, not as authority.** Exercised directly:
`components.json` declares `style: base-nova`, which resolves to Base UI rather
than Radix; `shadcn add --all` skipped 19 existing files and wrote 43; `--yes`
does not cover per-file overwrite prompts. A real distribution channel and a poor
authority.

**Material 3** as a benchmark, via the `material-3` skill installed 2026-09-03
(MIT, CWTI Ltd — a third-party restatement of `m3.material.io`, not the spec).
Read in session: elevation as six levels with tonal offsets, window size classes
at 600/840/1200/1600, shape corners 0–48dp.

**IBM Carbon** for the core/component token distinction. **NOT RETRIEVED.** Two
attempts at `carbondesignsystem.com` returned truncated content and no quotable
text. Recorded as asserted-by-proposal and unverified. The decision below does
not rest on it, because the same distinction is already implemented here.

### Evidence

| Source | Retrieved | Supports |
|---|---|---|
| [Base UI — Styling](https://base-ui.com/react/handbook/styling) | 2026-09-03 | "Base UI components are unstyled, don't bundle CSS, and are compatible with Tailwind…" |
| [Base UI — Styling](https://base-ui.com/react/handbook/styling) | 2026-09-03 | "Components provide data attributes designed for styling their states. For example, Switch can be styled using its `[data-checked]` and `[data-unchecked]` attributes" |
| [Base UI — Styling](https://base-ui.com/react/handbook/styling) | 2026-09-03 | "Components expose CSS variables… Popover exposes CSS variables on its `Popup` component like `--available-height` and `--anchor-width`" — the two variables this session's scan could not resolve in `combobox.tsx`, confirming they are Base UI's to supply and not tokens to mint |
| `vocabulary.mjs:60,78` · `generators/tokens.mjs:711` | 2026-09-03 | The component tier, its alias boundary and its ceiling already exist, unused |
| `packages/design/src/contracts.ts` @ `ae4e294^` | 2026-09-03 | The slot grammar was deferred under law 30, pending measured pain |
| This session's `scan3.mjs` | 2026-09-03 | 232 → 0 unresolved utility references; 23 raw-value classes, all in vendored components |
| carbondesignsystem.com, core vs component tokens | **not retrieved** | recorded unverified; nothing below depends on it |

### What prior art does NOT prove

**That a component compiler costs less than the 43 files it replaces.** This is
the load-bearing doubt and this repository is its own counter-example. ADR-024
recorded a governance-to-product ratio of **1.32 : 1** and observed that "the
governance layer has been generating its own defects" — a `\b` becoming a control
character four separate times among them. A `\b` in a template literal became a
backspace character *again* in this session, in a scan written to check this very
work, and it reported zero problems while matching nothing. A component compiler
is more governance. Nothing cited here shows it will not behave the same way.

**That generation beats a thin hand-authored wrapper.** Nothing reviewed compares
the two. That comparison is now a required qualification step, not an assumption
— see Alternatives and Verification.

**That Base UI's data attributes survive a generated wrapper.** The quote
establishes state is exposed. It says nothing about whether a wrapper this
repository generates forwards it, and a dropped `data-checked` is invisible until
a selector silently matches nothing.

**That the axis vocabulary survives 60 components.** `variant` / `size` / `tone`
is a hypothesis about this product. Four components are written; the proposal
generalises from zero. Hence the no-speculative-axis rule below.

**That the old enforcement estate is a prerequisite.** Every architecture guard,
the verify gate and all three authorship hooks were deleted on 2026-09-03, and
law 29 currently has nothing behind it. That is a real gap and it is not this
ADR's to close. Rebuilding the deleted governance estate before touching Card
would be restoring infrastructure because it once existed — the mirror image of
building it before it is needed, and wrong for the same reason. This work carries
the smallest enforcement that governs itself: the component policy, its
conformance tests, and the mutation fixtures below.

## Decision

**POPULATE + PROJECT, staged** — which is more precise than ADAPT, because the
four parts are decided differently:

    existing component policy kind   →  POPULATE
    existing component token tier    →  USE, only when justified
    native / Base UI behaviour       →  ADAPT
    React implementation             →  PROJECT  (conditional — see below)

### Architecturally decided

1. **Component policy is the authority; the React primitive is downstream.** The
   relationship `tokens.json` already has with `tokens.css`, under law 27.
2. **The component policy tree fills the kind already declared** —
   `packages/design/policy/components/`, registered through `POLICY_KINDS` and
   `assertPolicyRegistry`. No new kernel.
3. **Base UI supplies behaviour; policy supplies design.** Two source adapters,
   `native` and `base-ui`, and no more. M3, Carbon and Apple are benchmarks and
   evidence inputs, never adapters — they are not equivalent sources and
   modelling them as such is a category error.
4. **No speculative axis.** An axis enters the shared vocabulary because a real
   component needs it; once shared, its meaning may not vary by component. This
   sentence belongs in `axes.mjs`. Populating `variant / size / tone /
   orientation / side / align` up front would be infrastructure ahead of its
   consumer — the exact thing the deleted `contracts.ts` refused to do, and the
   reason this ADR is allowed to exist at all.
5. **State is never a variant.** `checked`, `open`, `selected`, `disabled`,
   `invalid` are behaviour.
6. **Component tokens start at zero.** Card, Switch and the overlay qualifier are
   attempted without minting one. The first is minted only with a written
   justification — *semantic role X cannot express this because …; this component
   must evolve independently because …* — which is what makes the existing
   ceiling mechanism useful rather than decorative.
7. **shadcn is distribution and anatomy reference; its styling is never
   transformed.** No AST rewriting of upstream files.
8. **Transitional import rule.** Vendored and projected components coexist during
   migration, so: existing imports of `packages/design/src/components/ui/*` may
   remain; **no new application import may target the vendored tree**; new
   application code imports the package facade only. A guard for this is added
   the day an enforcement surface exists — until then it is prose, and this
   sentence says so rather than implying otherwise.

### Conditional, and it is the compiler itself

9. **Whether React is GENERATED rather than thinly hand-authored is a
   qualification decision, not an architectural one.** If the qualification slice
   shows the projection machinery creates more bespoke implementation than it
   removes, **the component policy, the adapters, the axes and the token
   discipline all remain, and React becomes a hand-authored projection of the
   same policy.** That rollback does not invalidate anything in 1–8.

   This separation exists so that "the compiler failed" cannot be mistaken for
   "the architecture failed".

10. **`SCALE_ALIASES` is provisional.** This session added `--text-sm`,
    `--radius-md`, `--shadow-md`, `--tracking-widest` and `--leading-relaxed` as
    aliases onto roles so vendored components would compile.
    `design-system-classes.test.ts` names `leading-relaxed` and `tracking-widest`
    in its `STATIC_HOLES` and counts them as violations **whether or not they
    resolve**. Two checks disagree about one fact; the older and stricter one is
    right, because compiling was never the standard.

    Deletion is tied to zero consumers, not to a human milestone. Delete when all
    four hold: projected primitives contain zero references; application code
    contains zero references; the generated Tailwind projection has no required
    consumer; and the omission scan and the static-hole test agree on zero.

## Alternatives considered

**Hand-authored Afenda wrappers over Base UI, with the same policy and no code
generation. NOT REJECTED — this is the control case.**

    function Switch(props: SwitchProps) {
      return (
        <BaseSwitch.Root data-slot="switch" {...props}>
          <BaseSwitch.Thumb data-slot="switch-thumb" />
        </BaseSwitch.Root>
      )
    }

It satisfies the same boundary as generation — canonical axes and slots, Base UI
behaviour, semantic tokens, no shadcn styling authority, one public facade — with
substantially less machinery. Given ADR-024's ratio and this repository's
recorded history of governance code generating its own defects, it is the
architecture that must be beaten rather than assumed away. Generation is adopted
only if the qualification slice shows it removes repeated implementation
decisions or defects that the hand-authored control does not.

**Hand-upgrade the 43 vendored components.** Rejected. Leaves the component as
the authority, and `shadcn add --overwrite` reverts every fix without reporting
it — observed, not predicted.

**Keep vendored files and add a lint rule.** Rejected as insufficient, though the
cheapest thing that helps. It catches raw values; it cannot make a component
declare the tokens it needs, which is what `sidebar.tsx` demanded.

**AST-transform shadcn output.** Rejected: one upstream change breaks the
transformer, and the failure is silent.

**Do nothing until the deleted gate is rebuilt.** Rejected, after being the
sequencing objection that first shaped this ADR. Restoring the whole governance
estate before touching Card would be rebuilding infrastructure because it once
existed, which is the same error as building it before it is needed. This work
carries the smallest enforcement that governs itself — the policy, its
conformance tests, and the mutation fixtures — and the wider gap is real, named
in "What prior art does NOT prove", and someone else's commit.

**Adopt Carbon's or M3's component model wholesale.** Rejected. They are
benchmarks. This repository already has a token architecture with properties
neither describes — density as a mode axis, contrast measured per role pair — and
a foreign component model would stand a second vocabulary beside it.

## Consequences

**Positive.** One authority per component. A component declares the tokens it
needs and generation can refuse it if they do not exist. Documentation, registry
entries and conformance tests become projections of the same policy — which is
how `InteractionProfile` was always meant to dispatch the ADR-025 accessibility
gate. `pnpm ui:sync` becomes a compatibility check rather than a merge.

**Negative, accepted knowingly.** If generation is chosen, this is a compiler, in
a repository with a recorded history of its compilers generating their own
defects. The generated `.tsx` must be read as output, not authorship. A wrong
axis vocabulary is expensive once many policies use it — which is why axes are
demand-driven rather than designed.

**The cost that is easy to under-count:** every vendored component becomes a
policy someone writes. 43 exist. A `card.mjs` is roughly the size of the
`card.tsx` it replaces. The saving is not line count — it is that a design
decision has one place to live.

## Migration / rollback

Rollback is cheap deliberately: vendored components stay on disk and in git until
their policies replace them one at a time. A projected component replaces a
vendored one only when its policy exists, it typechecks, and the omission scan
reports zero for that file.

Order — grammar first, then three qualifiers that exercise genuinely different
adapters:

    contract.mjs + minimal axes.mjs   the grammar, before any component
              ↓
    Card                              native adapter, compound visual slots
              ↓
    Switch                            base-ui adapter, simple binary state
              ↓
    Combobox                          base-ui adapter, COMPOUND OVERLAY

The third is not optional. Card and Switch together prove nothing about portals,
anchor positioning, popup geometry, multiple Base UI parts, controlled and
uncontrolled open state, focus management, layering, outside-interaction, or
**CSS variables supplied by Base UI rather than by tokens** — and that last one
is already a live question here, since `--available-height` and `--anchor-width`
are exactly what this session's scan could not resolve in `combobox.tsx`.

Nothing fans out to the remaining 40 until all three are projected, green, and
have survived one upstream sync.

## Verification

**Four conditions. All are about this decision; none is about restoring
something.**

1. **Card, Switch and Combobox conform to the component policy** — the three
   adapters that matter: native, simple stateful, compound overlay.

2. **Base UI behaviour and state survive the adapter** — asserted, not assumed.

3. **The policy and conformance checks can demonstrably FAIL**, through the
   mutation fixtures below. A compiler that cannot fail its own conformance test
   has proven nothing, which is the lesson this session learned three separate
   times.

4. **Generation beats the thin hand-authored control.** If it does not, decisions
   1–8 stand and React becomes a hand-authored projection of the same policy.

Two properties are carried by condition 3 rather than listed separately: the
generated primitive is byte-identical after regeneration, as `tokens.css` already
is under law 27; and the omission scan reports zero for each projected file, with
the scan itself mutation-tested — it reported zero twice while being structurally
incapable of reporting anything else.

### The qualification test — negative fixtures, each of which MUST fail

A compiler that cannot fail its own conformance test has proven nothing, which is
the lesson this session learned three separate times.

| | Mutation | Required outcome |
|---|---|---|
| A | remove `sm` from the switch size policy | a TS fixture using `size="sm"` stops compiling |
| B | put `p-[13px]` in a recipe | policy validation refuses it |
| C | remove the `thumb` slot mapping | component conformance fails |
| D | stop spreading Base UI Root props/ref | the `data-checked` forwarding test fails |
| E | reference a semantic token that does not exist | generation fails |
| F | point a component token at a primitive | the existing `ALLOWED_EDGES` validation fails |

F is deliberately a test of machinery that already exists. If it does not fail,
the boundary in `vocabulary.mjs` was never load-bearing and that is worth
learning before building on top of it.
