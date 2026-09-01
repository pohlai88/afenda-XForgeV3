---
name: design-system
description: >
  Direct, build, document, and review design systems and product interfaces —
  in Figma, in code, or on a static screen. Covers art direction and visual
  language, Figma variable/token architecture, component library construction,
  deterministic foundations documentation, craft and accessibility review, and
  cross-screen consistency auditing. Use this skill whenever the user mentions
  a design system, design tokens, Figma variables, styles, components, a UI
  kit, foundations documentation, a design review or critique, a UI/UX audit,
  accessibility or WCAG checking, visual QA, spacing/typography/color
  consistency, or asks to design, polish, review, or ship a screen, component,
  dashboard, or interface — even if they don't use the words "design system."
---

# Design System

One system for four jobs: **Direct** (decide the visual language), **Build** (create the
tokens and components), **Document** (generate foundations docs from what actually
exists), and **Review** (critique, audit, and report).

Consolidated from seven overlapping sources. Where those sources disagreed on a number
or a rule, `references/00-standards.md` holds the settled value — it is the single source
of truth for every measurement in this skill. Do not re-derive numbers from memory.

## Pick a mode first

State the mode and scope in the first line of output. When a request spans modes, run them
in the order listed here — direction before build, build before docs, docs before review.

| Mode | Trigger | Read |
| --- | --- | --- |
| **Direct** | "design a…", "art direction", "what should this look like", new product surface, redesign | `01-direction.md` |
| **Build: tokens** | "create variables", "set up tokens", "build the design system", theming, light/dark | `02-tokens.md` |
| **Build: components** | "component library", "build the buttons/forms", patterns, templates, guidelines | `03-components.md` |
| **Document** | "document the foundations", "generate token docs", "table of all our variables" | `04-documentation.md` |
| **Review: craft** | "review this", "critique", "is this accessible", "polish", pre-ship check | `05-review-craft.md` |
| **Review: consistency** | "audit these screens", "is this consistent", multi-screen QA, pre-development review | `06-review-consistency.md` |
| **Any review** | — always, for the report shape and Figma annotations | `07-report-and-annotate.md` |
| **Implementation** | applying a fix in code: radius, shadow, animation, icon | `08-recipes.md` |

`00-standards.md` is read in every mode.

**In the Xforge repository, read `09-xforge.md` first — before the mode file.** This skill
was consolidated from seven general sources and knows nothing about any particular
codebase. Xforge has its own token authority, generated files that must never be
hand-edited, guards that constrain how a fix may be expressed, and accessibility
conformance that is already enforced mechanically. Where `09-xforge.md` and a general
reference disagree, the repository wins — most sharply in **Build: tokens**, where
`02-tokens.md` names Figma as the source of truth and here it decides nothing.

## Constitution

Ten rules that hold in all four modes. Everything in `references/` elaborates on these;
nothing there overrides them.

**1. The source is authoritative.** Inspect before creating. The current Figma file,
codebase, or screen is the truth. Never invent variables, styles, modes, aliases,
descriptions, paint values, gradient stops, breakpoints, or semantic relationships that
were not discovered. If a property genuinely does not exist, preserve its absence rather
than filling it in.

**2. Do not redesign what you were asked to review, document, or extend.** Product
screens are reference material. Preserve an authoritative frame, screenshot, or brand
system's hierarchy, geometry, color roles, typography, iconography, and assets. Create a
competing theme only when a redesign is explicitly requested, and say so when you do.

**3. Non-destructive by default.** Review and documentation are read-only. Never modify
source variables, styles, components, or frames. Annotations are additive and live on
their own layer. Apply fixes only when the user asks for implementation, and then only
the clear, safe ones — contrast values, spacing steps, focus states, reduced-motion
variants, semantic structure, alt text. Subjective or structural changes stay
recommendations until confirmed.

**4. Evidence, not vibes.** Every finding cites a specific location — `path/to/file:line`,
or the exact frame, component, and layer. Measure the real value: contrast ratio,
line-height, measure in `ch`, tap target in px, animation duration. Never report a
code-level finding from appearance alone, or a visual finding from source alone when
runtime decides the result. Separate **confirmed** from **likely** from
**recommendation**, and never imply an uninspected surface was reviewed.

**5. Layer the system.** `Core primitives → Semantic tokens → Component tokens (only if
needed) → Styles and components`. Primitives describe values, semantics describe purpose,
components consume semantics. Never bind a component to a raw value when a semantic token
exists. Never mix abstraction levels inside one collection.

**6. States are first-class.** Every interactive element gets default, hover,
`:focus-visible`, active/pressed, selected, and disabled. Every data surface gets loading,
empty, and error alongside the happy path. Design them with the component, not afterwards.

**7. Never let color carry meaning alone.** Status, selection, validity, and progress each
need a redundant cue — icon, text, shape, underline, or position.

**8. Fail closed, then read back.** Creating a layer is not proof of success. Verify the
generated output against the source before declaring done. A gate that cannot be
satisfied stops the work and returns a structured failure — it never downgrades into a
partial result quietly. Never leave output half-committed.

**9. Earn every element.** Keep only what adds comprehension, hierarchy, action,
navigation, feedback, or genuine brand identity. Remove the rest. Premium quality comes
from typography, proportion, spacing, alignment, and interaction quality — not from
glass, glow, gradients, or shadows added to look modern.

**10. One severity scale.** Everything below.

## Severity

Three levels, used identically by both review modes and by any QA gate.

- **HIGH** — blocks a task, misleads the user, hides content or controls, risks data loss,
  fails WCAG AA, is unusable on a target device, or is a repeated systemic failure.
- **MEDIUM** — meaningfully harms hierarchy, readability, efficiency, adaptability, or
  consistency.
- **LOW** — isolated polish with limited task impact. Report only in `full` mode.

Within a severity, rank by reach and leverage: a token or shared-component fix outranks
the same symptom in one leaf component. Each row is one root cause — list every confirmed
location in that row rather than emitting a row per occurrence.

Older scales map in: `Blocking`/`Critical` → HIGH, `Important`/`High` → HIGH if it blocks
a task, otherwise MEDIUM. `Medium` → MEDIUM. `Polish`/`Low` → LOW.

## Review scope and depth

Resolve scope from the request and workspace, then state it. Default to `full`.

| Mode | Coverage | Finding cap |
| --- | --- | --- |
| `quick` | Primary user path and highest-traffic states; HIGH and MEDIUM only | 5 |
| `full` | Entire scope across all domains, including empty, loading, error, and narrow-width states | 15 |

If the scope is too large to inspect credibly, narrow it to the highest-traffic complete
flow and state the boundary. Never pad a report to reach the cap.

Review domains in this order so foundational failures aren't buried under polish:
**Accessibility → Layout → Writing → Typography → UI polish → Consistency**. When two
domains cover the same issue, file it under the one that owns the underlying rule and
mention the secondary effect in the *Why* column. Report it once.

## Match the existing system

Before writing any fix, check how the project already does it and express the change in
that system: Tailwind utilities in a Tailwind project, plain declarations in CSS, CSS
Modules, styled-components, or StyleX. In Figma, reuse and extend existing variables,
styles, and components before creating parallel ones. Preserve the project's component
library, tokens, density, and motion language. Never introduce a second styling approach
just to land a fix.

Numbers in `00-standards.md` are starting points for interfaces with no established
density system. Preserve deliberate platform chrome, compact professional tools, and
project tokens where they survive hit-area, zoom, localization, and viewport stress tests.

## Working sequence for large jobs

When a request needs independent planning, execution, and critique, run three passes and
pass only decisions, evidence, and open questions between them:

1. **Plan** — study purpose, audience, key tasks, content, brand evidence, and references.
   Define the goal, primary action, content hierarchy, required states, density, focal
   points, responsive priorities, and explicit exclusions. Output a brief and a map of
   required frames and states.
2. **Execute** — translate the brief into direction, tokens, styles, layout, components,
   responsive frames, and interaction states. Preserve supplied references; document any
   intentional departure.
3. **Critique** — review the result independently against every rule in this skill,
   including the anti-patterns in `01-direction.md`. Record each issue with its observed
   condition, impact, confidence, and smallest reasonable revision.

Then revise and re-review the whole flow, not isolated frames.

## Never finish with

- Empty pages, empty sections, or "patterns can be added later."
- Variables created but never bound to styles or components.
- A claim of coverage for something not inspected.
- `Approve` while actionable findings remain.
- A design system whose light/dark switch requires editing components by hand.
