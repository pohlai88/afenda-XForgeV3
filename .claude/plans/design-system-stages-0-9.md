```
STATUS: PLAN RECORD — NOT CURRENT PROJECT STATE
CURRENT STATE AUTHORITY: .architecture/project-state.md
```

# Design system — a machine-addressable interaction language (Stages 0–9)

## Why this file exists

This plan lived only in a per-user directory outside the checkout. Stages 0–5
executed and left their reasoning in commits and in the evidence register;
Stages 6–9 did not, and existed nowhere the repository could see. This is that
record, preserved.

**It is a record of a plan, not a statement of state.** Where it and
`.architecture/project-state.md` disagree, the state file is right and this file
is out of date. It is not updated as work proceeds, and no line here should be
read as a claim about today.

Every observation about what executed is phrased as of **2026-09-01**, when this
record was captured. `git log` is the authority on that, then and now.

---

## The constraint that shaped everything

Two consumers: hand-built JSX, and the **metadata renderer** that composes form
and list structure from configuration. A library serving only JSX authors gets
rewritten when that renderer lands.

### Prior art, verified 2026-08-31

| source | supports |
|---|---|
| Base UI quick start · Dialog | `@base-ui/react` v1.7.0, tree-shakable — **no Table/DataGrid**; Dialog manages initial/final focus and modal trapping |
| TanStack Table v9 | explicit `tableFeatures()` so unused code tree-shakes; logical `start`/`end` pinning |
| W3C APG grid | `role="grid"` is composite: one tab stop, arrows move cells; focus target depends on cell content |
| Web Vitals | **Lighthouse cannot measure INP** — it is a lab navigation test; use TBT there |
| WCAG 2.5.8 | 24×24 CSS px **or** documented exceptions, including spacing |
| DTCG FAQ | format stable at v2025.10, **not** W3C Standards Track |

**Not settled by prior art:** the two-consumer constraint. The three-tier token
hierarchy is an Xforge decision *stored in* DTCG format, not a DTCG requirement.

## Six laws

1. Tokens are the visual authority.
2. UI contracts are the metadata vocabulary authority.
3. Contracts define vocabulary **and legal composition**; metadata cannot
   construct a tree outside that grammar.
4. Metadata references registered contract IDs. It never imports a component path.
5. Policy, domain and API influence application composition and are never
   dependencies of UI.
6. Artifacts, Storybook, Figma and AI output are evidence — never authority.

```
@xforge/tokens → @xforge/ui → @xforge/metadata-ui ┐
                                                  ├→ application
@xforge/policy · API · metadata ───────────────────┘
```

---

## Stages 0–5 — executed

Recorded here for the shape of the argument only; the commits and the evidence
register carry what actually happened.

- **Stage 0 — measure before any budget exists.** TBT, not INP, in Lighthouse,
  because INP needs real interaction. Custom marks are contracts, not
  instrumentation: `xforge:route-ready` fires only when primary content is
  rendered, placeholders no longer stand in for it, and the primary keyboard
  interaction is usable. Skeletons can make LCP lie. Raising a threshold is its
  own commit carrying the measured number.
- **Stage 1 — contracts, grammar, registry.** `kind` and interaction are
  orthogonal: Dialog is `layout` and has the most consequential focus management
  in the system, so gating accessibility by `kind` would exempt it. Three
  versions with three reasons to change — `uiLanguageVersion`,
  `contractVersion`, `interactionRevision`. Contracts are pure serializable
  data. Three entrypoints, or the registry becomes a bundle aggregation point.
- **Stage 2 — tokens: third tier, density, theme.** Theme and density are
  independent composable axes whose correctness does not depend on CSS
  declaration order. A component token exists only when changing that component
  independently of its semantic category is a supported operation — unguardable
  as prose, so a count ceiling raised only in its own commit.
- **Stage 3 — primitives on Base UI.** Only what later stages consume. Every
  primitive is an ARIA contract committed to before the renderer's shape is
  known. Deferred until a consumer exists: Menu, Select, RadioGroup, Switch,
  Tabs, Popover, Tooltip, Breadcrumb.
- **Stage 4 — the states, as a type.** `UiProblem` is ui-local and structural;
  importing the API's `Problem` would break law 5. `partial` gets its producer
  and its wire marker together, and the marker is a response envelope rather
  than a header, because completeness is part of the meaning of the
  representation.
- **Stage 5 — conformance harness.** Express the existing screen as
  configuration and render it through the contracts. **Criterion 3 is the real
  output:** the list of things the vocabulary could not say. Without it, a
  harness that renders *something* gets declared a pass. It ships as a Playwright
  fixture, not a dev route, and it must not acquire application capabilities.

As of this record, the branch carried 31 commits from `aac5d45` to `ce4cf92`,
and `.architecture/project-state.md` placed 4C.0 through 4C.2 as done with 4C.3
next. **Read that file, not this paragraph.**

---

## Stage 6 — the two patterns *(not started as of this record)*

**CommandPalette.** Fuzzy search, recents, keyboard-first. Takes `commands` as
props; the application resolves and filters by policy. UI never asks who you are.

**Table and DataGrid are different contracts:**

```
Table      passive tabular content · native <table> · ordinary Tab · sortable
DataGrid   composite widget · one tab stop · arrows move cells · managed focus
```

> Never apply `role="grid"` because a table looks sophisticated.

**The keyboard model lives in the contract as data** — otherwise it has three
sources: the plan, the artifact's map, and the specs. Generate the map and the
*coverage* tests from it.

```
Arrow          cell navigation      Enter / F2    enter edit
Home / End     row boundaries       Escape        cancel edit
Ctrl+Home/End  grid boundaries      Shift+Space   select row
Shift+Arrow    extend selection     Ctrl+A        select all, if supported
```

**Where focus lands depends on cell content** (APG): plain value → the
`gridcell`; a single Button or Checkbox → that control; editable text or a
combobox → `gridcell`, then Enter/F2 into the editor.

TanStack Table v9 supplies logic and **no ARIA**. Register only the features
used. Logical `start`/`end` pinning. `@tanstack/react-virtual` only when row
counts justify it. Inline edit carries the version token and surfaces 409 as a
first-class state.

Scope: selection and its keyboard model are in. *Invoking* bulk operations, and
undo, are out.

> **Cut line, with blast radius.** Cut the grid entirely: the `DataGrid` contract
> must not ship (or the resolver guard goes red), the artifact loses its grid
> section, the A11y-3 gating list loses DataGrid and inline edit, and the Stage 0
> re-measure moves to after the palette. Ship half a grid and you ship fake
> accessibility.

## Stage 7 — the reference artifact *(not started)*

Now, not first — importing the real `@xforge/tokens`, `@xforge/ui` and patterns.
Putting it first would have made it a parallel implementation of a palette and
grid that did not exist.

Shows all three token tiers · every primitive and state · light/dark ·
comfortable/compact · palette and grid operable · the keyboard map **generated
from the contracts**.

No centred hero, no purple gradient, no uniform pill radii, no Inter. Dense,
quiet, legible.

## Stage 8 — enforcement *(not started)*

**Testing has two authorities**, because a contract that generates both the
documentation and the tests is a tautology: set `ArrowRight → previous cell` and
the contract, the docs, the generated test and the implementation all agree, and
all are wrong.

```
contract          → generated COVERAGE tests
                    every declared shortcut has a test
                    every capability has a test, every state renders

APG / house rule  → hand-authored CONFORMANCE tests
                    ArrowRight moves NEXT · Tab enters the grid once
                    Escape leaves edit · Tab stays within a modal
                    focus returns on close · accessible name exists

BOTH must pass.
```

**Three accessibility levels, with the requirement derived from
`interaction.profile`, not from `kind`:**

```
A11y-1  mechanical      axe via Playwright, every state
A11y-2  interaction     keyboard, focus, ARIA state, live regions, target size
A11y-3  assistive tech  NVDA + Chrome, VoiceOver + Safari
                        required: modal · composite · composite-grid · form-control
                        not required: none · native-control · live-region
```

Evidence is manual, the gate mechanical — `.architecture/a11y-evidence.yaml`,
keyed by component and **interactionRevision**.

> Guard: no contract whose profile requires evidence may have an
> `interactionRevision` exceeding the revision with recorded evidence.

That gate is red on day one by construction. Give it the `unmet()` treatment —
PENDING before the design-system phase, failing after — so it is a
**certification precondition**, not a permanently-red stage people learn to
ignore.

Guards, each with violating and clean fixtures: every `exposure: 'metadata'`
contract has one runtime resolver and every resolver a contract; every slot's
`accepts` names registered ids or kinds; contracts contain no functions, JSX or
imported runtime values; only the harness and `metadata-ui` import
`@xforge/ui/runtime`; a component may not reference a primitive token directly;
`packages/ui` may not import `@xforge/policy`, `@xforge/api-client`, or any
`modules/*`.

## Stage 9 — certify *(not started)*

Advance `currentPhase` to `design-system` only when the in-scope obligations are
met **and mechanically enforced**, and every shipped contract requiring AT
evidence has it. Its own commit, touching only `.architecture/state.json`.

---

## Not in scope, deliberately

Responsive/mobile layouts, saved views, invoking bulk operations, undo,
optimistic UI, PWA offline. A programme, not a round.
