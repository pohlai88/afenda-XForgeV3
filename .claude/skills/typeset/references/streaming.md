# Append stability

The contract: **adding a block to the end of the document must not change the
styles of any block already on screen.**

This is the property that separates typeset from `prose`, and it is the one that
is easy to break by accident and hard to notice in review, because a stylesheet
that violates it looks completely correct in a static screenshot.

## Contents

- [Why it matters](#why-it-matters)
- [Which selectors look forward](#which-selectors-look-forward)
- [The three rules](#the-three-rules)
- [Rewrites for the common cases](#rewrites-for-the-common-cases)
- [Review checklist](#review-checklist)
- [What this does not cover](#what-this-does-not-cover)

## Why it matters

A streaming response appends to the DOM many times a second. If any rule in the
stylesheet matches differently once a sibling arrives, the browser restyles an
element the reader is already looking at — and because these rules are almost
always about margins and borders, the restyle moves everything below it.

The reader sees the text they are mid-sentence on jump down a few pixels,
repeatedly, for the duration of the response. On a long answer that is hundreds
of shifts. It reads as jank with no obvious cause, and it never reproduces in a
static test because it needs a second element to arrive.

Same failure, quieter, in anything that appends: infinite scroll, a live log, a
comment thread, incremental markdown preview.

## Which selectors look forward

A selector is *forward-looking* if appending a sibling can change whether it
matches an element that was already there.

| Selector | Stable on append? | Why |
| --- | --- | --- |
| `:first-child`, `:first-of-type` | **Yes** | Appending never changes which element is first |
| `E + F`, `E ~ F` | **Yes** | The arriving element gains the rule; earlier ones are unaffected |
| `:nth-child(n)` counting from the start | **Yes** | Positions from the start do not shift |
| `:last-child`, `:last-of-type` | **No** | The previously-last element stops matching the moment a sibling lands |
| `:nth-last-child()`, `:only-child` | **No** | Both count from the end |
| `:has()` | **No** | Its match set changes when a descendant or later sibling arrives |
| `:empty` | **No** | An element being streamed into stops being empty mid-render |

The stable ones share a property: they are decided by what came *before*. That is
the whole heuristic — **a rule may look backwards, never forwards.**

## The three rules

**1. Spacing flows in one direction.** Every block owns the space above itself,
and nothing owns the space below. Use `margin-block-start` only.

Two-directional margins are not merely redundant; they force a `:last-child`
somewhere. The moment you write `margin-block: 1em 1em` you get a trailing gap
at the end of the document, and the reflex fix is
`p:last-child { margin-bottom: 0 }` — which is precisely the unstable rule. One
direction removes the need for the fix.

**2. Separators live on the arriving element.** A divider between two things is
expressed as a `border-block-start` on the second, never a `border-block-end` on
the first. Same argument: a bottom border on every row leaves a trailing rule,
whose fix is `tr:last-child { border: 0 }`.

**3. A container's rules do not depend on its contents.** No `:has()` in layout.
`.typeset:has(pre) { ... }` restyles the entire block the first time a code fence
arrives — the largest possible reflow, at the worst possible moment.

## Rewrites for the common cases

**Trailing margin at the end of the document**

```css
/* Unstable — the last paragraph gains a margin when the next one arrives */
.typeset :where(p) { margin-block: 0 1em; }
.typeset :where(p:last-child) { margin-block-end: 0; }

/* Stable */
.typeset :where(p) { margin-block: 0; margin-block-start: 1em; }
.typeset > :where(:first-child) { margin-block-start: 0; }
```

**A tighter gap under headings**

```css
/* Unstable — depends on what follows the heading */
.typeset :where(h2:has(+ p)) { margin-block-end: 0.5em; }

/* Stable — the arriving element decides its own space from what precedes it */
.typeset :where(:is(h1,h2,h3,h4,h5,h6) + *) { margin-block-start: 0.5em; }
```

**Table row separators**

```css
/* Unstable — appending a row makes the previous row grow a bottom border */
.typeset :where(td) { border-block-end: 1px solid var(--border); }
.typeset :where(tr:last-child td) { border-block-end: 0; }

/* Stable — the new row brings its own rule, and there is no trailing one */
.typeset :where(th, td) { border-block-start: 1px solid var(--border); }
.typeset :where(thead tr:first-child th) { border-block-start: 0; }
```

**Styling an empty state**

```css
/* Unstable — the element stops being empty as soon as a token lands in it */
.typeset :where(p:empty) { display: none; }

/* Stable — decide it in the renderer. Whether a block should exist is the
   renderer's question; CSS can only guess, and it guesses again every frame. */
```

## Review checklist

Run this over any typeset stylesheet before shipping it into a streaming surface.
Each line is a grep, not a judgement call.

- [ ] No `:last-child`, `:last-of-type`, `:nth-last-child`, or `:only-child`
      anywhere in a layout rule (margin, padding, border, display, position).
- [ ] No `:has()` at all in the stylesheet.
- [ ] No `:empty`.
- [ ] No `margin-block-end`, `margin-bottom`, or two-value `margin-block` on any
      block element.
- [ ] Every separator is `border-block-start` / `border-inline-start`, never the
      `-end` pair, except where it is zeroed on a `:first-child`.
- [ ] `transition` and `animation` do not apply to any property that resolves
      from an inherited custom property. A transition on an inherited length
      makes every preset change animate, and makes a re-render mid-stream
      visibly lerp.

The grep for the first four:

```bash
grep -nE ':last-child|:last-of-type|:nth-last-child|:only-child|:has\(|:empty|margin-bottom|margin-block-end' typeset.css
```

Expected output is nothing. If a line comes back, either it is in a comment, or
it is a defect — check which before dismissing it.

## What this does not cover

**Text reflow within a block is fine and expected.** A paragraph that is still
streaming grows and re-wraps; that is the content arriving, not a restyle.
Typeset's contract is about blocks that are *finished* not changing, which is a
narrower and achievable promise.

**Layout shift from images and embeds is a different problem.** An image with no
intrinsic size pushes content down when it loads, and no selector rule prevents
it. That is solved with `width`/`height` attributes or `aspect-ratio` on the
element, in the renderer.

**Nothing here makes React's reconciliation stable.** If the renderer remounts
the whole tree per chunk instead of appending, every block is new every frame and
the stylesheet's stability is irrelevant. Check that first when content jumps and
the stylesheet is clean — the checklist above passing means the CSS is not the
cause, which is useful precisely because it points elsewhere.
