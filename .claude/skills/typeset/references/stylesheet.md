# The stylesheet

A complete, working `typeset.css`, annotated with the reason for each decision.
Copy it, then change the token names to the ones the project actually defines.

The published typeset does not document its multipliers, so the numbers below are
a coherent set rather than a quotation. **What matters is that they are multiples
of the three controls, not independent values** — if you prefer a tighter heading
rhythm, change the multiplier, not the rule.

## Contents

- [Layer and specificity](#layer-and-specificity)
- [The reference stylesheet](#the-reference-stylesheet)
- [Deriving a new element rule](#deriving-a-new-element-rule)
- [Wiring it to a project's tokens](#wiring-it-to-a-projects-tokens)
- [Import order](#import-order)

## Layer and specificity

Two mechanisms do different jobs and are often confused:

- **`@layer components`** decides typeset vs *unlayered* CSS. Anything outside a
  layer beats anything inside one, regardless of specificity. This is what lets a
  plain `.article-intro { font-size: 1.2rem }` in an app stylesheet win.
- **`:where()`** decides typeset vs *Tailwind utilities*, which live in
  `@layer utilities`. Layer order already puts utilities above components, so
  strictly the `:where()` is belt and braces — but it also protects against
  authored CSS at the same layer, and it makes the intent legible at the
  selector. Keep both.

The rule to hold: **the container class is the only specificity typeset spends.**
Every element selector goes inside `:where()`.

## The reference stylesheet

```css
@layer components {
  /* ------------------------------------------------------------ container -- */

  .typeset {
    /* The fonts. `inherit` means "follow the app" — the useful default, because
       a docs page inside a themed shell should not announce a different family
       unless someone asked for one. */
    --typeset-font-body: inherit;
    --typeset-font-heading: var(--font-heading, inherit);
    --typeset-font-mono: var(--font-mono, ui-monospace, monospace);

    /* The three controls. Everything below is a multiple of one of them. */
    --typeset-size: 1em;      /* 1em = follow the container */
    --typeset-leading: 1.75;
    --typeset-flow: 1.25em;

    font-family: var(--typeset-font-body);
    font-size: var(--typeset-size);
    line-height: var(--typeset-leading);
    color: var(--foreground);

    /* Deliberately no max-width. Measure belongs to the layout. */
  }

  /* A small bump on narrow viewports: a phone is held closer, and the same
     ratio reads tighter at that distance. */
  @media (width < 40rem) {
    .typeset {
      --typeset-size: 1.0625em;
    }
  }

  /* ---------------------------------------------------------------- flow -- */

  /* ONE DIRECTION ONLY. Every block owns the space above itself and nothing
     owns the space below. A block arriving at the end of the document adds its
     own margin; nothing already rendered changes. See streaming.md. */
  .typeset :where(p, ul, ol, dl, blockquote, pre, table, hr, figure, details) {
    margin-block: 0;
    margin-block-start: var(--typeset-flow);
  }

  /* `:first-child` is append-stable: appending never changes which element is
     first. `:last-child` is not, which is why it appears nowhere here. */
  .typeset > :where(:first-child) {
    margin-block-start: 0;
  }

  /* ------------------------------------------------------------- headings -- */

  /* A heading belongs to what FOLLOWS it, so it takes more space above than a
     paragraph does and gives less below. Both are multiples of flow. */
  .typeset :where(h1, h2, h3, h4, h5, h6) {
    margin-block: 0;
    margin-block-start: calc(var(--typeset-flow) * 1.6);
    font-family: var(--typeset-font-heading);
    font-weight: 600;
    line-height: 1.3;
    text-wrap: balance;
  }

  /* The gap UNDER a heading, expressed as the next element's own top margin.
     `+` is append-stable — the arriving element decides its own spacing from
     what precedes it, and nothing already on screen is restyled. */
  .typeset :where(:is(h1, h2, h3, h4, h5, h6) + *) {
    margin-block-start: calc(var(--typeset-flow) * 0.5);
  }

  /* Heading sizes derive from the base size, so a preset moves the whole scale.
     Four steps, because markdown past h4 is rare and h5/h6 tracking body size
     is honest about that. */
  .typeset :where(h1) { font-size: calc(var(--typeset-size) * 2);    }
  .typeset :where(h2) { font-size: calc(var(--typeset-size) * 1.5);  }
  .typeset :where(h3) { font-size: calc(var(--typeset-size) * 1.25); }
  .typeset :where(h4) { font-size: calc(var(--typeset-size) * 1.1);  }

  /* ---------------------------------------------------------------- text -- */

  .typeset :where(strong, b) { font-weight: 600; }
  .typeset :where(em, i)     { font-style: italic; }

  .typeset :where(a) {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    text-decoration-thickness: from-font;
  }

  .typeset :where(small) { font-size: calc(var(--typeset-size) * 0.875); }

  /* --------------------------------------------------------------- lists -- */

  /* The indent is relative to the text size, so it holds at every preset. */
  .typeset :where(ul, ol) {
    padding-inline-start: calc(var(--typeset-size) * 1.6);
  }
  .typeset :where(ul) { list-style: disc; }
  .typeset :where(ol) { list-style: decimal; }

  /* Items sit closer than blocks do — they are one thing, not several. */
  .typeset :where(li) { margin-block-start: calc(var(--typeset-flow) * 0.35); }
  .typeset :where(li:first-child) { margin-block-start: 0; }

  /* A nested list is part of its parent item, not a new block. */
  .typeset :where(li > ul, li > ol) {
    margin-block-start: calc(var(--typeset-flow) * 0.35);
  }

  /* ---------------------------------------------------------- quote, rule -- */

  .typeset :where(blockquote) {
    padding-inline-start: var(--typeset-flow);
    border-inline-start: 2px solid var(--border);
    color: var(--muted-foreground);
  }

  .typeset :where(hr) {
    margin-block-start: calc(var(--typeset-flow) * 2);
    border: 0;
    border-block-start: 1px solid var(--border);
  }

  /* ---------------------------------------------------------------- code -- */

  .typeset :where(code, kbd, samp) {
    font-family: var(--typeset-font-mono);
    /* 0.9 rather than a fixed size: monospace runs optically larger at the same
       nominal size, and this keeps it matched to whatever role it sits in. */
    font-size: 0.9em;
  }

  .typeset :where(:not(pre) > code) {
    padding: 0.15em 0.35em;
    border-radius: calc(var(--radius) * 0.5);
    background: var(--muted);
  }

  .typeset :where(pre) {
    overflow-x: auto;
    padding: var(--typeset-flow);
    border-radius: var(--radius);
    background: var(--muted);
    /* A code block sets its own leading — prose leading is too airy for it. */
    line-height: 1.5;
  }

  .typeset :where(pre code) {
    padding: 0;
    background: none;
    font-size: inherit;
  }

  /* --------------------------------------------------------------- table -- */

  /* Real tables that wrap to fit. To scroll instead, wrap in `typeset-scroll`. */
  .typeset :where(table) {
    width: 100%;
    border-collapse: collapse;
    text-align: start;
  }

  .typeset :where(th, td) {
    padding: calc(var(--typeset-flow) * 0.5);
    /* THE SEPARATOR IS ON THE ARRIVING ROW'S TOP EDGE, never the previous row's
       bottom. A new row brings its own rule; nothing above it is restyled, and
       there is no trailing border to remove with `:last-child`. */
    border-block-start: 1px solid var(--border);
    vertical-align: top;
  }

  .typeset :where(th) {
    font-weight: 600;
    color: var(--muted-foreground);
  }

  .typeset :where(thead tr:first-child th) {
    border-block-start: 0;
  }

  /* -------------------------------------------------------------- figure -- */

  .typeset :where(img, video, canvas, svg) {
    max-width: 100%;
    height: auto;
  }

  .typeset :where(figcaption) {
    margin-block-start: calc(var(--typeset-flow) * 0.4);
    font-size: calc(var(--typeset-size) * 0.875);
    color: var(--muted-foreground);
  }

  /* ------------------------------------------------------------- opt out -- */

  /* LAST, so it beats the rules above at equal specificity. `revert-layer`
     drops these elements back to whatever the previous layer said, which is the
     component's own styling — exactly what "untouched" should mean. */
  .typeset :where(.not-typeset, [data-not-typeset]),
  .typeset :where(.not-typeset, [data-not-typeset]) * {
    all: revert-layer;
  }
}

/* Outside the layer and outside `.typeset`: a wrapper you put around any wide
   block — usually a table — to scroll it instead of wrapping it. Works on its
   own, because a renderer's table component may sit outside the container. */
.typeset-scroll {
  max-width: 100%;
  overflow-x: auto;
}
```

## Deriving a new element rule

When markdown produces something the stylesheet does not cover, four questions
answer it:

1. **Is it a block?** Then it gets `margin-block-start: <multiple of flow>` and
   nothing else about spacing. Add it to the flow selector list.
2. **Does it carry text at a different size?** Express the size as
   `calc(var(--typeset-size) * n)`, never a literal.
3. **Does it paint?** Colour, background, border and radius come from the app's
   theme tokens. If typeset names a colour literal, dark mode is now typeset's
   problem instead of the theme's.
4. **Does it look forward?** If the rule needs `:last-child`, `:has()` or
   `:empty` to work, rewrite it — see `streaming.md`. There is almost always a
   `:first-child` or `+` formulation of the same intent.

## Wiring it to a project's tokens

The example names `--foreground`, `--muted-foreground`, `--muted`, `--border`
and `--radius` because that is the shadcn/ui convention. **Check what the project
actually defines before copying.** A `var()` naming a property that does not
exist is valid CSS: the declaration is dropped, the element falls back to an
inherited or initial value, and the page renders looking nearly right. No build
error, no lint error, no failing test.

Grep the project's theme block for the names, and if one is missing either map to
the nearest real token or add the token — do not leave the reference dangling and
do not paper over it with a fallback like `var(--border, #e5e5e5)`, which freezes
a colour that dark mode will never touch.

## Import order

```css
@import "tailwindcss";
@import "./typeset.css";
```

Typeset after Tailwind. Tailwind's `@layer` declarations establish the order, and
importing typeset first means its `@layer components` block registers before
Tailwind names the layers — at which point the ordering is decided by whichever
file happened to load first rather than by anything anyone chose.
