# ADR-031 — Component policy is authored beside the component; the React primitive is hand-written

**Status:** Accepted (amended) · 2026-09-03 · Proposed, amended, and Migration steps 1–11
landed the same day against the tree as measured. Decision 9 (generation) REJECTED with two
revisit triggers. §Beta, the Xforge Component Adaptation Protocol: **creation core FROZEN**
— the five stages, the No-Leakage Law, Adapter-versus-Composition, the Primitive and
Compound classes, ADOPT and INSPIRE — on the beta record in Migration step 5. **The
maintenance loop ran once** (Migration step 6): PREVIEW, ASSESS and REFRESH are proved and
frozen with the core; **RECONCILE is proved only in its null form** — no upstream change has
reached an Adapter — and stays provisional. TRANSLATE, the Integration Adapter class and the
registry future remain provisional. The Adapter file schema is normative and enforced. Verification 1, 5, 6, 7, 8 and
9 exist, were observed RED first, and were green on the author's run; behaviour survival for
Switch and Combobox is proved in Chromium (Verification 6).
**Amended 2026-09-03 by Decision 12** — components SELECT style, they do not DEFINE it.
ADR-034 makes the style plane a closed language, and this ADR stops being an authority for
style creation while remaining the authority for component structure, semantics and
adaptation. Decision 12 is the single normative home for that change; the sections it
touches — Decisions 1, 3, 5 and 10, the NORMALIZE stage, the ADOPT intent, the Adapter file
schema and Verification 5 — carry a pointer to it and **not a copy of it**, because six
restatements of one rule is the defect `CLAUDE.md` tracks, applied to the fix.
**Relates to:** ADR-028 (Tailwind + shadcn base), ADR-029 (one UI system), ADR-024
(governance ratio), ADR-025 (AT evidence is risk-based), ADR-032 (no restoration),
ADR-033 (entry points; the vendored tree is unexported), **ADR-034 (the closed design
language — the style plane this ADR now consumes rather than mints)**.

## Context

On 2026-09-03 one command — `shadcn add --all` — put 43 vendored components into
`packages/design/src/components/ui/`. Everything that followed is the argument for this
ADR, and none of it is hypothetical:

**232 utility references resolved to nothing.** The generator deliberately closes nine
Tailwind namespaces (`--color-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--leading-*`,
`--tracking-*`, `--font-weight-*`, `--breakpoint-*`, `--container-*`) so a screen cannot
reach a number nobody here chose. The vendored components are written against exactly
those erased scales. The closure worked; what it caught was the library installed on top
of it.

**23 classes write a design value instead of naming a role.** Every one is in a vendored
component: `rounded-[4px]`, `text-[0.8rem]`, `p-[3px]`, `leading-snug`,
`tracking-widest`, `bg-[oklch(from_var(--primary)_0.93_calc(c*0.4)_h)]`.
`tests/unit/design-system-classes.test.ts` reports them and nothing prevents them,
because the guard that would have — `no-bespoke-styling` — was deleted the same day.

**A hand-fix to a vendored file is reverted by the next install.** `tracking-tight` was
removed from `empty.tsx`. `shadcn add --overwrite` restores it, silently, and no check
would report it.

**Six colour roles had to be invented to make one component work.** `sidebar.tsx` alone
required `sidebar`, `sidebar-foreground`, `sidebar-accent`, `sidebar-accent-foreground`,
`sidebar-border` and `sidebar-ring` — 49 dead references until they existed. The
component demanded tokens; the token file had no way to know a component wanted them.

The common shape: **the component is the authority and the token file is downstream of
it**, which is backwards, and every symptom above follows.

### Where the pain was, and where it went

The first draft of this ADR read those four paragraphs as the law-30 precondition for a
component policy tree and a compiler: the deleted `contracts.ts` had declined to build a
slot grammar "before its only consumer", and here, it seemed, was the consumer. The
precondition was real. It was also met **in the vendored tree** — and ADR-033, landed the
same day, sealed that tree: `src/components/ui/**` is now unexported (`"./components/ui/*":
null`, `TS2307` at the resolver), excluded from Biome and the root tsconfig, never edited,
and refreshed only by `shadcn add --overwrite`. The 232 and the 23 are upstream's business
until a component crosses into the authored layer. What crosses is decided one component at
a time, above the file.

What remained on the morning of 2026-09-03, measured with `git ls-files | xargs wc -l`
(after Migration step 4 the policy tree is 13,518 lines in 24 files, and the authored
layer is fifteen files; the argument below was made against these numbers):

```
  packages/design/policy/**              13,962 lines   25 files
  packages/design/src/components/*.tsx      503 lines   13 files    the authored layer
  packages/design/src/components/ui/*     7,279 lines   61 files    vendored, sealed
  apps/web/app/**                         1,185 lines   10 files    one real screen
```

**Twenty-eight lines of policy for every line of authored component.** ADR-024 called
1.32 : 1 "more governance than product" and recorded that the governance layer was
generating its own defects. Inside the 13,962:

- `projection/css.mjs` (397 lines): its three emitters — `emitCssBlock`,
  `emitRootTokens`, `emitModeTokens` — have no caller; the generator assembles CSS itself.
  `cssPolicy` is registered and its import-time assertion runs; the module it guards is
  otherwise dead.
- `interaction/**` (2,735 lines): its declared subject, `contracts.ts`, was deleted in
  `ae4e294`. `policy/index.mjs`, `interaction/index.mjs` and `keyboard.mjs` still cited it;
  `assistive-technology.mjs` (then at line 487) dynamically imported it in a CLI block
  nothing invoked; `contractsOwingAtEvidence` and `ledgerFailures` had no caller.
- the component token tier: declared, edge-guarded, ceilinged at 12 (`vocabulary.mjs:49`,
  enforced at `generators/tokens.mjs:713`), **0 members**.
- `assertDensityAxis` (`foundations/density.mjs:189`): "still runs nowhere", in the words
  `foundations/index.mjs:240` then carried (that paragraph now records the wiring).

Line numbers in this section are as of the first draft; Migration step 4 changed every
one of these files, and each is described in its landed state there.

And one live defect that belonged to no layer: `packages/design/src/components/alert.tsx`
(then line 80) rendered `role="status"` for every tone, while five end-to-end assertions expect
`role="alert"` on danger and warning surfaces — `e2e/read-state-conformance.spec.ts:177,207`,
`e2e/write-outcome-conformance.spec.ts:154,175`, `e2e/error-containment.spec.ts:84`. Commit
`dc6fdad` recorded this exact defect ("TONE_ANNOUNCEMENT flattened to a constant, and the
spec deleted in the same changeset") and left it for a decision. The tone→announcement
rule is a four-row table. Today it has two owners that disagree: `alert.tsx:44-47` chooses
`status` "rather than `alert`, deliberately", with a reason, and five specs assert the
opposite. Neither reads the other. That is this ADR's whole question at the smallest scale
it comes in.

**And two of the thirteen authored files were not Adapters at all.** `button.tsx` and
`card.tsx` are, in full, `export * from '#components/ui/button'` and the same for card:
wholesale re-exports of the adaptee, written on 2026-09-03 as ADR-033's transitional
facades. Upstream `Button`'s props are `ButtonPrimitive.Props & VariantProps<typeof
buttonVariants>` — exactly the shape Decision 3's No-Leakage Law forbids, done implicitly.
`package-exports.test.ts` cannot see it: the specifier is legal, the type is the leak. This
ADR named them as the first two REFINE items after Alert; both were refined the same day
(Migration step 2), and the check that sees the shape (Verification 5) was observed red on
them first. A third finding came out of the refinement: `resource-boundary.tsx` imported
`#components/ui/button` directly while `button.tsx` existed one directory up, so the Xforge
`variant` vocabulary was bypassed and a mutation of the Button table reached nothing it
rendered. The schema gained its fifth rule from that.

The same commit that deleted `contracts.ts` took the component registry with it, so
ADR-029's claim that "all 33 keep their id, profile, slots and revision" is no longer true
of this checkout.

## Prior art

### What already exists here is a NAMESPACE, not an implementation

Three separate things wear the word "component". The namespace stays reserved and
unfilled; filling it is now the rejected path (Decision 2).

| | Exists? | Where |
|---|---|---|
| 1. component **policy kind** | **yes** | `define-policy.mjs:20` — `POLICY_KINDS` is `['foundation', 'component', 'interaction', 'projection']`. Declared; no tree implements it and `index.mjs` composes three. |
| 2. component **token tier** | **yes** | `vocabulary.mjs:77` sets `ALLOWED_EDGES.component = ['component', 'semantic']`, so a component token may never reach a primitive; `vocabulary.mjs:49` sets the ceiling at 12; `generators/tokens.mjs:712` enforces it. **0 of 12 used.** |
| 3. component **policy grammar and projection** | **no** | slots, axes, adapters, recipes, compiler. None of it exists, and none is built by this ADR. |

Carbon's core-versus-component split and the discipline against minting tokens freely are
already adapted here and can be read in `vocabulary.mjs` rather than cited.

### External approaches reviewed

**Recipe as data.** cva ("type-safe, variant-driven class names… with first-class Tailwind
CSS support"), tailwind-variants (slots: "named parts — `base`, `icon`, `label`"), Panda
(`defineRecipe` / `defineSlotRecipe`; "Use config recipes for design-system components"),
Chakra v3 (`defineRecipe`, bound with `useRecipe` or `chakra("button", buttonRecipe)`) and
Park UI all express `base / slots / variants / compoundVariants / defaultVariants` as a
config object **applied by a hand-written component**. None emits a `.tsx`. ADOPT — this
repository already does it: `text.tsx` and `stack.tsx` carry cva recipes.

**Compile-to-framework.** Mitosis ("Write components once, compile to every framework";
Deutsche Bahn's DB UX ships React/Angular/Vue/Web Components from one source — its
`packages/components/package.json` depends on Mitosis and its component sources are
`.lite.tsx` files; the README prose does not say so) and Stencil ("Stencil is a compiler that generates Web
Components"; "Stencil's primary objective is providing amazing tools for design systems and
component libraries"; Ionic; `@stencil/react-output-target` "Generate[s] React functional
component wrappers with JSX bindings") are real production compilers. Both compile from a **component source** and both are justified by
multi-framework parity, which a single React monorepo does not have. Zag.js — whose
premise is component behaviour as state-machine data — still hand-writes the React
component around the machine. REJECT as inapplicable, not as unsound.

**Headless primitive plus thin wrapper.** Base UI ("Components that render an HTML element
accept a `className` prop… Components provide data attributes designed for styling their
states"), Radix ("Extending a primitive is done the same way you extend any React
component"), React Aria (`className` and `style` "also accept functions which receive
states"), Ark UI ("Unstyled UI components for your Design System", "built on top of
Zag.js"). Unanimous: `className` + `data-*` + ordinary composition. None recommends
generating wrappers. ADOPT.

**shadcn as distribution.** The registry is "a distribution system for code". But shadcn's
stance is the opposite of never-edit: "You have full control to customize and extend the
components to your needs", and the answer to a wrapper is to "edit the button code
directly." Decision 7 inverts that deliberately and owns the reason; it does not cite
shadcn for it. The shadcn-studio
commands `/cui`, `/iui`, `/rui`, `/ftc` split by INTENT (customise a block, generate an
inspired one, refine an existing one, install from Figma), and that split is borrowed in
§Beta.

**Tokens as authority.** Carbon: "Core tokens are global colors that are used across
components… Some components have their own specific color tokens, known as component
tokens… should never be used for anything other than their own component." Primer,
Style Dictionary, DTCG 2025.10 (first stable spec, 2025-10-28). Every one generates token
artefacts — CSS, Sass, JS, JSON — and never component code. ADOPT, already in force.

**Anti-Corruption Layer and client-owned gateway.** Microsoft's Azure Architecture Center:
"Implement a facade or adapter layer between different subsystems that don't share the same
semantics… ensure that dependencies on outside subsystems don't limit an application's
design" (after Evans). Fowler on gateways: "construct an interface that supports that
clearly and directly… The gateway then translates this convenient API into the API offered
by the foreigner… designed to work in the terms that our system uses." This is §Beta's
NORMALIZE stage and No-Leakage Law, with their proper names — and both sources are
system-to-system patterns; what they do not say about component scale is in the next
section.

**Conformance gates.** Storybook's a11y addon (axe, "automatically catches up to 57% of
WCAG issues"), jest-axe (citing GDS: "around ~30% of access barriers are missed by
automated testing"), `@axe-core/playwright`, Chromatic, Playwright component testing. The
proven gate is axe plus visual baselines plus interaction tests. Two studies of two
populations put automated coverage somewhere between a half and two thirds; none detects a
**semantic policy defect** — a wrong slot, a wrong tier, a leaked type. A generator could
not have been validated by it.

**Base UI** as the behaviour layer and **Material 3** as a benchmark: as in the first
draft, verified in session, quoted below.

**A post-mortem.** One found: a design-system team built an XML DSL and a generator
emitting JSX from Figma data; the organisation was disbanded. Its lesson: "we should have
implemented just the minimum functionality needed to confirm whether our target scale
would actually work." Weak evidence (one personal account), recorded as the only direct
match found; sources examined are listed in the table.

### Evidence

| Source | Retrieved | Supports |
|---|---|---|
| [Base UI — Styling](https://base-ui.com/react/handbook/styling) | 2026-09-03 | "Components that render an HTML element accept a `className` prop"; "Components provide data attributes designed for styling their states" (`[data-checked]`); Popover exposes `--available-height`, `--anchor-width` — Base UI's to supply, not tokens to mint |
| [Radix Primitives — Styling](https://www.radix-ui.com/primitives/docs/guides/styling) | 2026-09-03 | "All components and their parts accept a `className` prop"; `data-state`; "Extending a primitive is done the same way you extend any React component" |
| [React Aria — Styling](https://react-aria.adobe.com/styling) | 2026-09-03 | `className`/`style` "accept functions which receive states"; Tailwind plugin shipped |
| [Ark UI](https://ark-ui.com/) · [About](https://ark-ui.com/docs/overview/about) | 2026-09-03 | "Unstyled UI components for your Design System"; "Framework Agnostic… React, Solid, Vue, and Svelte"; "built on top of Zag.js" — parity via shared machines, not generated components |
| [cva](https://cva.style/docs) | 2026-09-03 | "type-safe, variant-driven class names… first-class Tailwind CSS support"; a class-name builder, not a component emitter |
| [tailwind-variants](https://www.tailwind-variants.org/docs/introduction) | 2026-09-03 | slots as "named parts — `base`, `icon`, `label`"; component hand-written |
| [Panda CSS — Recipes](https://panda-css.com/docs/concepts/recipes) · [Slot recipes](https://panda-css.com/docs/concepts/slot-recipes) | 2026-09-03 | `defineRecipe` is config; "Use config recipes for design-system components and leaner CSS."; slot recipes: "To define a config slot recipe, import the `defineSlotRecipe` function" |
| [Chakra UI v3 — Recipes](https://chakra-ui.com/docs/theming/recipes) | 2026-09-03 | declarative `defineRecipe`; `useRecipe`; "Use the `chakra` function to create a component from a recipe." — a factory call in hand-written code |
| [Park UI](https://park-ui.com/) · [Introduction](https://park-ui.com/docs/introduction) | 2026-09-03 | "built with Ark UI and Panda CSS"; installed by CLI or by copying "component source code" — source, not a generator |
| [Mitosis](https://github.com/BuilderIO/mitosis) · [DB UX core-web](https://github.com/db-ux-design-system/core-web) | 2026-09-03 | "Write components once, compile to every framework"; DB UX ships React/Angular/Vue/Web Component packages — its `packages/components/package.json` depends on Mitosis (the README does not say so; the repository does) — justified by four targets |
| [Stencil](https://stenciljs.com/docs/introduction) · [React output target](https://stenciljs.com/docs/react) | 2026-09-03 | "Stencil is a compiler that generates Web Components"; "Stencil's primary objective is providing amazing tools for design systems and component libraries"; "Generate React functional component wrappers with JSX bindings" — mechanical bindings |
| [Zag.js](https://zagjs.com/overview/introduction) | 2026-09-03 | "Powered by state machines"; "We provide adapters for JS frameworks so you can use it in React, Solid, or Vue 3" — hand-written adapters around a shared machine, no generated component |
| [shadcn — Docs](https://ui.shadcn.com/docs) | 2026-09-03 | "You have full control to customize and extend the components to your needs"; "edit the button code directly" — the stance Decision 7 inverts |
| [shadcn — Registry](https://ui.shadcn.com/docs/registry) · [registry-item.json](https://ui.shadcn.com/docs/registry/registry-item-json) · [Examples](https://ui.shadcn.com/docs/registry/examples) | 2026-09-03 | "A distribution system for code"; the item schema declares `files`, `dependencies`, `devDependencies`, `registryDependencies`, `cssVars`, `meta`; target aliases resolve from `components.json` "so the same registry item works in projects using `@/`, custom TypeScript aliases, package imports or workspace package exports" |
| [shadcn — GitHub registries](https://ui.shadcn.com/docs/registry/github) | 2026-09-03 | "Review the item definition, especially `files`, `target`, `dependencies`, `devDependencies`, `registryDependencies` and `envVars`"; "Prefer pinned refs"; `--dry-run`, `--diff`, `--view` |
| [shadcn-studio — MCP server](https://shadcnstudio.com/docs/getting-started/shadcn-studio-mcp-server) | 2026-09-03 | `/cui` "reuse the structure and feel of an existing shadcn-studio block, but customized"; `/iui` "a new, inspired UI"; `/rui` "updates or tweaks"; `/ftc` from Figma |
| [shadcn-studio — CLI](https://shadcnstudio.com/docs/getting-started/how-to-use-shadcn-cli) | 2026-09-03 | "add ready-to-use assets without the need for NPM packages, following a simple 'copy-and-paste' approach" |
| [shadcn-studio — Components](https://shadcnstudio.com/docs/getting-started/components) | 2026-09-03 | "projects using the Tooltip component without an explicitly defined `TooltipProvider` may now encounter errors across affected blocks and components" — a provider dependency imposed by an upstream change |
| [Carbon — colour tokens (carbon-website MDX)](https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/color/tokens.mdx) | 2026-09-03 | "Core tokens are global colors that are used across components"; component tokens "should never be used for anything other than their own component" (the rendered site truncated; the repository source did not) |
| [Primer — Color primitives](https://primer.style/foundations/primitives/color) | 2026-09-03 | functional (`--fgColor-accent`) beside component/pattern (`--button-primary-bgColor-rest`) tokens, emitted as CSS variables only |
| [Style Dictionary](https://styledictionary.com/) · [DTCG Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/) | 2026-09-03 | "Export your Design Tokens to any platform"; DTCG "Final Community Group Report", 28 October 2025, "considered stable". Token artefacts only. (The `/tr/drafts/` preview says not to cite it and is not cited) |
| [Azure Architecture Center — Anti-Corruption Layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer) | 2026-09-03 | "Implement a facade or adapter layer between different subsystems that don't share the same semantics… ensure that dependencies on outside subsystems don't limit an application's design" |
| [Fowler — Gateway](https://martinfowler.com/articles/gateway-pattern.html) | 2026-09-03 | "construct an interface that supports that clearly and directly… translates this convenient API into the API offered by the foreigner… designed to work in the terms that our system uses" |
| [Storybook — Accessibility testing](https://storybook.js.org/docs/writing-tests/accessibility-testing) · [jest-axe](https://github.com/nickcolley/jest-axe) · [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) | 2026-09-03 | axe "automatically catches up to 57% of WCAG issues" (Deque, via Storybook); "around ~30% of access barriers are missed by automated testing" (GDS, via jest-axe) — two studies, two populations, not one range |
| [MDN — ARIA `alert` role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role) | 2026-09-03 | "Setting `role="alert"` is equivalent to setting `aria-live="assertive"` and `aria-atomic="true"`"; "must be used sparingly and only in situations where the user's immediate attention is required" |
| [MDN — ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) | 2026-09-03 | "adding both `aria-live` and `role="alert"` causes double speaking issues in VoiceOver on iOS"; for `status`: "To maximize compatibility, add a redundant `aria-live="polite"`" |
| ["The Story of My Failed Design System"](https://dev.to/hsskey/the-story-of-my-failed-design-system-a85) | 2026-09-03 | an XML DSL plus JSX generator; "implement just the minimum functionality needed to confirm whether our target scale would actually work" — weak, one account, the only direct match |
| `git ls-files \| xargs wc -l`, the tree of the morning of 2026-09-03 (before steps 4–6) | 2026-09-03 | policy 13,962 (25 files) : authored components 503 (13 files); vendored 7,279 (61 files). After step 6: 59 vendored files, verbatim |
| `packages/design/src/components/button.tsx`, `card.tsx`, in full | 2026-09-03 | `export * from '#components/ui/button'` / `…/card` — the adaptee's `Props & VariantProps<…>` re-exported as the Target; the No-Leakage Law violated by two of the thirteen |
| `projection/index.mjs:63-76`, `foundations/index.mjs:240`, `assistive-technology.mjs:487`, as of the first draft | 2026-09-03 | the dead surfaces named in Context; all three files were changed by Migration step 4 and the lines now describe the deletion or the wiring |
| `alert.tsx:80` (first draft; the role is read from the table at `:90` now) against the five e2e lines | 2026-09-03 | the live `role` contradiction, since resolved by Migration step 1 |
| `vocabulary.mjs:49,77` · `generators/tokens.mjs:712` · `generated/FOUNDATIONS.md` | 2026-09-03 | the component tier, its edge boundary and ceiling exist and hold 0 of 12 |
| `packages/design/src/contracts.ts` @ `ae4e294^` | 2026-09-03 | the slot grammar was deferred under law 30, pending measured pain |
| Not retrieved: W3C WCAG technique ARIA22 (HTTP 403); carbondesignsystem.com rendered page (truncated, replaced by the repository MDX) | 2026-09-03 | recorded; nothing below rests on either |

### What prior art does NOT prove

**That recipe-as-data is needed at fifteen components.** The field runs it at fifty and
more. Here it is over-qualified, not under; the danger is mandating it where a component
owns no axis at all, which is why Decision 1 makes recipe and contract EARNED.

**That a contract table beside a component stays in agreement with the DOM the e2e specs
assert.** Only Verification 1 says so, and against today's tree it would say no.

**That Base UI's data attributes survive a hand-written wrapper.** The quotes establish
that state is exposed. They say nothing about whether a wrapper here forwards it, and a
dropped `data-checked` is invisible until a selector silently matches nothing. Asserted,
never assumed: it is PROVE's second question in §Beta.

**That the thirteen that existed were Adapters.** The paragraph above worries about a
wrapper dropping `data-checked`. The failure actually present in the first draft's tree was
the opposite: two wrappers that forwarded everything, the adaptee's public type included.
No source above addresses type-level leakage. Verification 5 now checks it — LEXICALLY. It
reads one line per `export type|interface`; a multi-line `extends ComponentProps<typeof
Primitive>`, or an exported alias of an internal alias of the adaptee's type, passes it.
Exit question C below is answered to the strength of that check plus a reading, and no
further.

**That behaviour survives the Adapter — now proved for the two beta cases, and only for
them.** The final review found Switch and Combobox proved by server render alone while
their headers pointed at a browser suite that did not exist. The suite exists now:
Vitest's `browser` project drives the Playwright Chromium the e2e suite already installs
(`@vitest/browser-playwright`, one devDependency through the catalog; no database, no app
build, no DOM emulation). `switch.browser.test.tsx` clicks, presses Space, holds a
controlled value and refuses when disabled; `combobox.browser.test.tsx` types to open and
filter, chooses an option and receives the Xforge id, sees the label, presses Escape; after
the third review, Switch's adopted form words are exercised too — `name`, `value` and
`required` through a real `<form>`, `readOnly` under click and key. What this does NOT
prove: every other Adapter's behaviour (eleven have none of their own; Button and Card
inherit the element's), anything about appearance — the browser project loads no
stylesheet, and gives the switch a stand-in box because Tailwind compiles utilities only
inside the application build — and anything beyond one headless Chromium on one machine.

**That the Anti-Corruption Layer applies at component grain, or what NORMALIZE costs.** Both
sources describe system-to-system integration, and Microsoft says the pattern "might not be
suitable when the new and legacy systems have no significant semantic differences." The
beta did NOT measure the cost: its three adapters own no axis, so NORMALIZE ran where there
was nothing to normalise, and RECIPE and CONTRACT — sections 1 and 2 of the schema — were
exercised only by Alert and Button, outside the slice. The cost is measured by the first
adapter that owns an axis a screen asked for.

**That the maintenance loop reconciles a change that reaches an Adapter.** The loop has now
run once end to end (Migration step 6): PREVIEW and ASSESS found no upstream content change
since the morning's refresh, two items removed upstream, and a formatting drift in the
vendored tree itself; REFRESH landed verbatim bytes and the two deletions; RECONCILE found
nothing above the file to change; PROVE was green. What it did NOT exercise is the case the
loop exists for — an upstream change to a primitive's API or DOM that an Adapter must absorb
— because none has arrived. PREVIEW, ASSESS and REFRESH are proved by this run; RECONCILE is
proved only in its null form and stays provisional until an upstream change reaches an
Adapter's Target or a test.

**That the mechanised DIGEST sees what a parser would.** `tooling/adapter/lib/digest.mjs`
(step 9) is lexical: TypeScript 7 ships no compiler API and no other parser is installed. It
reads exported names, `data-slot` values, cva `variants` blocks, `"a" | "b"` unions, `data-*`
and `aria-*` selectors, import specifiers and raw design values from the text. It cannot see
a class built at runtime or a prop reached through a spread, and a change it does not model
is a change it does not report. It is proved on four adaptees against the vendored tree and
on five mutations, not on an upstream change that has actually arrived.

**That the axis vocabulary survives sixty components.** Thirteen are written. Hence the
no-speculative-axis rule and the lifting rule in Decision 4.

**That the old enforcement estate is a prerequisite.** Every architecture guard, the verify
gate and all three authorship hooks were deleted on 2026-09-03. That gap is real and is not
this ADR's to close. This work carries only the enforcement that governs itself: the
exports null-block and the `package-exports` test (ADR-033), the design-classes test, and
the per-component tests PROVE writes.

**That the adaptation protocol works beyond the four cases that exercise it.** TRANSLATE
(Figma), the Integration Adapter class and the registry future are in the text and not in
the beta slice. They stay provisional until each has a real consumer; freezing them on the
strength of Card, Switch, Combobox and one block would be the speculative-axis error one
level up.

**That 30px is the right display step.** The generator proves `display` is distinguishable
from `title`, clears its floor and lands on the grid. The size, the semibold weight and the
tight leading are the owner's choice: no row in the evidence table concerns a type scale,
and `display` cites no reference the way `emphasis` cites Apple and Material 3.

**That a coloured delta means anything to a reader.** The trend inks are proved for WCAG
contrast on card, page and their own tint. Nothing proves green against red is perceptually
distinguishable, which is why rule 7's signed delta is load-bearing — and that rule is
enforced only by the composition test over its own sample. `Text` itself accepts
`tone="success"` beside no sign; its Target does not constrain the misuse.

**That `display` and the trend tones have a screen.** Their one consumer is a composition
defined inside a test file (step 5: no screen has asked for it). Decision 4 admits an axis
because a real component needs it; these two were admitted at the owner's request for a
fixture, and the first screen that sets a figure is the test of whether the words were right.

**That a contract attribute cannot reach the DOM from a caller.** Omitting `role` from
`AlertProps` (step 8) refuses a `role` written at a call site, and a `@ts-expect-error` case
holds that. A SPREAD of a wider object still compiles — excess-property checks do not reach a
JSX spread; tried, and tsc reported nothing — so a forwarding Adapter narrows its own props by
hand, and nothing mechanical catches the one that forgets.

## Decision

**Recipe + wrapper, no compiler, no fourth policy tree.** More precisely, because the
four parts are decided differently:

    component policy kind       →  LEFT RESERVED, unfilled          (trigger in 2)
    component token tier        →  USE, only when justified
    native / Base UI behaviour  →  ADAPT, through a GoF Adapter per component  (3, §Beta)
    React implementation        →  HAND-WRITTEN; recipe and semantic contract co-located
                                   only when the component owns decisions that need them

### Architecturally decided

1. **React is hand-written, and a component's design decisions live beside it, in data it
   reads — when it owns any.** A RECIPE (cva where an axis is class-only, as in `text.tsx`
   and `stack.tsx`; a `const` table where an axis carries more, as Alert's tone carries an
   icon and a role) only when Xforge owns style or configuration axes. A CONTRACT — a small
   exported table of what each value of an axis means to assistive technology — only when
   Xforge owns a non-trivial semantic or accessibility decision. Where they exist, the
   component cannot render a value the tables lack, and nothing generates it. Text and
   Stack carry cva recipes; Alert earns a contract because announcement varies by tone;
   Heading's semantics are inherent in rendering `h1..h3` and need no table; Card owns no
   axis and carries neither. Button owns one axis, `variant` (`primary | outline`, the two
   words two screens use), as a mapping table onto the adaptee's vocabulary — the classes
   stay upstream's. Mandating thirteen recipes and thirteen contracts would recreate the
   rejected policy tree at finer grain.

   **Amended by Decision 12: a recipe owns style SELECTION, not style DEFINITION.** A
   component owns the axis vocabulary — `intent`, `size`, `tone`, `variant` — and owns
   which approved role each value of that axis selects. It does not own what the role
   means: `primary` being teal-700 on white at `radius.control` is the Style Contract's
   answer, not Button's. **`button.tsx` is the one file this amendment changes rather than
   confirms**, and it changes on a condition it wrote itself: its header says *"THE RECIPE
   IS UPSTREAM'S. The classes live in the vendored file and are its business **until a
   token policy says otherwise**."* ADR-034 is that policy. Button's `variant` stays; what
   ends is upstream deciding what `variant` looks like. **Changed in ADR-034 step 8:** the
   Adapter sits on Base UI's Button directly and owns the recipe as STYLE symbols; the
   vendored `button.tsx` is imported by no Adapter.

2. **The fourth policy tree is not built.** `POLICY_KINDS` keeps `component` reserved and
   `index.mjs` composes three. `policy/components/`, `axes.mjs`, a slot grammar and an
   adapter registry are REJECTED at this size: one screen, 503 authored lines under 13,962
   of policy. A tree whose only reader is the test that reads it is a second source for a
   fact the component already states. Revisit trigger: a consumer of a component's axes
   that is neither the component nor its test — generated documentation, a design-tool
   sync, a metadata runtime — that cannot reasonably derive them from the authored
   TypeScript.

3. **The authored wrapper IS the Adapter, in the Gang-of-Four sense, and it stays pure.**
   Adaptee: a vendored primitive in `components/ui`, a Base UI part, or a native element.
   Target: `@xforge/design/components/<name>`, with six invariants — semantic API, stable
   exposed anatomy (public props, observable states, semantic slots, composition API; not
   the exact DOM tree, which the ownership table leaves to the adaptee where acceptable),
   token ownership, state vocabulary, accessibility contract, dependency isolation. The
   Adapter translates props and applies a recipe and a contract. No adapter layer, no
   registry, no factory, no policy runtime, no DSL interpreter, until duplication proves
   one is needed. How an Adapter comes to exist and is maintained is §Beta.

   **The No-Leakage Law**, scoped to the public Target: no adaptee vocabulary or
   adaptee-derived type defines the exported Xforge Target contract unless adoption is
   explicit. Internal implementation types may reference the adaptee. Forbidden as an
   export: `export type ButtonProps = ComponentProps<typeof Primitive>`, or
   `export type ButtonProps = VariantProps<typeof shadcnButtonVariants>`. Allowed inside
   the adapter: `type PrimitiveProps = ComponentProps<typeof Primitive>`, to assist
   translation. Required export shape: an Xforge-owned interface over the HTML attributes
   plus Xforge axes.

   **The No-Style-Leakage Law** (added by Decision 12), its twin, and scoped the same way:
   no foreign or undeclared design-bearing CSS crosses the Adapter boundary. A Target
   renders only classes the Xforge Style Contract emits. Together the two laws close the
   boundary in both directions — one protects the API vocabulary, the other the visual
   vocabulary — and the second was missing because until ADR-034 there was no closed visual
   vocabulary for it to protect.

   **Ownership**, so the Adapter does not become another implementation of Base UI:

   ```
     keyboard mechanics      Base UI / adaptee          public prop vocabulary   Xforge
     focus management        Base UI / adaptee          variant semantics        Xforge
     DOM mechanics           adaptee where acceptable   design tokens            Xforge policy
     source implementation   vendor / upstream          accessibility meaning    Xforge contract
     business composition    application / module       styling recipe           Xforge recipe
   ```

4. **No speculative axis.** An axis enters a recipe because a real component needs it; a
   union is lifted to a shared module only when a second component needs the same one (law
   31). Once shared, its meaning may not vary by component.

5. **State is never a variant.** `checked`, `open`, `selected`, `disabled`, `invalid` are
   behaviour, exposed as `data-*` by the adaptee. **Amended by Decision 12:** a state may
   select a DECLARED state role — `data-disabled` selects the disabled role of the role
   contract it belongs to — and may not introduce styling of its own.
   `data-disabled:opacity-37` is not a state style; it is an undeclared design value
   wearing a state selector.

6. **Component tokens start at zero.** The fifteen authored components use none. The
   first is minted only with a written justification — *semantic role X cannot express this
   because …; this component must evolve independently because …* — which is what makes the
   existing ceiling useful rather than decorative.

7. **shadcn is distribution and anatomy reference; the vendored tree is never edited and
   never exported.** This inverts shadcn's own stance — "simply edit the button code
   directly" — and the reason is local and observed: a hand-fix is reverted by the next
   `shadcn add --overwrite` without a report (`empty.tsx`, `tracking-tight`). A decision
   that differs from upstream is made in the Adapter above the file, never in the file.
   No AST rewriting of upstream files — **and no formatting of them either.** The tree
   holds the registry's bytes verbatim, double quotes and all, because the first
   maintenance run (Migration step 6) found every one of 59 files "changed" when nothing
   upstream had moved: the repository's fix hook had restyled the morning's copies before
   the Biome exclusion took effect, and a PREVIEW that compares restyled bytes against
   fetched bytes is noise. Verbatim is what makes `cmp` a PREVIEW.

8. **Application code imports `@xforge/design/components/<name>` only.** The transitional
   clause of the first draft is closed by ADR-033: `./components/ui/*` is `null` in the
   manifest, the resolver refuses it with `TS2307`, and `tests/unit/package-exports.test.ts`
   asserts every file under the vendored tree is unreachable.

12. **Components select style; they do not define style.** *(Added 2026-09-03. The single
    normative home for this amendment; every other section that mentions it points here.)*

    > Xforge is a closed design language. A component may choose among style roles already
    > declared by design policy and emitted by the Style Contract, but neither a component
    > nor its Adapter may introduce a design-bearing value, class, pairing, CSS capability
    > or foreign style. A recipe is a mapping from component axes to generated Style
    > Contract symbols. Public Targets do not expose unrestricted `className` or `style`.
    > Missing vocabulary stops NORMALIZE and returns to the kernel; it is never invented
    > during ADAPT.

    **Kernel → component → consumer**, and this is the part that is promoted from history
    rather than invented. Migration step 7 discovered it and stated it: *"a word the
    component can say before the kernel projects it is a class that compiles to nothing."*
    It was a sequencing note about one commit. It is now the rule: a component may not name
    a design role before the kernel declares and projects it.

    **What this amendment closes, measured on 2026-09-03 across the 15 authored components:**

    ```
      Targets accepting className and style BY INHERITANCE     13 of 15
        ...from `extends ComponentProps<'div'|'button'|'p'>` or an alias of one
      Targets that already list every adopted word              2 of 15   Switch, Combobox
      recipes containing a literal design class                 0 of 15
      authored uses of a SCALE_ALIASES word                     0
      adapters whose classes are upstream's by declaration      1         Button
    ```

    Two things follow from that table, and they pull in opposite directions:

    - **The recipes are already compliant.** `text.tsx` selects `text-error-foreground`,
      `font-heading text-display`, `text-body-compact` — every value a role, no literal
      design class anywhere in the authored layer. So this amendment closes a CAPABILITY,
      not a violation. `bg-primary rounded-md px-4 text-sm` is merely *sayable* today.
    - **The Targets are not.** Thirteen of fifteen accept `className` and `style` without
      ever naming them — they arrive by inheriting an HTML props type, so
      `<Button className="bg-red-500 rounded-[13px] px-[17px]" />` type-checks and bypasses
      the entire language. That is a real hole and it is the largest one this amendment
      closes.

    **The precedent is local, and it is two files old.** `switch.tsx`'s Target says *"Each
    adopted word is listed; nothing arrives by inheritance"* and Picks four attributes;
    `combobox.tsx` declares a closed interface. Both were written that way during the beta,
    for this reason, before there was a law requiring it. This decision generalises what
    those two already do rather than importing a rule from outside.

    **`className` and `style` become private by default.** Not narrowed — removed:
    `Omit<ComponentProps<'button'>, 'className' | 'style'>`, or the Switch/Combobox shape of
    listing what is adopted. A typed `className?: StyleClass` over a generated union of
    approved classes is the obvious escape valve and is **not built now**: Decision 4's
    no-speculative-axis rule applies to escape hatches too, and the first composition that
    genuinely needs one is the evidence that it should exist.

    **Structural classes are in the language too.** `flex`, `grid`, `absolute`,
    `overflow-hidden`, `pointer-events-none`, `sr-only` reference no token, and that is the
    reason they get overlooked rather than a reason they are exempt. The Style Contract
    declares two domains — DESIGN-BEARING (colour, spacing, sizing, radius, typography,
    elevation, motion, layering) and STRUCTURAL (display, position, overflow, alignment,
    visibility, pointer behaviour, accessibility helpers) — and both are declared. What
    differs is only that a structural capability need not resolve to a token. *"It is only
    `absolute`"* is not an exemption.

    **What this does NOT change.** React stays hand-written (Decision 9 unaffected — a style
    contract generator is not a React generator). `policy/components/` stays rejected
    (Decision 2 unaffected — the Adapter file schema IS the component schema, in normative
    TypeScript, and a second per-component JSON copy of it is the tree that was refused).
    cva stays as the implementation tool; what changes is what its variant values contain.

    **Dependency direction, stated because it is the whole point:** ADR-034's style plane is
    UPSTREAM of this ADR. `policy → generator → style.ts → recipe → Adapter → React`. Never
    the reverse, and never a component minting a value the kernel has not declared.

### Rejected

9. **Generating React from a declarative spec: REJECTED.** No production design system
   reviewed does it. The two compilers that exist compile from component source, for
   multi-framework parity this repository does not need. Every recipe-as-data system
   hand-writes the component. Locally: 28 : 1, four dead surfaces, and ADR-024's recorded
   history of governance code generating its own defects. **Exactly two revisit triggers:**
   a second framework target requires equivalent component output; or a genuine machine
   consumer requires semantic component metadata it cannot reliably derive from the
   authored TypeScript. A defect repeated across components justifies a shared helper, a
   lint rule or a test helper — never a generator.

### Provisional

10. **`SCALE_ALIASES` is provisional.** The generator maps `--text-sm`, `--radius-md`,
    `--shadow-md`, `--tracking-widest` and `--leading-relaxed` onto roles so vendored
    components compile. `design-system-classes.test.ts` counts two of those as violations
    whether or not they resolve; the older, stricter check is right, because compiling was
    never the standard. With the vendored tree now excluded from that test (ADR-033), the
    alias table's only remaining consumers are the vendored files. Delete when three hold:
    authored components contain zero references; application code contains zero; the
    omission scan and the static-hole test agree on zero.

    **Amended by Decision 12 — vendor-compatibility shims only, and two of the three
    conditions are now measured.** On 2026-09-03 the authored components contain **zero**
    references to `text-sm`, `text-xs`, `text-base`, `rounded-md`, `shadow-md`,
    `tracking-widest` and `leading-relaxed`, and `apps/web/app` contains **zero**. Only the
    third condition is unverified. So the table is no longer "provisional" in the sense of
    undecided: it is a shim for the sealed vendored tree, forbidden in authored components
    by Decision 12, and forbidden from appearing in any generated Xforge style symbol. It
    is deleted when the vendored tree stops needing it, which is ADR-034's Migration step 8.

11. **The tone→announcement rule has one owner: the table exported beside Alert.** The
    e2e specs assert the DOM; Verification 1 asserts the DOM agrees with the table. Today
    they disagree — named here, not fixed here. And the decision inside it is asked, not
    assumed: is Xforge saying that `tone="danger"` and `tone="warning"` ALWAYS mean an
    urgent announcement? MDN reserves `alert` for situations "where the user's immediate
    attention is required" and says to use it sparingly. Visual tone and announcement
    urgency are not the same axis: a static danger advisory and a dynamic failed write
    differ. Decision 4 says do not add an urgency axis now. Decision 11 says do not
    enshrine `danger === assertive` as a system truth either: the table records the owner's
    answer for today's one screen, revisable when a screen produces the counter-case.

## §Beta — the Xforge Component Adaptation Protocol

*Implemented by a GoF Adapter at the component boundary.* Provisional: its core freezes on
the exit questions below; the rest stays provisional until each part has a consumer.

> **Xforge does not fork upstream UI; it absorbs it through a semantic boundary. External
> implementations may change. Xforge vocabulary must not.**

Two ideas, kept apart so that neither grows into the other. **The Adapter is runtime
architecture** — Decision 3, small, and it stays that way. **The Protocol is method** — how
an Adapter comes to exist and is maintained — and it is where the richness lives. It is
executed by a person or an agent per component, and automated only where existing tools
already do the work: `shadcn add` for primitives, the `/cui`, `/iui`, `/rui` commands for
studio blocks, the existing tests for proof.

```
                         FOREIGN SOURCES
             native · Base UI · shadcn/ui · shadcn-studio · Figma
                                │
                                ▼
                            ACQUIRE
                                │
                                ▼
                             DIGEST
          anatomy · behaviour · state · axes · style · a11y · dependencies
                                │
                                ▼
                           NORMALIZE
                        Xforge semantics
                                │
                                ▼
                        TARGET CONTRACT
                     ┌──────────┴──────────┐
                     │                     │
               GoF ADAPTER           data, when earned
               hand-written          ┌─────────────┐
                     │               │ RECIPE      │
                     │               │ CONTRACT    │
                     │               └─────────────┘
                     ▼
                  ADAPTEE
                     │
                     ▼
                   PROVE
        @xforge/design/components/<name>
```

### Creation — five stages, each with a "no" available

```
  1 ACQUIRE    What are we borrowing, and why. Sources: native, Base UI, shadcn/ui, a
               shadcn-studio component / block / page, another registry, Figma. Record
               only: source, item, version or SHA when meaningful, intent (below). A
               third-party registry item is reviewed the way shadcn documents before it
               writes anything: files, target, dependencies, registryDependencies,
               envVars, pinned refs; `shadcn view`, `add --dry-run`, `--diff`.
  2 DIGEST     Inventory the adaptee on seven dimensions. ANATOMY: slots, parts, DOM.
               BEHAVIOUR: interaction model, keyboard, focus, controlled/uncontrolled.
               STATE: data-state, data-disabled. AXES: variants, sizes, orientations,
               densities. STYLE: raw colours, spacing, radius, typography, motion — the
               design-classes test already reports these. ACCESSIBILITY: roles, aria-*,
               labels, live regions. DEPENDENCIES: npm, registry, provider and context
               assumptions — the TooltipProvider requirement shadcn-studio documents is
               the shape a props-and-classes inventory misses. Output: a list, not a
               document.
  3 NORMALIZE  The heart of the protocol. Decide what each upstream concept MEANS in
               Xforge before any React is written. `variant="destructive"` → an intent
               role; `text-red-500` → a semantic colour role; `rounded-md` → a radius
               role; an upstream `aria-live` → the contract's answer. Upstream vocabulary
               → Xforge vocabulary, tokens, accessibility meaning. This is the
               Anti-Corruption Layer: the Target is designed in Xforge's terms, so the
               foreign model does not constrain it. Because NORMALIZE fixes the Target
               before ADAPT exists, calling stage 4 a GoF Adapter is a description, not
               a metaphor.
               AMENDED BY DECISION 12: if the Style Contract has no role that expresses
               the normalized decision, NORMALIZE STOPS. ADAPT may not invent one. The
               gap returns to the kernel, the kernel declares and projects it, and only
               then does ADAPT resume — the order Migration step 7 discovered and
               Decision 12 makes normative.
  4 ADAPT      Only now write the React: Xforge props → recipe + contract + mapping →
               adaptee. Boring by design. No compiler, no registry lookup, no policy
               runtime, no DSL, no `createXforgeAdapter()`.
  5 PROVE      Verification lives inside the protocol, not after it. Every Adapter
               answers: does it render; does behaviour survive the wrapper; does Xforge
               vocabulary stay intact; does accessibility agree with its contract; do raw
               upstream design values leak; does the public API leak upstream
               implementation. One test for a simple component, several for a complex one.
```

### Maintenance — a separate loop, and foreign code is inspected before it may mutate the tree

```
  PREVIEW    `pnpm adapter preview <item>` (step 9): fetch the registry item, digest it,
             diff against the adaptee record per dimension, name the Adapters above it;
             exit 1 if anything moved. `shadcn diff` in the scratch project remains the
             CLI's own answer. Step 6 learned: `cmp` against a restyled tree is noise
     ▼
  ASSESS     the per-dimension diff PREVIEW printed, read against the Adapters it named;
             provider and context changes first
     ▼
  REFRESH    shadcn add <name> --overwrite into the vendored tree; nothing merged back
     ▼
  RECONCILE  only the authored Adapter changes, and only if it must  (REFINE enters here)
     ▼
  PROVE      the Adapter's own tests decide
```

Overwriteability is a feature. The vendored tree is pristine on purpose, so an upstream
change is absorbed by re-running the Adapter's tests, never by hand-merging Xforge
styling into upstream files. ACQUIRE and REFRESH obey one rule: inspect before it lands.

### Intents, separated by lifecycle

Three CREATION intents start from foreign source or evidence. One MAINTENANCE intent
starts from an existing Xforge Target and is never "acquired".

```
  creation
  ADOPT      the source is structurally suitable; keep behaviour and anatomy, adapt
             semantics and style                   native · Base UI · shadcn primitive
             AMENDED BY DECISION 12: behaviour, focus and keyboard cross the boundary;
             design-bearing upstream classes do NOT, unless the Style Contract has
             deliberately declared an identical role
  INSPIRE    the source is valuable visually or compositionally but must not become an
             implementation dependency; digest the idea, rebuild from Xforge components;
             no source API becomes public           studio blocks and pages
  TRANSLATE  Figma or another design spec: anatomy + spacing + roles → Xforge semantics
             → existing components; Figma is input, never source authority

  maintenance
  REFINE     the Target exists; change above the adaptee, never in components/ui;
             enters the maintenance loop at RECONCILE
```

Source × intent: native, Base UI, shadcn primitive → ADOPT; studio component → ADOPT or
INSPIRE; studio block or page → INSPIRE; Figma → TRANSLATE. Command mapping: `/cui` →
ADOPT or INSPIRE; `/iui` → INSPIRE; `/ftc` → TRANSLATE; `/rui` → REFINE. (The three
commands in `.claude/commands/` still tell an agent to register a contract in a file that
does not exist; repointing them to NORMALIZE → ADAPT → PROVE is a listed follow-up.)

### Adapter classes — terminology, not code

No class hierarchy, no registry, no base class.

- **Primitive Adapter**: one primitive becomes one Xforge component. Button, Switch,
  Input, Dialog.
- **Compound Adapter**: several primitives become one stable Xforge concept. Combobox
  from Popover + Command + Input + Button.
- **Integration Adapter**: an external specialist library isolated behind an Xforge API —
  TanStack Table, react-day-picker, a chart library. The Anti-Corruption case proper. It
  belongs in `packages/design` **only when the abstraction is a reusable
  presentation-system concept**: a data-grid adapter owns the visual grid API, density,
  state presentation, selection affordances, tokens and accessibility; the HR employee
  table that uses it owns column meaning, the query, permissions, mutations and actions,
  and lives in its module.

**A block is not a fourth class.** A studio block becomes a composition of Xforge
components. Adapter versus Composition is a hard boundary: Button, Card, Combobox,
DataGrid are adapters; EmployeeHeader, PayrunToolbar are compositions that consume them,
and never enter `packages/design` merely because they came from a studio.

### Adapter file schema — normative

Every authored component follows this shape, in this order, and an agent writing one does
not improvise around it. Sections 1 and 2 appear only when earned (Decision 1); sections
0, 3 and 4 always. The public name is fixed by the file name: `<name>.tsx` →
`@xforge/design/components/<name>`.

```tsx
/**                                                        0 PROVENANCE — required
 * <Name> — <what it is for, one line>.
 *
 * Adaptee   <native element | Base UI <Part> | shadcn <item>@<version|sha> | studio <block-id>>
 * Intent    ADOPT | INSPIRE | TRANSLATE
 * Owns      <the axes Xforge decides: intent, size, tone, …>   or   none
 * Contract  <the a11y decision this file owns>                  or   inherited from adaptee
 *
 * <Why this component exists in the authored layer, in one paragraph. What NORMALIZE
 *  decided: which upstream words became which Xforge words, and what was NOT adopted.>
 */
'use client'                                              // only if the adaptee needs it

import { X as Primitive } from '#components/ui/x'          // the adaptee, private import
import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '#lib/cn'

                                                           // 1 RECIPE — when Owns ≠ none
export const xRecipe = cva('<base classes, roles only>', {
  defaultVariants: { intent: 'primary', size: 'md' },
  variants: {
    intent: { primary: '…', secondary: '…', danger: '…' }, // every value a token role
    size:   { sm: '…', md: '…', lg: '…' },
  },
})

                                                           // 2 CONTRACT — when Contract ≠ inherited
export const X_CONTRACT = {
  //  keyed by the axis that decides the semantics; one row per value; exported for tests
  danger:  { role: 'alert'  },
  info:    { role: 'status' },
} as const satisfies Record<string, { role: 'alert' | 'status' }>

                                                           // 3 TARGET — always, Xforge-owned
export interface XProps
  extends Omit<ComponentProps<'button'>, 'color'> {        // HTML attrs, never ComponentProps<typeof Primitive>
  intent?: keyof typeof xRecipe.variants.intent            // Xforge vocabulary only
  size?: 'sm' | 'md' | 'lg'
}
//   internal, unexported, allowed:  type PrimitiveProps = ComponentProps<typeof Primitive>

                                                           // 4 ADAPTER — always, translation only
export function X({ intent = 'primary', size = 'md', className, ...props }: XProps) {
  return (
    <Primitive
      className={cn(xRecipe({ intent, size }), className)}
      data-intent={intent}                                  // state and axes as data-*
      data-slot="x"
      {...props}
    />
  )
}
```

**Amended by Decision 12.** Section 1 is renamed **STYLE SELECTION** and its values become
generated symbols rather than authored class strings — the recipe does not cook the
ingredients, it selects approved meals:

```tsx
import { STYLE } from '#generated/style'                   // 1 STYLE SELECTION

export const buttonRecipe = cva([STYLE.shape.control, STYLE.typography.label,
                                 STYLE.motion.press], {
  variants: {
    intent: {
      primary: [STYLE.action.primary.background, STYLE.action.primary.foreground],
      danger:  [STYLE.action.danger.background,  STYLE.action.danger.foreground],
    },
  },
})
```

cva is unchanged as the mechanism; the strings it receives are generated. Section 3 lists
every adopted word — the `switch.tsx` / `combobox.tsx` shape — or `Omit`s `'className' |
'style'`; it never inherits them silently from an HTML props type.

Rules the schema encodes, each with the check that sees it:

```
  no `export * from '#components/ui/…'`                    Verification 5 (lexical)
  no exported type built on `typeof <ui import>`           Verification 5 (lexical)
  a file imports `#components/ui/<x>` only if it IS x's    Verification 5 (lexical) — an
    adapter, or x has no adapter yet                         authored file consumes ADAPTERS
  PROVENANCE names Adaptee / Intent / Owns / Contract      Verification 5 asserts the labels;
                                                            review reads the paragraph
  every class in RECIPE names a token role                 design-system-classes.test.ts
  every CONTRACT row renders what it declares              <name>.test.tsx (Verification 1 shape)
  the adaptee is unreachable from outside the package      package-exports.test.ts (ADR-033)
  --- added by Decision 12 ---
  no public `className`, no public `style`                 adapter-schema.test.ts, WRITTEN
                                                            (ADR-034 step 7: intrinsic props
                                                            come through NativeProps;
                                                            ComponentProps<'…'> refused;
                                                            className only as the attribute
                                                            an Adapter sets on its adaptee)
  STYLE SELECTION holds symbols, not literal classes       design-system-classes.test.ts, WRITTEN
                                                            (step 7: no design-bearing literal
                                                            in authored source; 46 red before)
  every STYLE symbol resolves to an emitted class          design-system-classes.test.ts, WRITTEN
                                                            (ADR-034 step 6: every manifest
                                                            class compiles, variants included)
  no foreign class survives the adaptee undeclared         NOT WRITTEN — see below
```

**Three of the four are enforced since ADR-034 steps 6 and 7; the fourth stays OWED, and
saying so is the point.** ADR-024's rule is that a guard whose name overclaims is worse than
none. "No foreign class survives the adaptee undeclared" asks what the VENDORED file renders,
which no lexical read of the Adapter can see; today's answer is ADR-034 Decision 3's shim
table, which names every channel the reachable vendored tree still paints through and goes
red when a use appears that no shim covers. That is a declaration of the leak, not its
absence. The lexical class reader that compiled every literal was replaced in the same
commit that introduced `STYLE.*` (step 7), as this paragraph required.

Test file schema, `packages/design/tests/<name>.test.tsx`, JSX-free (`createElement` +
`renderToStaticMarkup`, node environment, no new dependency):

```
  for each CONTRACT row      the rendered element carries role=<row.role>; alert-role rows
                             carry no aria-live
  for each RECIPE axis       every declared value renders (no throw) and sets data-<axis>
  one mutation is recorded   the header of the test names the mutation that was watched
                             go RED before the component was written
```

A Tier-3 component splits 1 and 2 into `<name>.recipe.ts` and `<name>.contract.ts` under
`<name>/` with an `index.ts`; the sections and their order do not change.

### Complexity-earned decomposition

No universal folder template. Tier 1: `button.tsx`. Tier 2: `alert.tsx` + `alert.test.tsx`.
Tier 3: `combobox/` with `combobox.tsx`, `combobox.recipe.ts`, `combobox.contract.ts`,
`combobox.test.tsx`, `index.ts`. The public name is `@xforge/design/components/<name>` in
every tier (ADR-033: the logical specifier is fixed, the physical target is not). No
global `adapter.types.ts`, `adapter.registry.ts`, manifest or DSL.

### Reserved, not now

An Xforge shadcn-compatible registry (`shadcn add @xforge/button`) through the existing
shadcn registry protocol, which already carries files, dependencies, registryDependencies,
cssVars, meta and target aliases resolved from `components.json`. That is a DISTRIBUTION
need and a `registry.json` meets it. It is not a trigger for `policy/components/`; the
triggers for a component policy tree are in Decision 2 and Decision 9, and distribution
is not among them.

### Beta exit — four questions, on four adapters

Card (Primitive), Switch (Primitive with behaviour), Combobox (Compound), and one
shadcn-studio block (INSPIRE composition). No generated twin; the control case is the
decision.

- **A.** Can ACQUIRE → DIGEST → NORMALIZE → ADAPT → PROVE handle all four without
  special-case architecture?
- **B.** Can an upstream overwrite land without editing a vendored file?
- **C.** Does any adaptee vocabulary leak through a public Target?
- **D.** Does the studio block reduce to existing Xforge primitives and compositions
  without an adapter subsystem?

Four yeses freeze the **creation core**: the five stages, the No-Leakage Law,
Adapter-versus-Composition, the Primitive and Compound classes, ADOPT and INSPIRE. What
else is frozen and what stays provisional is stated ONCE, in the Status line, and moved
there by the Migration record: TRANSLATE, the Integration Adapter class and the registry
future wait for a Figma source translated, a specialist library isolated, a registry
consumer; the maintenance loop's own status is whatever its last run (step 6) earned. Any
no is the finding, recorded here.

## Alternatives considered

**Hand-authored wrappers over Base UI, recipe as data, no code generation.** This was the
first draft's control case. It is now the decision.

**Generate the React from a component policy (the first draft's Decision 9, conditional).**
REJECTED — see Decision 9. The qualification slice it required (Card, Switch, Combobox
generated and compared against a hand-written twin, mutation fixtures A–F) is not run; its
fixtures were for machinery that is not built, and go with it.

**Shape B: `policy/components/*.mjs` as a machine-readable authority (slots, axes, tokens
needed) with React hand-written against it and conformance tests reading it. No compiler.**
REJECTED until Decision 2's trigger fires. It is Shape A plus a fourth tree whose only
reader would be its own test; the recipe and contract beside the component are already its
data, co-located.

**Hand-upgrade the vendored components.** Rejected. Leaves the component as the authority,
and `shadcn add --overwrite` reverts every fix without reporting it — observed, not
predicted.

**Keep vendored files and add a lint rule.** Rejected as the whole answer, though it is the
cheapest thing that helps and part of it exists (the design-classes test). It catches raw
values; it cannot make a component declare what it means.

**AST-transform shadcn output.** Rejected: one upstream change breaks the transformer, and
the failure is silent.

**Do nothing until the deleted gate is rebuilt.** Rejected. Restoring the whole governance
estate before touching Alert would be rebuilding infrastructure because it once existed,
which is the same error as building it before it is needed.

**Adopt Carbon's or M3's component model wholesale.** Rejected. They are benchmarks. This
repository already has a token architecture with properties neither describes — density
as a mode axis, contrast measured per role pair.

## Consequences

**Positive.** One owner per design decision, beside the component, readable without a
kernel. Upstream is consumed continuously — shadcn, Base UI, shadcn-studio, Figma, future
registries and specialist libraries — while the application sees only
`@xforge/design/components/*` and Xforge, not the vendor, decides what those components
mean. `shadcn add --overwrite` is a refresh, not a merge.

**Negative, accepted knowingly.** No machine-readable component inventory: the registry
deleted in `ae4e294` stays deleted (ADR-032), and anything that later needs one is
Decision 2's trigger. Recipe and contract are optional, so their presence is a judgement
per component rather than a rule a check can enforce; the judgement is written into the
component's header when it is made.

**What this costs today.** An Adapter per component: fifteen, every one carrying the
provenance header. A recipe or a contract only where the component owns the decision:
Alert owns a contract (`ALERT_TONE`); Text and Stack carry cva recipes; Button carries a
two-row mapping table; Switch and Combobox own no axis; nothing else does. Seven component
tests (`alert`, `button`, `card`, `switch`, `combobox`, `text`, `status`), two browser tests (`switch`,
`combobox`) with one setup file, one composition test in the app, one schema check for the
layer, and in `vitest.config.ts` one JSX-runtime line and one `browser` project over a
provider added through the catalog.

**What this does NOT change.** Laws 6 and 16 (what the UI and a module may import by
content), ADR-033 (how anything is imported), the token kernel and its generator (law 27).

## Migration / rollback

In this order, each its own commit, rollback `git revert`:

1. **Alert** — DONE 2026-09-03. Owner's decision: `danger` and `warning` are `alert`,
   `info` and `success` are `status` (Decision 11). `ALERT_TONE` exported with a `role`
   column; the component reads it, and `role` is not a prop of the Target — the table's
   answer cannot be overridden at a call site (step 8); the header rewritten with provenance and without the
   deleted registry's `revision`. Verification 1 observed RED on `danger` and `warning`
   (table said `alert`, DOM said `status`), then green. The five e2e assertions are
   untouched and now agree with the table.
2. **Button and Card** — DONE 2026-09-03. `export *` replaced with Xforge-owned props and
   deliberate translation; Button owns `variant: primary | outline` mapped onto upstream's
   `default | outline`; Card is the root only. Verification 5 observed RED on both first.
   `emergency-contacts.tsx` wrote upstream's `variant="default"` and is now silent (primary
   is the default); `resource-boundary.tsx` reached the adaptee directly and now consumes
   the authored Button. Card no longer leaks (exit question C).
3. **Provenance headers** — DONE 2026-09-03 on all thirteen authored files, per the
   owner's decision to apply the schema retroactively.
4. **Dead surfaces — DONE 2026-09-03**, each resolved as decided rather than as listed:
   - `projection/css.mjs` — DELETED whole, not trimmed. Its emitters had no caller, and
     its one live export, `CSS_MODE_AXES`, restated the `$modes` axes the generator reads
     from `tokens.json`: one fact, two declarations. `PROJECTION_POLICIES` is
     `[tailwindPolicy]`; the CSS projection is governed by the generator and proved by
     `tests/tokens.test.ts` against its output. `vocabulary.mjs`'s `cssReferenceOf`, whose
     only caller was that file, went with it.
   - `assistive-technology.mjs` CLI block — DELETED, with the `node:url` import only it
     used. `sessionFailures` and `ledgerFailures` remain; the first is tested.
     `.architecture/a11y-evidence.json` now says the gated set is not derivable until a
     contract table declares a profile, and that no stage reads the file today.
   - `assertDensityAxis` — WIRED, not deleted: `generators/tokens.mjs` calls it over the
     real `$modes` after its per-override checks. The real token file already satisfied
     it (measured before wiring). `tests/tokens.test.ts` gained two refusals — an
     asymmetric pair, a lone mode — observed RED against the un-wired generator, then
     green; the synthetic source now declares both density modes. Regeneration is
     byte-identical.
   - `contracts.ts` citations in `policy/index.mjs`, `interaction/index.mjs`,
     `keyboard.mjs`, `projection/index.mjs` — rewritten to the truth: the registry was
     deleted in ae4e294; the subject of the interaction tree is the authored components
     and their exported tables; `PROFILE_KEYBOARD` is the profile list.
   - `POLICY.md` and `policy/contracts.ts` in `.claude/commands/{cui,iui,rui}.md` — each
     command now names its protocol intent (ADOPT/INSPIRE, INSPIRE, REFINE), points at the
     Adapter file schema and `adapter-schema.test.ts`, and lists the real authorship loop
     (`pnpm verify:fast` does not exist on this branch). `project-state.md:86` and
     ADR-030:41 mark `POLICY.md` as deleted.
   - `09-xforge.md` — repointed: `policy/tokens.json`; the authored components as the UI
     vocabulary; the three deleted guards replaced by the two tests and the manifest
     null-block that hold the boundary now; no gate, so the authorship loop is named.
   - ADR-029:45 — annotated as no longer true, superseded by ADR-031 Decision 1.
5. **The beta slice — DONE 2026-09-03.** Four cases through ACQUIRE → DIGEST → NORMALIZE →
   ADAPT → PROVE, and the four exit questions answered.

   - **Card** (Primitive, Tier 1) — step 2 above.
   - **Switch** (Primitive with behaviour) — `src/components/switch.tsx`. NORMALIZE adopted
     Base UI's own words for a switch, one by one (`checked`, `defaultChecked`,
     `onCheckedChange`, `disabled`, `readOnly`, `required`, `name`, `value`) in an
     Xforge-owned interface; did NOT adopt upstream's `size` axis or `className`; narrowed
     `onCheckedChange` to the boolean. PROVE: role, `aria-checked` and Base UI's
     `data-checked`/`data-unchecked`/`data-disabled` reach the DOM, controlled and
     uncontrolled; five cases; mutation (props no longer spread) → four red.
   - **Combobox** (Compound) — `src/components/combobox.tsx`. Six of upstream's sixteen parts
     assembled once behind `options` + `value` (a string id, mapped both ways; an id the
     options lack is refused, step 8) +
     `onValueChange` + `placeholder` + `disabled` + `emptyMessage` + a label. Chips, groups,
     separators, multiple selection and custom filters not adopted. PROVE: one input with
     `role="combobox"`, closed, placeholder and label present, options absent while closed,
     selected id resolves to its label; four cases; mutations: placeholder dropped → red;
     `disabled` dropped from the input → still green, because Base UI propagates the
     root's, so the duplicate was deleted and `disabled` dropped from the root → red.
   - **A studio block** (INSPIRE composition) — `apps/web/tests/metric-row.composition.test.tsx`.
     ACQUIRE: shadcn-studio `statistics-component`, fetched as data. DIGEST: six variants of
     one recipe (a grid of 4–6 cards, a value, a label, a comparison in words; thin
     accessibility). NORMALIZE kept the idea — a number never shown without its baseline —
     and recorded two gaps the system has no word for: a display-size type role, and a
     trend tone on Text. Neither was invented (Decision 4); both were admitted afterwards
     with this composition as their consumer (step 7). ADAPT: none; it is a
     composition of `Card`, `Stack`, `Heading`, `Text`, defined in the test because no
     screen has asked for it, and it moves beside the first screen that does. PROVE: one
     labelled region, a real heading, one tile per metric, every value with its baseline,
     and the composition's own source read back: no `className`, no `#components/ui`, no
     studio import, every Xforge import a public component entry.

   **Exit questions.**
   - **A — one method, no special-case architecture?** YES. Three adapters and a
     composition, no new mechanism; the only infrastructure change in the beta itself was
     one JSX-runtime line in `vitest.config.ts`, needed by the first component test. After
     the review, one more: the `browser` Vitest project and its provider, added to prove
     behaviour (Verification 6) — a test environment, not a component mechanism.
   - **B — an upstream overwrite without editing a vendored file?** YES for the half that
     can be answered: no file under `src/components/ui/` changed during the slice, and the
     one `--overwrite` of the day (commit `bfbdc88`, 59 primitives; toast and questionnaire
     were no longer in the registry and were left in place until step 6 deleted them)
     edited nothing by hand. The RECONCILE half was UNTESTED at this point: that refresh
     predates the Adapters, and no upstream change had arrived since they existed. Step 6
     is the run that followed.
   - **C — any adaptee vocabulary leaking through a public Target?** NONE THAT THE LEXICAL
     CHECK OR A READING FINDS. `adapter-schema.test.ts` is green over fifteen authored
     files; Switch's adopted words are Base UI's by explicit decision, listed one by one,
     not inherited; `BUTTON_VARIANT`'s values (`'default'`, `'outline'`) are upstream's
     words by the same explicit adoption — a distinction the check cannot make and a
     reader did.
   - **D — does the studio block reduce to Xforge primitives and compositions without an
     adapter subsystem?** YES, with two vocabulary gaps recorded and nothing invented
     (closed in step 7, by the owner's request, once the composition existed to consume them).

   Three clean yeses and one half: the **creation core** is frozen — five stages,
   No-Leakage, Adapter-versus-Composition, Primitive and Compound, ADOPT and INSPIRE.
   **The maintenance loop stays provisional** (B's untested half at the time; see step 6
   for the run that followed), and so do TRANSLATE, the Integration Adapter class and the
   registry future — none was exercised. Behaviour survival for Switch and Combobox, owed
   at the time of the review, is proved in Chromium (Verification 6).

6. **The maintenance loop, run once — 2026-09-03.** Against the whole vendored tree, on
   the same day it was refreshed.
   - **PREVIEW.** `shadcn diff` in the scratch project: "No updates found." A fresh
     `add --overwrite` of the 59 into scratch and `cmp` against the tree: **59 of 59
     differ**. The two signals disagreed, so ASSESS had to say which was right.
   - **ASSESS.** Normalised the way the repository's fix hook normalises (`pnpm run fix` is
     `ultracite fix`, Biome underneath; reproduced on the scratch copies as
     `biome check --write --skip=correctness/noUnusedImports`), the fresh bytes match the
     tree **59 of 59**: zero upstream content change. The tree was not the registry's bytes
     — the `pnpm run fix` PostToolUse hook had restyled the morning's copies before the
     Biome `!!` exclusion took effect (today the same command touches nothing under
     `ui/`, measured). Two files in the tree no longer exist in the registry:
     `toast.tsx` (upstream moved to sonner) and `questionnaire.tsx`; nothing imports
     either. Seven-dimension inventory: no anatomy, behaviour, state, axis, style, a11y
     or dependency change anywhere — which means the inventory's power to discriminate is
     as unexercised as RECONCILE's; what this run proved of ASSESS is the adjudication
     between two disagreeing PREVIEW signals, not the seven questions.
   - **REFRESH.** The 59 landed as verbatim registry bytes (Decision 7, amended), and the
     two removed items were deleted. 61 → 59 files under `ui/`.
   - **RECONCILE.** Five authored files sit above refreshed primitives — `button`,
     `card`, `switch`, `combobox`, `resource-boundary` (through Button). No Target, no
     test, no header needed to change. A null reconcile, and recorded as one.
   - **PROVE.** Unit, browser, `adapter-schema`, `package-exports`, `design-system-classes`,
     tsc and Biome, all green on the author's run.

   **What this run proved:** PREVIEW, ASSESS and REFRESH, and that the loop's first signal
   must be the CLI's `diff`, not a byte compare against a restyled tree. **What it did not
   prove:** RECONCILE against an upstream change that reaches an Adapter, because none has
   arrived. That step stays provisional; the rest of the loop is frozen with the creation
   core.

7. **The two vocabulary gaps, closed — 2026-09-03.** Kernel first, component second,
   consumer third, in that order, because a word the component can say before the kernel
   projects it is a class that compiles to nothing.
   - **Kernel.** `size.text-2xl` (1.875rem) joins the primitive scale; `semantic.type.display`
     and `semantic.leading.display` (the tight ratio) join the semantic layer; `display`
     joins `TYPE_ROLES` at rank 5 above `title`, heading weight, 24px floor — 30 × 1.3333 =
     40px, on the grid with no new leading step. `color.success-foreground` and
     `color.error-foreground` now declare `card` and `page` among the contexts they are
     read on, so the generator measures the inks where the trend tone actually puts them
     (on card and page: light 6.79–8.01 : 1, dark 7.13–10.27 : 1; on their own tints, the
     lowest, 5.71 and 6.13 : 1 in light; every declared pair above 4.5). Mutation watched go red:
     `display` bound to `size.text-xl` — the same size as `title` — and the generator refused
     the file on the relational check. Five generated files changed, deliberately (law 27).
   - **Component.** `Text` gains `variant="display"` (`font-heading text-display`) and
     `tone="success" | "danger"` (`text-success-foreground` / `text-error-foreground`) —
     names the kernel projects, nothing decided in the recipe. A trend tone names MEANING,
     not direction; the screen decides which way is good.
   - **Consumer.** MetricRow sets its values in `display`, and each `Metric` may carry a
     `trend` the screen chooses; the delta stays words with a sign, and the composition
     test asserts that a trend ink never appears without a signed delta in front of it
     (constitution rule 7). The sample deliberately colours a falling number `success`.
   - **PROVE.** Verification 7, RED first on the unchanged component — four of ten:
     `display`, `success`, `danger`, and the `display`+`danger` case; the six other cases
     passed — green after the recipe gained the words. `design-system-classes` compiles the
     three classes the recipe gained; `text-display` is the one new bridge projection, the
     two inks were projected already and only their declared pairings changed.

8. **Code-quality pass over the implementation — 2026-09-03**, ten commits `79101f5`…`83aaeed`,
   one finding each, fast loop between them. Reviewed against "crashing is cheaper than
   corrupting" and "make illegal states unrepresentable".
   - **Alert and Status could be told what to announce.** The contract attributes were
     written before the props spread, so `<Alert tone="danger" role="status">` rendered
     `status` — rendered to check, not inferred — and Status accepted `role` and `aria-live`.
     `AlertProps` now omits `role`; `StatusProps` omits `role`, `aria-live`, `aria-busy`. The
     refusal is the type, held by a `@ts-expect-error` case in each test. **What the type
     does NOT do:** a spread of a wider object still compiles, because excess-property checks
     do not reach a JSX spread (tried; tsc reported nothing). ResourceBoundary therefore
     narrows its own props to `Omit<AlertProps, 'tone'>` by hand; any Adapter that forwards
     props into an Alert must do the same.
   - **Combobox refuses an id its options do not contain.** It coerced the id to `null`: the
     input rendered empty, the form carried nothing, the parent's state still held the id.
     Now it throws, naming the id and the option count. `undefined` stays uncontrolled and
     `null` stays controlled-empty; a screen renders the control once its options exist.
   - **`textVariants` and `stackVariants` are no longer exported.** No consumer, and each
     handed a screen a class-string factory.
   - **Switch's size refusal is a compile-time case**, not `'size' in {}`, which was false
     whatever the Target said.
   - **MetricRow's delta is one object** (`{ text, trend? }`), so a trend cannot exist
     without its signed text; rule 7 became a property of the type.
   - **Comments stopped naming things that do not exist**: the deleted `no-bespoke-styling`
     guard and gallery in `cn.ts`, the deleted contract registry in `status.tsx`, a Badge the
     authored layer lacks, and the refresh date copied into four Adaptee lines.
   - **Two defects of the landing, recorded in `83aaeed`:** the commit chain read grep's exit
     status rather than vitest's, so one red case landed under `f299737` and four commits
     over it before it was caught; and the comment commit's script stopped at status.tsx on
     an em dash, so `31ae4a6` changed one file while its message listed five.

9. **Protocol tooling, wave 1 — 2026-09-03**, commit `665a8f6`, `tooling/adapter/`. The Beta
   develops: ACQUIRE, DIGEST and PREVIEW are mechanised; the Adapter stays a hand-written
   function (Decision 3 and Decision 9 untouched).
   - **`pnpm adapter ingest <item>`** fetches the shadcn registry item as JSON — no install,
     so `catalogMode: strict` is not in the way — reproduces the two transforms `shadcn add`
     performs on the text (alias rewrite, icon-placeholder resolution), digests the files on
     the seven DIGEST dimensions, and writes `packages/design/adaptees/<item>.json`: the
     memory a later PREVIEW diffs against. Not a component spec; nothing at runtime reads it.
   - **`pnpm adapter digest <item>`** compares the vendored file to its record.
     **`pnpm adapter preview <item>`** fetches again and reports what moved, per dimension,
     with the Adapters above it; exit 1 if anything did.
   - **Proved** on Switch, Combobox, Button and Card: each record digests to what the
     vendored file digests to, and `tests/unit/adapter-digest.test.ts` holds that, so a
     refresh without a re-ingest goes red. Digest diffs attribute a class change to STYLE
     alone, a dropped slot to ANATOMY, a new union value to AXES, a swapped primitive to
     BEHAVIOUR and DEPENDENCIES. The first Combobox record was wrong — the raw registry text
     imports an `IconPlaceholder`, not lucide — which is how the icon transform was found to
     be needed. Byte identity is reported and not relied on: the CLI also strips `cn-*`
     classes, so Card and Combobox differ in bytes while matching on every dimension.
   - **Not built:** NORMALIZE and SCAFFOLD (a hand-authored `normalize.json` the tool checks
     for coverage of every digested axis and part; a one-shot Adapter skeleton). They are
     the second wave, and each needs a first component to be built against.

10. **Two defects found by the design-sync preview — 2026-09-03**, commits `62f18ae` and
    `aee6612`. Neither check here could have seen them; a person looking at rendered cells did.
    - **Heading levels 2 and 3 were pixel-identical**: both mapped to `text-heading`. The
      kernel proves adjacent type roles differ (`typographyFailures`); nothing proved a
      component's level table used different ones. Level 3 now renders `text-body` at the
      heading weight — 16px/600, apart from h2 by size, from `emphasis` by weight, from body by
      both — with no new role minted at the time; step 11 then minted `subheading` for exactly
      that combination, and level 3 selects it. `heading.test.tsx` (Verification 9) holds
      every level to a distinct role and to its own element; red first on the shared role.
    - **`h-control` governed nothing.** The utility that sets `min-block-size` to the control
      minimum — the WCAG 2.5.8 target floor the density axis rebinds — had no consumer, so
      Tailwind never emitted it and upstream's `h-8` held every button at 32px under a 40px
      floor. The Button Adapter now carries the class; `button.test.tsx` asserts it on both
      variants, red first. Under Decision 12 this is a floor Xforge SELECTS, not a style it
      defines — and once step 11 closed the Target, the merge-with-a-caller's-`className` case
      became a compile-time refusal, since there is no longer a `className` to merge.
    - **Not fixed here:** the same table-versus-kernel gap exists for any other component
      that maps an axis to roles; only Heading has a level table today.

11. **Recipes select STYLE symbols; Targets close — 2026-09-03**, ADR-034 step 7, one kernel
    commit and one component commit. Kernel first: a `subheading` type role (16px at the
    heading weight, body's leading; rank between emphasis and heading) because Heading level
    3 rendered a combination no role named, and `STYLE.family.sans`/`.mono` because Page and
    Code select a face. Then every design-bearing class in the fifteen Adapters became a
    `STYLE` symbol — Alert's tone table selects `status.<tone>` and `stroke.border`, Text's
    tones and variants select ink, surface, status and typography, Heading's levels select
    `typography.title/heading/subheading`, Stack's gaps, Code, EmptyState, List, ListItem,
    Page, Status and Button's control floor likewise — and what a component still writes as
    a literal is structural (`flex`, `items-start`, `shrink-0`, `border-dashed`,
    `tabular-nums`) or a zero reset (`m-0`, `p-0`). The Targets dropped `className` and
    `style` through `NativeProps<'x'>` in `#lib/props`; the app passed neither anywhere.
    Rendered classes are unchanged except Text's `label` variant, which now selects the
    label role's own size token, and Code, which carries body-compact's weight explicitly.
    The two Decision 12 rules and the replaced lexical check are recorded in Verification 5.

## Verification

Replaces the first draft's four conditions and mutation fixtures A–F, which were fixtures
for machinery that is not built and are rejected with it.

1. **`packages/design/tests/alert.test.tsx`** — for every key of `ALERT_TONE`,
   `renderToStaticMarkup(createElement(Alert, { tone }))` carries `role="${row.role}"`;
   alert-role tones carry no `aria-live` (implicit in the role; an explicit duplicate
   double-announces in VoiceOver on iOS per MDN); every row names `alert` or `status`;
   every row binds an icon (colour never alone). **Observed 2026-09-03:** first run red on
   all four for the wrong reason (no JSX runtime under Vitest — fixed in `vitest.config.ts`
   with `esbuild.jsx = 'automatic'`); second run red on `danger` and `warning` only, the
   table saying `alert` and the DOM `status`; third run green after the component read the
   table. 11 cases.
2. **Mutations, performed and undone the same day:** Card without its props spread → both
   Card cases red. Button table without `outline` → tsc `TS2322` at
   `resource-boundary.tsx:72` — but only AFTER that file was repointed from the adaptee to
   the authored Button; the first attempt reached nothing, which is the finding behind
   Verification 5's fifth rule.
3. **The five e2e assertions stay untouched.** They are the DOM half; Verification 1 is
   the table half; agreement between them is the property, and it holds on this tree.
4. **Beta exit questions A–D** — answered 2026-09-03 in Migration step 5: yes, yes, no
   leak, yes. The core of §Beta is frozen on that record.
5. **`packages/design/tests/adapter-schema.test.ts`** — the Adapter file schema, the parts
   a check can see: no `export * from '#components/ui/…'`; no exported type built on
   `typeof <adaptee import>`; a file imports `#components/ui/<x>` only if it is `<x>`'s
   adapter or `<x>` has none; the four provenance labels present. **Observed 2026-09-03:**
   red on 15 cases (two wholesale re-exports, thirteen missing headers), then red on
   `resource-boundary.tsx` for the bypass rule after it was added, then green — 53 cases at
   thirteen files, 61 at fifteen. Lexical: see "does NOT prove" for what it cannot see.

   **Extended under Decision 12 (ADR-034 step 7), observed RED first as predicted:** two
   rules joined — intrinsic props come through `NativeProps<'x'>` and `ComponentProps<'…'>`
   is refused (thirteen of fifteen files red before the move), and `className` appears only
   as the attribute an Adapter sets on its adaptee (three files red). Both read code with
   comments stripped, because a header that explains why `className` is not a prop would
   otherwise trip the rule that says so. The other direction — every `STYLE` symbol
   resolves to a class the generator emitted — is `design-system-classes.test.ts` since
   ADR-034 step 6, and its lexical class reader became "the authored layer writes no
   design-bearing literal" in step 7 (46 red before, none after).
6. **`packages/design/tests/{switch,combobox}.browser.test.tsx`** — the `browser` Vitest
   project (`vitest run --project browser`): Playwright Chromium, headless, mounted with
   `react-dom/client`, no framework helper, a stand-in box for the switch
   (`browser.setup.ts`) because Tailwind's utilities exist only in the application build.
   Switch: click toggles and reports the value; Space toggles; a controlled value holds;
   disabled refuses both; `readOnly` shows the state and refuses to change it; `name`,
   `value` and `required` reach the hidden checkbox a real `<form>` reads — invalid and
   empty unchecked, valid with `[["notify","yes"]]` checked. Combobox: typing opens and
   filters; choosing reports the Xforge id and shows the label; the empty message; Escape
   closes. **Observed 2026-09-03:** first
   run red on all four Switch cases for the wrong reason (no box — "waiting for element to
   be visible"), then red on one for a real reason (`element()` before React's first
   commit), then 8/8 green; 10/10 after the form and `readOnly` cases joined. Mutations: Switch
   not forwarding `onCheckedChange` → the three callback cases red while the DOM still
   toggled; Switch not spreading its props → all six Switch cases red; Combobox reporting
   the option object → the selection case red.
7. **`packages/design/tests/text.test.tsx`** — every variant and tone `Text` owns renders
   the classes the kernel projects for it, and a tone never displaces the role. **Observed
   2026-09-03:** written before the recipe knew `display`, `success` or `danger`; four of
   ten red on the unchanged component (the three new words and their composition), all
   green once the recipe gained the words. The
   kernel half is the generator's refusal (Migration step 7), not this file.
8. **`packages/design/tests/status.test.tsx`** — the live-region contract (`role="status"`,
   `aria-live="polite"`, `aria-busy`) renders, forwarded props reach the element, and the
   three contract attributes are refused as props at compile time. Status owned this
   contract from the first commit and had no test until this one (Migration step 8).
9. **`packages/design/tests/heading.test.tsx`** — every level renders its own element with the
   slot and the heading weight; no two levels share a type role; rank falls with level
   (`title`, `heading`, `body`). **Observed 2026-09-03:** two of six cases red on the shipped
   table (levels 2 and 3 shared `text-heading`), green after level 3 moved (Migration step 10).

Recording what is not enforced: `adr-has-evidence` was deleted in `a3cf31b`, so the
presence of sources, retrieval dates and a "does NOT prove" section is checked by a person
reading this file. The first person-check on 2026-09-03 passed a claim ("Button has a
recipe") that a one-line `cat` refutes; the evidence-reviewer pass the same day caught it.
Two readers, not one, until a check exists.

**Review record.** First draft 2026-09-03 (policy tree + conditional compiler). Same day:
three read-only explorations (policy tree map, product consumption, external prior art
with retrieval dates); a planning pass proposing Shape A; the owner's amendment adding the
Adaptation Protocol; a second owner review with thirteen corrections — recipe and contract
made EARNED, the maintenance loop reordered to inspect before overwrite, REFINE separated
from the creation intents, the No-Leakage Law scoped to the public Target, "stable anatomy"
narrowed to "stable exposed anatomy", the Integration Adapter given a package-boundary
caveat, the registry future decoupled from the policy-tree trigger, Decision 9's triggers
reduced to two, the beta exit narrowed to the core, and Verification 1 corrected to respect
implicit ARIA live semantics. Then an `adr-evidence-reviewer` pass over this text: every
URL fetched, thirty-three rows judged; one BLOCKING finding — `button.tsx` and `card.tsx`
are `export *` pass-throughs that violate Decision 3 and falsified "Button has a recipe" —
plus a dead Ark UI link, a DTCG draft cited where the stable spec should be, two paraphrases
inside quotation marks, three claims true but not on the cited page, "60 files" for 61, and
two missing gaps (type-level leakage; ACL at component grain). All incorporated in this
text; the blocking finding became Migration step 2 and Verification 5.

A final `adr-evidence-reviewer` pass after Migration step 5 (HEAD `36f7ddc`): every URL
re-fetched and every Migration claim checked against the tree — all steps CONFIRMED read-only.
Two blocking findings, both about what "FROZEN" covered: behaviour survival for Switch and
Combobox was proved by nothing, and two file headers said a browser suite did; and the
maintenance loop was in the frozen core without ever having run. Both corrected here: the
freeze is narrowed to the creation core, the loop stays provisional, the two headers say what
is owed, and "does NOT prove" carries both gaps plus the lexical limits of Verification 5 and
the unmeasured NORMALIZE cost. Non-blocking corrections: exit C reworded to the strength of
its check, stale first-draft line numbers marked as such, thirteen → fifteen, 53 → 61 cases,
the Zag and Panda rows, the Mitosis file count dropped, and the composition test's slice
anchor made deliberate.

A fifth pass after Migration step 7 (HEAD `a2d5a0f`): every step 7 claim checked against the
tree and the contrast ratios recomputed with the generator's own formula; the three tests
step 7 leans on run green by the reviewer. No blocking finding. Six non-blocking corrections,
all folded in: the Consequences count still said five component tests; the contrast range
was the card-and-page range while the sentence said "the contexts they are read on"; the
red-first record named three cases where four failed and "four existing words" where six
cases passed; the test header said cva rendered defaults for an unknown value when it
renders nothing for that axis; "three new classes" where one is a new bridge projection; and
"does NOT prove" said nothing about step 7 — three paragraphs added.

A third pass after the browser suite landed (HEAD `842c2f6`): every previous finding
confirmed fixed in text and in the tree; Verification 6's files, config, catalog entry and
headers confirmed; three URL rows spot-checked verbatim. Nothing blocking. Three residues,
cleared in the following commit: a softened Mitosis file count with no row behind it
(dropped); "What this costs today" one commit stale (updated); and ten failure screenshots
that the red browser runs had written into the checkout and `git add -A` had committed —
removed, their paths ignored, and `screenshotFailures` turned off so a red run leaves the
tree as it found it (law 33). The reviewer also noted, correctly, that the browser proof is
one headless Chromium on one machine and that Switch's adopted form words (`name`, `value`,
`required`, `readOnly`) are forwarded but not exercised by a browser case.

A fourth pass after Migration step 6 and the two added Switch cases: every claim about the
tree and history confirmed (59 files verbatim, two deletions, the hook and the exclusion,
the new cases and their header); nothing blocking. Its drift findings, all fixed here: the
freeze boundary was stated twice (§Beta exit and Status) and now has one owner; ASSESS's
seven-question inventory is marked as unexercised as RECONCILE, since every answer was
"none"; the PREVIEW diagram now puts `shadcn diff` first, as the run learned; the fix
command is named as `pnpm run fix` / `ultracite fix`; "two form-word cases" no longer
counts `readOnly` as one; the morning's evidence row says which tree it measured; and the
exit-B sentence about toast and questionnaire says step 6 deleted them.
