---
name: typeset
description: >
  Style rendered markdown and long-form HTML — blog posts, docs pages, chat
  transcripts, release notes, CMS output, AI responses — with one container
  class instead of per-element rules. Covers the three-control rhythm model
  (size, leading, flow), zero-specificity `:where()` element selectors, presets
  per reading context, opting a subtree out with `not-typeset`, and the
  append-stability rules that stop a streaming response from reflowing what is
  already on screen. Use this skill whenever the user mentions rendered
  markdown, prose or article styling, a `prose` class or
  @tailwindcss/typography, docs/blog/changelog typography, chat message
  formatting, streaming text that jumps or shifts, or asks to make generated or
  long-form content "look right" — even if they never say the word typeset.
  ALSO carries ready-to-copy transcriptions of shadcn/ui's published foundations —
  the type scale, the colour variables and full Tailwind palette, the spacing and
  radius scales, and the responsive layout grid, as CSS and as DTCG tokens — so
  use it whenever someone asks for shadcn or Tailwind design tokens, a colour
  ramp, a spacing or radius scale, container widths, a layout grid, or wants a
  Figma token export cleaned up into usable primitives.
  In the Xforge repository, read `references/xforge.md` before doing anything.
---

# Typeset

One container class styles a tree you did not author.

## The problem, stated precisely

A markdown renderer hands you `<h2>`, `<p>`, `<ul>`, `<table>` with no class
attributes. You cannot put a `className` on an element a renderer emits — so the
styling has to be addressed from an ancestor. That is the entire reason typeset
is a container class rather than a set of component classes, and every other
decision in it follows from that one constraint.

Addressing from an ancestor creates exactly two problems. Typeset is mostly the
answer to them:

1. **Descendant selectors out-specify utilities.** `.typeset h2` is (0,1,1) and
   beats `text-lg` at (0,1,0), so a one-off override silently loses. Wrapping the
   element part in `:where()` drops it to (0,1,0) — the container class alone —
   so a utility on the element wins without `!important`.
2. **The styles reach everything inside**, including React components rendered
   into the markdown. A `<Card>` in a docs page should not inherit paragraph
   margins. `not-typeset` cuts a subtree out.

If you remember nothing else: **`:where()` for specificity, `not-typeset` for
scope.**

## The model: three controls

Type has a dozen knobs — scale ratio, tracking, optical size, measure, leading,
and the space above and below every element. Exposing all of them is what makes
typography systems unusable; nobody wants to set twelve variables to make
markdown look right.

Typeset exposes three, and derives everything else:

```css
.typeset {
  --typeset-size: 1em;      /* base text size    */
  --typeset-leading: 1.75;  /* line-height       */
  --typeset-flow: 1.25em;   /* space between blocks */
}
```

The reason to expose three rather than twelve is not simplicity for its own
sake. **Heading sizes and block spacing are relationships, not independent
values.** If a heading's top margin is `1.6 × flow`, the document keeps its
proportion when flow changes. Expose `h2-margin-top` separately and someone will
set it to `24px`, and the proportion is gone the first time anyone tunes flow.

So: derive, never enumerate. A new element in the stylesheet gets its spacing as
a multiple of `--typeset-flow` and its size as a multiple of `--typeset-size`. A
raw value in a typeset stylesheet is a bug even when it looks right, because it
is the one value that will not move when the preset changes.

## Container-relative sizing

`--typeset-size: 1em` means the block inherits the surrounding font size. In a
chat bubble at 14px, prose is 14px-based; in an article at 16px it is 16px-based.
The same class works in both, with no variant.

This is the thing `prose-sm` / `prose-lg` cannot do. Those pick a step at author
time from a fixed `rem` scale, so the author has to know which container the
content will land in. Container-relative sizing derives it at render time
instead.

Consequence worth stating: **typeset sets no `max-width`.** Measure belongs to
your layout, not to a stylesheet buried three imports deep. Put it on the wrapper.

**But "your layout owns it" is not the same as "no guidance", and measure is the
single biggest lever on whether prose is comfortable to read.** So:

```tsx
<article className="typeset typeset-docs" style={{ maxWidth: '66ch' }}>
```

`ch` rather than `rem`, because `ch` is defined in terms of the font — so the
measure follows a preset that changes `--typeset-size` or the family, which a
fixed `rem` would not. That is the same argument as `--typeset-size: 1em`, one
level out.

Two things to know about the number:

- **45–75 characters is the comfortable band; ~66 is the usual optimum.** Below
  45 the eye returns too often; above 75 it loses the line on the way back.
- **`ch` is not a character.** It is the advance width of `0`, which in a
  proportional face is wider than the average lowercase letter — so
  `max-width: 66ch` renders roughly 75–80 actual characters. Set `66ch` when you
  want ~66 characters only if you have measured that face; otherwise treat `ch`
  as "about 15% wider than it says".

A worked example: this repository's `size.content-prose` is `45rem` — 720px, or
about 75 characters in IBM Plex Sans. Top of the band, and a deliberate choice
for dense business screens rather than an oversight.

## Presets

A preset is a small class that sets the three controls (and optionally the
fonts). Several can coexist in one app:

```css
.typeset-chat  { --typeset-leading: 1.6; --typeset-flow: 1em; }
.typeset-docs  { --typeset-size: 15px; --typeset-flow: 1.5em; }
.typeset-reading {
  --typeset-font-body: var(--font-lora);
  --typeset-font-heading: var(--font-lora);
  --typeset-size: 18px;
  --typeset-leading: 1.9;
  --typeset-flow: 2em;
}
```

```tsx
<div className="typeset typeset-chat">{message}</div>
<article className="typeset typeset-docs">{page}</article>
```

`typeset` turns the styles on; the preset tunes them. For a genuine one-off, skip
the preset: `<article className="typeset [--typeset-flow:1.75em]">`.

A preset can change the whole feel — a serif reading mode, a compact UI mode, a
roomier accessible mode exposed as a user setting. That is the payoff of putting
the three controls in custom properties rather than in the rules.

### Start with two, and IBM has already named them

The instinct is a preset per surface — docs, chat, blog, changelog — and it ends
with eight presets nobody can tell apart. **Carbon splits its type set exactly
two ways, and that split is the one that earns its keep:**

| Carbon's name | What it is for | Rhythm |
| --- | --- | --- |
| **productive** | *Operating* the software — dense screens, tables, forms, panels | tighter leading, tighter flow |
| **expressive** | *Reading* — long-form pages, marketing, documentation | roomier leading, roomier flow |

It is the same size scale in both; only leading and weight move
(`productiveHeading01` is `line-height: 1.28572`, `expressiveHeading01` is
`1.25`, and `expressiveHeading05`/`06` differ from each other by weight alone).
That is precisely what a typeset preset is — same elements, different rhythm —
so the vocabulary transfers directly:

```css
.typeset-productive { --typeset-leading: 1.5;  --typeset-flow: 1em; }
.typeset-expressive { --typeset-leading: 1.75; --typeset-flow: 1.5em; }
```

Adopt those two first. Add a third only when you can say what it does that
neither of them does — a genuine reading mode at a larger size, an accessibility
setting. "Docs" and "blog" are usually both expressive, and giving them separate
presets means two things to keep in sync that were never different.

*(Source: `@carbon/type` token definitions, retrieved via context7 2026-09-02.)*

## The five invariants

Everything in the stylesheet holds to these. Break one and the failure is
usually silent.

1. **Zero specificity on element selectors.** Element parts go inside `:where()`.
   The container class carries the only specificity there is.
2. **Values derive from the three controls.** No raw sizes or spacings in
   element rules.
3. **Colour, radius and fonts come from the app's theme tokens.** Typeset owns
   rhythm; it does not own the palette. Dark mode then costs nothing — the
   tokens already flip.
4. **Spacing flows one way.** `margin-block-start` only, never `margin-bottom`
   and never both. See `references/streaming.md`.
5. **No forward-looking selectors in layout rules.** `:last-child`, `:has()` and
   `:empty` change what they match when content is appended. `:first-child` and
   `+` do not. This is the whole streaming contract.

## Opting out

```tsx
<div className="typeset">
  <p>Styled prose.</p>
  <Card className="not-typeset">Untouched component.</Card>
</div>
```

`not-typeset` or `data-not-typeset` covers the element and everything beneath it,
including a nested `typeset` container. Reach for it whenever a real component
lands inside rendered content — cards, callouts, embeds, code playgrounds.

## Workflow

**Setting typeset up in a project:**

**0. Read `components.json` first.** It answers four questions before you write a
line, and guessing any of them wastes the whole pass:

| Field | Decides |
| --- | --- |
| `tailwind.css` | Where the entry stylesheet lives — put `typeset.css` beside it |
| `tailwind.cssVariables` | `true` means `--foreground`/`--muted` etc. exist. `false` means they do not, and the stylesheet must consume Tailwind colour utilities instead |
| `tailwind.baseColor` | Which neutral ramp the theme vars resolve to |
| `aliases.utils` / `aliases.ui` | Where a wrapper component would go, if you build one |

No `components.json` means the project is not shadcn-configured. Typeset still
works — it is one CSS file — but nothing about the theme layer can be assumed, so
step 2 becomes mandatory rather than a check.

1. Read `references/stylesheet.md` and write `typeset.css` next to the entry
   stylesheet. Import it after Tailwind so utilities keep winning:
   `@import "tailwindcss"; @import "./typeset.css";`
   `assets/shadcn-typography.css` is a complete worked example implementing
   shadcn's own published type scale — copy it rather than starting blank.
2. **Verify every theme token the stylesheet names actually exists.** Grep the
   project's theme block for `--foreground`, `--muted-foreground`, `--border`,
   `--radius` and the font variables. A `var()` naming an undefined property is
   valid CSS: the declaration is dropped, the element inherits, and the page
   renders looking *nearly* right — no build error, no lint error, no failing
   test. `assets/shadcn-theme.css` defines all of them if the project has none.
3. Define one preset per reading context that genuinely differs. Two or three.
   A preset per page is a stylesheet with extra steps.
4. Wrap the rendered output: `<div className="typeset typeset-docs">`.
5. Run the append-stability grep from `references/streaming.md` if the content
   ever streams, paginates or appends.
6. Finish with the audit: imports resolve, no lint errors, no TypeScript errors,
   and the page renders in both themes. Typeset ships no JS, so most of shadcn's
   component checklist does not apply — but the import path and the theme-token
   check in step 2 are where this actually goes wrong.

**There is no `shadcn add typeset`.** Searching the `@shadcn` registry for it
returns nothing (checked 2026-09-02), and that is by design: the published
distribution model is *one CSS file you own*, generated by the builder at
`ui.shadcn.com/typeset`. Do not send anyone to the CLI for it.

**Debugging typeset that looks wrong:**

| Symptom | Cause to check first |
| --- | --- |
| A utility class on an element does nothing | An element rule escaped `:where()` |
| A component inside the content is mangled | Missing `not-typeset` |
| Prose is the wrong size in one place | `--typeset-size` is fixed rather than `1em`, or the container's own font-size is unexpected |
| Blocks shift while text streams | A forward-looking selector, or two-directional margins — see `references/streaming.md` |
| Dark mode is wrong | A literal colour in the stylesheet instead of a theme token |
| A wide table breaks the layout | Wrap it in `typeset-scroll` |
| Nothing applies at all | The stylesheet is in a layer the container class cannot reach, or imported before Tailwind |

## What else is in here

Nothing below is needed to tune a preset. Reach for it when the job matches.

**References — read into context.**

| File | Read it when |
| --- | --- |
| `references/stylesheet.md` | Writing or extending `typeset.css`. The annotated reference stylesheet, plus how to derive a rule for an element it does not cover |
| `references/streaming.md` | Content streams, paginates or appends; or blocks visibly jump. Carries the greppable checklist |
| `references/editorial.md` | The content has footnotes, abbreviations, numeric tables, strikethrough or definition lists; or someone asks the stylesheet to enforce a writing standard (AP, Chicago) — which it cannot, though it must render what that standard produces. Carries the dash/quote finding that is a *renderer* setting rather than a CSS rule |
| `references/xforge.md` | **Working in the Xforge repository — read before anything else here** |

**Assets — copy into a project, do not read whole.**

These are transcriptions of shadcn's published specs, with every arithmetic error
found during transcription corrected and recorded. They are independent: import
in any order, take one without the others.

| File | What it is |
| --- | --- |
| `assets/shadcn-typography.css` | shadcn's type scale as a working typeset. The document elements are in the container; the UI roles (`lead`, `large`, `small`, `muted`, `badge`, card title, kbd) are `.type-*` classes outside it, because a container selector cannot tell a `lead` paragraph from any other `<p>` |
| `assets/shadcn-theme.css` | The colour variables typeset consumes, as two composing axes (neutral ramp × light/dark) rather than four hand-synced columns. Carries a measured contrast audit and a `.theme-aa` opt-in for the two light-mode pairs that fail AA |
| `assets/shadcn-spacing.css` | Spacing, radius and container scales. One `--spacing` base plus derived t-shirt aliases |
| `assets/shadcn-grid.css` | The 12/6/3 responsive layout grid. Ships no span utilities — its breakpoints are Tailwind's `md` and `xl`, so `md:col-span-4` already lines up |
| `assets/shadcn-primitives.tokens.json` | The dimension primitives as DTCG. Nine duplicated property scales collapsed to one, `$type` restored from the flattened `number` |
| `assets/shadcn-colors.tokens.json` | The full Tailwind palette as DTCG — 22 ramps × 11 steps plus base |
| `assets/shadcn-primitives.md` · `assets/shadcn-colors.md` | What changed from each Figma export and why. Read before trusting either token file |

**Scripts — run, do not read.**

| File | Run it when |
| --- | --- |
| `scripts/check-assets.mjs` | **After editing anything in `assets/`.** The assets promise to be independent and importable in any order, which is precisely what lets them disagree. Catches a custom property declared by two files, a bare `var()` nothing declares, a breakpoint that drifted between the grid and the spacing scale, and Figma residue in the token JSONs |
| `scripts/probe-guards.mjs` | Xforge only. Checks a candidate stylesheet against the repository's guards without writing it into the tree. `--expect` proves the guards still refuse the vendor recipe; `--clean` proves an adapted stylesheet passes, and refuses to certify a path no guard reaches |

**MCP, when connected.** `mcp__shadcn__get_project_registries` reads the
configured registries, `search_items_in_registries` finds components, and
`get_audit_checklist` returns the official post-generation checklist. None of them
knows about typeset — it is not a registry item — so they help with the
*components* that land inside a typeset container, not with typeset itself.

## Prior art, and what it does not prove

`@tailwindcss/typography`'s `prose` class is excellent at what it was built for
and is the right answer in most projects. Typeset differs on four axes: sizing is
container-relative rather than a fixed `rem` scale; dark mode is your tokens
flipping rather than a second palette (`prose-invert`); overrides are plain
utilities rather than a `prose-a:` modifier API; and appends are stable by
construction. It is distributed as one CSS file you own rather than a plugin that
generates CSS.

Typeset borrows two ideas from the plugin outright: the zero-specificity
`:where()` guard, and the escape-hatch class (`not-prose` → `not-typeset`).

**It is not the only prior art, and the plugin is not the oldest.** IBM's Carbon
ships `type.reset()` and `type.default-type()`, described in its own docs as
*"opinionated defaults for type styles on common elements like `h1`, `h2`, `p`"* —
which is typeset's entire premise, shipped years earlier at enterprise scale.
Worth knowing for two reasons: the approach is not novel and does not need
defending, and Carbon has already worked out the preset taxonomy above.

Where Carbon and typeset genuinely diverge is **letter-spacing**. Carbon states
tracking in **px** (`letterSpacing: px(0.32)` on `label01`), which is correct
there because each Carbon token has exactly one size, so one px value is one
ratio. Typeset cannot: `--typeset-size` is variable by design, so a px tracking
would be right at one preset and wrong at every other. Use `em`. The divergence
is a consequence of the container-relative model, not a disagreement about type.

**What none of that proves:** that typeset is the right call for a given project.
Its advantages are real only where the content is rendered from markdown you do
not control, and its streaming contract only pays where content actually streams.
A project with hand-authored JSX content and a component library already covering
headings and lists gains nothing from it and takes on a second typography
authority. Say so when that is the situation rather than porting it anyway.
