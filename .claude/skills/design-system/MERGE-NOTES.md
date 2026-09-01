# Merge notes

What went where, what was deduplicated, and what was decided when the seven source
documents disagreed. This file is documentation of the merge, not part of the skill's
instructions — Claude never needs to read it to use the skill.

## Source map

| Source file | Size | Went to |
| --- | --- | --- |
| `design_director.txt` | 16 KB | `01-direction.md` (bulk), `SKILL.md` (three-pass workflow, constitution) |
| `design_system_builder.txt` | 43 KB | `02-tokens.md`, `03-components.md` |
| `new_design_system.md` | 32 KB | `04-documentation.md` (canonical source) |
| `design_system_docs.txt` | 40 KB | `04-documentation.md` (unique details only — superseded) |
| `interface_system.txt` | 60 KB | `05-review-craft.md`, `07-report-and-annotate.md`, `08-recipes.md`, `00-standards.md` |
| `design_system.txt` | 6 KB | `05-review-craft.md`, `00-standards.md` |
| `consistency_checker.txt` | 7 KB | `06-review-consistency.md` |

## Structure

The seven files described three distinct jobs that had been written as if they were seven
separate skills. They are now four modes of one skill:

```
design-system/
├── SKILL.md                          router · constitution · severity · scope
└── references/
    ├── 00-standards.md               every number, reconciled
    ├── 01-direction.md               ← design_director
    ├── 02-tokens.md                  ← design_system_builder (§1–73, 135–159)
    ├── 03-components.md              ← design_system_builder (§74–134)
    ├── 04-documentation.md           ← new_design_system + design_system_docs
    ├── 05-review-craft.md            ← interface_system + design_system
    ├── 06-review-consistency.md      ← consistency_checker
    ├── 07-report-and-annotate.md     ← interface_system (output format + Figma cards)
    └── 08-recipes.md                 ← interface_system (code appendices)
```

`SKILL.md` stays short so it can load on every trigger. Reference files load only in the
mode that needs them, which is why `04-documentation.md`'s 200+ rules don't cost anything
during a design review.

## Substantive changes

**Numbers were extracted into one file.** Contrast ratios, hit areas, line-heights,
measure, durations, and stroke widths were scattered across four documents at three
different values. They now live only in `00-standards.md`; every other file points there.
This is the change most likely to alter behavior, and it is deliberate: previously, which
value Claude used depended on which document it happened to read.

**Three severity scales became one.** `Blocking/Important/Polish`,
`Critical/High/Medium/Low`, and `HIGH/MEDIUM/LOW` are now `HIGH/MEDIUM/LOW`, with a mapping
table so old reports remain readable. The Figma annotation pill colors were already keyed
to the three-level scale, which decided it.

**Two foundations-documentation specs became one.** `new_design_system.md` and
`design_system_docs.txt` document the same pipeline — same constitution, same renderers,
same checksum, same fail-closed philosophy — in two structures (Parts vs. numbered rules).
The Parts version is canonical because its transaction model (staging → validate → atomic
commit) and repair contract are more complete. Unique material from the numbered version
was folded in: the name-wrapping cell spec, the developer-token cell minimum of 280px, and
the six-step overflow repair order.

**Ten duplicated principles became the constitution.** "Inspect before creating", "don't
redesign the product", "never invent data", "states are first-class", "never color alone",
"read back before claiming done" each appeared in three to six of the seven files with
different wording. They are stated once in `SKILL.md` and referenced rather than repeated.

**Three review formats became one shell.** The design-review rubric, the consistency audit
structure, and the interface review output format had overlapping but incompatible section
lists. `07-report-and-annotate.md` holds the shared shell (Scope → Findings → Strengths →
Considered but Rejected → Verification → Verdict); the consistency audit swaps its own body
sections into slot 2 and keeps the rest.

## Conflicts and rulings

Full table in `00-standards.md § Conflicts resolved`. The consequential ones:

**Hit targets.** `design_system.txt` said 44×44 iOS / 48dp Android; `interface_system.txt`
said WCAG 2.5.8's 24×24 floor with 44/40 as a target. Ruling: 24×24 is the AA floor and
failing it is HIGH; 44×44 touch and 40×40 desktop are targets and missing them is MEDIUM.
This preserves both the legal floor and the craft ambition without conflating them.

**Borders vs shadows.** `design_director.txt` said prefer borders and surface contrast
before shadow; `interface_system.txt` said borders used for depth are a mistake to replace
with shadows. These read as opposites but aren't: they're about different borders. Ruling:
borders own structure and state, shadows own elevation, surface contrast is tried before
either, and a border that exists *only* to fake depth becomes a shadow.

**Mutation policy.** `consistency_checker.txt` forbade touching Figma;
`interface_system.txt` required drawing annotation cards onto the canvas; `design_system.txt`
offered to apply safe fixes. Ruling: read-only by default, annotations are additive on their
own `Interface review` layer and never touch reviewed frames, and fixes are applied only on
explicit request and only from the safe class (contrast, spacing, focus, reduced-motion,
semantics, alt text).

**Font count.** ≤2 typefaces vs "rarely more than three" vs a mandated two-role
architecture. Ruling: two *global roles* (Primary, Secondary) is the architecture; three
families is the ceiling, and the third must be a genuine mono role. The role architecture
is what actually matters — it's what makes a one-place font swap possible.

**Documentation chrome.** The foundations-docs spec hardcodes a dark palette (`#333333`
page, `#0F0F0F` sections, `#6EA8E5` tokens). This conflicts with nothing, but it read like
a design opinion. It is now explicitly labelled documentation chrome, locked as a checksum,
and marked as never leaking into product output.

## Deliberately not merged

**The subagent workflow naming.** `design_director.txt` specified
`subagent1/subagent2/subagent3` and "do not use any real agent names." That's an
implementation detail of one runtime. The three passes survive as plan → execute →
critique in `SKILL.md`; the naming convention was dropped.

**Component-count targets as hard rules.** "40–60 component sets" is retained as a
calibration signal for web/SaaS, not a quota. Two of the sources had a counting instinct
that produces padding; the surrounding text now says so explicitly.

**Redundant "no issues found" reporting.** The consistency checker's output template listed
nine detailed-audit subsections unconditionally. It now says to omit empty ones.

## Known tension left in place

`04-documentation.md` is far more prescriptive than the rest of the skill — it reads like a
specification because it is one, and because its failure mode (documentation that looks
right and isn't) is invisible without hard gates. The other modes are principle-led. That
asymmetry is intentional, not an oversight.
