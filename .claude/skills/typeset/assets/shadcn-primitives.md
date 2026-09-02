# shadcn/ui primitives — what changed from the export

Companion to `shadcn-primitives.tokens.json`. Every departure from the Figma
export is listed here, with the reason. Nothing was changed silently.

**131 tokens out, from an export whose length scales alone held 289.**

---

## Removed

| Removed | Why |
| --- | --- |
| Every `$extensions` block | `com.figma.variableId`, `com.figma.codeSyntax`, `com.figma.scopes`, `com.figma.modeName`. Editor state, not design values |
| `rounded.--------------------` | Its own `$description` says *"just a separator"*. A Figma UI affordance that became a token with the value 0 |
| `rounded.rounded-tl-sm 2` | Duplicate of `rounded-tl-sm`, with a space in the key. Almost certainly a fat-fingered duplicate in the Figma panel |
| The four per-corner sets | `rounded-tl-*`, `-tr-*`, `-bl-*`, `-br-*` were pure aliases of `rounded.*`. A corner is a property, not a value — see below |

---

## Corrected

**`gap-60` was 224px.** It should be 240. Its own `codeSyntax` said `gap: 15rem`
(= 240px) while `$value` said 224 — and 224 is exactly what `gap-56` holds, so
the export contained two identical steps and a broken one. The value obeys the
code syntax and the scale.

**Opacity was 0–100, typed `number`.** CSS opacity is 0–1, so `opacity-5` shipped
the value `5` — fully opaque five times over if any tool read it literally. Only
the `codeSyntax` string carried the truth. Now `0.05`.

**Tracking was em × 100, typed `number`.** `tracking-tight: -2.5` meant
`-0.025em`. Now `-0.025em`, typed `dimension` — so it is a letter-spacing a tool
can apply, not a magic number needing a conversion nobody documented.

*`em` rather than `px` because these steps are applied across a whole size scale,
where one px value would be one ratio at 12px and a different one at 48px. That
is not a general rule: IBM's Carbon states its tracking in px, and is right to —
each Carbon token carries exactly one size, so a px value there resolves to
exactly one ratio. The unit follows whether the size is fixed, not fashion.*

**Everything was `$type: "number"`.** That is the export's deepest problem and the
main reason this file exists. Figma flattened four different kinds of value onto
one type:

```
space-base-unit  = 4     a length in px
font-bold        = 700   a font weight
opacity-5        = 5     a percentage
tracking-tight   = -2.5  em, scaled by 100
```

Nothing downstream can tell them apart. Types are restored: `dimension` for
lengths, `fontWeight` for weights, `number` for the genuinely unitless.

---

## Collapsed

**Nine scales became one.** `gap`, `px`, `py`, `mx`, `my`, `space-x`, `space-y`,
`width` and `height` are the same ladder written out nine times — 289 tokens
carrying 36 distinct values, a redundancy of 8×.

They are not nine facts. Which CSS property consumes a length is a **utility**
concern; the length itself is the primitive. Keeping nine copies means nine
places to disagree, and they already had:

| | steps | missing versus `px` |
| --- | --- | --- |
| `px` / `mx` | 36 | — |
| `py` / `my` | 33 | 7, 11, 14 |
| `space-x` / `space-y` | 34 | `px`, 18 |
| `width` / `height` | 24 | 1.5, 11, 28, 32, 36, 40, 44, 52, 56, 60, 64, 80 |

A designer reaching for `py-7` finds nothing, having just used `px-7`. Nobody
decided that; it is drift between copies of one scale. The single `space` ramp is
their union, so every step exists exactly once.

Same argument for radius: `rounded-tr-sm`, `rounded-bl-sm` and `rounded-br-sm`
were all missing while `rounded-tl-sm` existed twice.

---

## Notes on two judgement calls

**`radius-full` is outside the radius ramp.** `9999px` is a sentinel meaning
"round as far as it goes", not a measurement. Left inside the scale it reads as
the top step, and anything interpolating or sorting the ramp produces nonsense.

**`container` and `screen` are separate groups** even though both contain 768 and
1280. A breakpoint answers a viewport question; a container max-width answers a
content one. They coincide today; merging them asserts they always will.

**Units.** `rem` for anything that should scale with reader text size — space,
radius, font size, containers. `px` for border widths, blur radii and
breakpoints, where scaling with text size would be wrong: a 1px hairline that
grows is a bar, and a breakpoint is a property of the viewport.

---

## Two things left as-is, deliberately

**`line-height` steps are absolute lengths** (12px … 40px), so they do not scale
with the size they are applied to. That is what the export said and what Tailwind
does, but it is a trap worth knowing about — a unitless ratio is usually what you
want. Flagged in the token's own `$description`.

**`space` keeps Tailwind's step names**, with `.5` written `-5` (`space.0-5`) so
the name survives a dot-delimited token path. The numbers are not proportional to
anything above `4`, which is Tailwind's convention rather than a scale anyone
would design; renaming them would have made the mapping back to `gap-6` guesswork.

---

## If you are in Xforge

**This is a transcription, not a proposal.** Dropping it into
`packages/design/tokens.json` would fail at the door, and correctly:

- **36 space steps against this repository's 9.** The point of nine is that a
  spacing decision has nine possible answers. Thirty-six is the Tailwind scale,
  which is a menu, not a system.
- **Four steps are off the 4px grid** — `0-5` (2px), `1-5` (6px), `2-5` (10px),
  `3-5` (14px) — plus `px` (1px). See [docs/spacing.md](../../../../docs/spacing.md)
  for which off-grid values this system admits and why these are not among them.
- **These are primitives with no semantic layer.** `ALLOWED_EDGES` refuses a
  component that reaches a primitive directly, so every one of these would need a
  role before anything could consume it.
- **`screen` conflicts with the breakpoint decision already made.** 640/768/1024/
  1280/1536 are the Tailwind numbers `tokens.json` explicitly rejected in favour
  of Material 3's 600/840/1200/1600.

Useful as a reference for what shadcn's Figma library actually contains. Not
useful as an input.
