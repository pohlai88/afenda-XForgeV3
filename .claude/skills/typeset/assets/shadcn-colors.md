# shadcn/ui colour primitives — what changed from the export

Companion to `shadcn-colors.tokens.json`. **244 tokens: 22 ramps × 11 steps, plus
black and white.** Every departure from the Figma export is listed here.

A primitive names a value and no role. Nothing in that file says what a colour is
*for* — that is the semantic layer's job, and it is not in this repository's copy
of the palette because shadcn's semantic layer lives in
[`shadcn-theme.css`](shadcn-theme.css).

---

## Removed

| Removed | Why |
| --- | --- |
| Every `$extensions` block | `com.figma.variableId`, `com.figma.scopes`, `com.figma.modeName`. Editor state |
| The `components` / `alpha` / `colorSpace` object | Redundant **and lossy** — see below |

**The float encoding carried less precision than the hex it sat beside.** Each
token shipped both `hex: "#F8FAFC"` and `components: [0.9725490212440491, …]`.
Those components are not more precise; they are a **float32 round-trip** of the
same 8-bit value:

```
248 / 255 = 0.9725490196078431   exact
            0.9725490212440491   as exported
```

So the object form is strictly worse than the hex: same information, plus
rounding error, at roughly eight times the bytes. The hex is kept and the object
dropped. (If you need wide-gamut colour later, that is a re-derivation from a
different source, not a recovery from these floats.)

---

## Corrected

**`lime.950` was `#111111`.** That is a pure neutral grey — measured saturation
**0.0%** — sitting at the bottom of a chromatic ramp. Every other 950 in the file
is a dark version of its own hue. Corrected to `#1a2e05`, Tailwind's value, which
sits at hue 89° against `lime.900`'s 88° and continues the ramp's luminance
descent.

It was the only defect found. Three checks ran across all 22 ramps:

| Check | Result |
| --- | --- |
| No achromatic step inside a chromatic ramp | 1 finding — `lime.950`, corrected |
| Luminance decreases monotonically 50 → 950 | **every ramp passes** |
| Hue drifts less than 40° within a ramp | **every ramp passes** |

---

## Not changed

**`zinc.50` and `neutral.50` are both `#FAFAFA`.** Flagged by the duplicate check
and deliberately left alone: both are Tailwind's real values, and two ramps
sharing one step is a fact about the palette, not an error in the export. It is
the only collision in 244 tokens.

---

## Added: which step is safe for text

Not in the export, and the thing most likely to be got wrong. **The lightest step
in each ramp that clears WCAG AA (4.5:1) as text on white:**

| Step | Ramps |
| --- | --- |
| **500** | slate, gray, zinc, neutral, stone — *the neutrals only* |
| **600** | red, blue, indigo, violet, purple, fuchsia, pink, rose |
| **700** | orange, amber, yellow, lime, green, emerald, teal, cyan, sky |

**No chromatic ramp clears 4.5:1 at step 500.** That matters because 500 is the
step people reach for as "the brand colour" — `red-500` on white is 3.76:1, and
`amber-500` is 2.15:1. Both fail as text, and amber fails the 3:1 non-text floor
too.

The pattern is not arbitrary: the warmer and greener the hue, the higher its
luminance at a given step, so the more steps it needs before it is dark enough to
read. Yellow-through-sky all need 700.

On black, subtract one step: what clears 4.5:1 as text on a dark ground is 400
for the neutrals, 500 or 600 for the rest. The per-ramp figures are in the table
this was generated from — rerun the check rather than trusting a summary if a
specific pair matters.

This is orientation, not permission. **Contrast is a property of a pair, not of a
colour**, and a primitive has no idea what it will sit on.

---

## If you are in Xforge

**Reference only.** Two structural reasons, before any question of taste:

**Primitives here carry no role, and nothing may consume them.**
`stylesheet-names-roles-not-primitives` refuses every `var()` in
`packages/design/src/**.css` that does not name a semantic or component token, and
`ALLOWED_EDGES` refuses a component token that reaches a primitive. A 244-token
palette with no semantic layer is 244 tokens nothing can use.

**The colour policy would reject most of it on import.** `COLOR_ROLE_POLICIES`
requires every colour role to declare what it measures against and clear its
floor *in every mode*; `DISTINCT_PAIRS` requires the status roles to stay ≥3.0
CIEDE2000 apart. These primitives declare nothing — correctly, since that is what
being a primitive means — so each one would need a role, a policy entry and a
proven pair before it could exist here.

The repository's own palette is 8 ramps and 56 steps against this file's 22 and
244, and the gap is the point: a step nothing references is weight, and every
step here that got a role had to earn it by clearing a contrast floor.

Useful for **checking a value** — "what is Tailwind's `blue-700`" — and for the
AA table above, which applies to any project using this palette.

---

## Related

- [`shadcn-theme.css`](shadcn-theme.css) — the semantic layer these feed, with its
  own measured contrast audit
- [`../../../../.human-plans-file/colour-notes-triage.md`](../../../../.human-plans-file/colour-notes-triage.md)
  — why ΔE against a standard observer is the wrong instrument for status colours
