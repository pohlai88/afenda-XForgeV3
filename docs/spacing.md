# Spacing and the 4px grid

How to choose a spacing value at a call site, and what the grid does and does not
govern.

**This is the practice guide, not the authority.** The values live in
`packages/design/tokens.json`; the reasoning behind the roles and the density
axis is `tooling/design-system/POLICY.md` §3c; the generated table is
`packages/design/generated/FOUNDATIONS.md`. None of them is restated here. Where
this file and POLICY.md appear to disagree, POLICY.md wins and this file is the
defect.

Measured against the token set on 2026-09-02.

---

## The grid is soft, and that is a choice

Two conventions exist. A **hard grid** confines every measurement to 8px. A
**soft grid** requires multiples of 4, and reaches for 8 where it can.

This system is soft, and the evidence is in the tokens rather than in a
statement: default icon size is 20px, `snug` is 12px, `control-x` is 12px. All
are multiples of 4 and none is a multiple of 8. A hard-grid system could not
contain them.

The reason to be soft is that 8px is too coarse for the inside of a control. The
gap between an icon and its label wants 8px; the padding around them wants 12px;
forcing that to 8 or 16 makes the control either cramped or puffy, and there is
nothing between. Four gives one more step exactly where the decisions are
tightest, and stays coarse enough that the vertical rhythm still reads.

Where it costs nothing, prefer 8. The control ladder is 32 / 40 / 48 across the
three densities — every step a multiple of 8 — because a control's height is what
neighbouring rows align against, and that is precisely where the coarser grid
earns its keep.

---

## What the grid governs, and what it does not

Every dimension token was checked in every density mode. **Fifty-six tokens,
three modes, and every spacing, sizing and radius value lands on the 4px grid.**

Seven values do not, and all seven are the same three kinds of thing:

| Token | Value | Why it is exempt |
| --- | --- | --- |
| `size.border`, `semantic.size.stroke` | 1px | A hairline is a device-pixel rule, not a distance. Rounding it to 4 makes it a bar |
| `size.focus-ring`, `semantic.size.ring` | 2px | Focus indicator thickness. A 4px ring is not more visible, it is fatter, and it starts covering the control it marks |
| `size.focus-offset`, `semantic.size.ring-offset` | 2px | The gap that keeps the ring off the border it surrounds |
| `size.text-sm` | 14px | A type size. Type is governed by its own scale and its own hierarchy proof |

The pattern: **the grid governs distances between things and the size of things.
It does not govern the thickness of lines, or type.** A rule that claimed those
would either force 1px borders to 4px or need an exemption list, and an
exemption list that long is its own authority.

State this when adding a token. A new value off the 4px grid is either one of
these three kinds, or it is a mistake.

---

## Choosing a value

The roles are named for the **relationship** between two things, not for how far
apart they sit. So the question at the call site is not "how much space" — it is
"how strongly do these belong together". Answer that and the value follows.

| If the two things are… | Use |
| --- | --- |
| parts of one thing — a label and its helper text | `related` |
| strongly associated — an icon and its label | `tight` |
| inside one compact component | `snug` |
| separate components | `normal` |
| separate groups of components | `loose` |
| separate sections of a page | `section` |

Two rules make this work:

**Never reach past the role for the number.** If `normal` looks slightly wrong,
the relationship is probably not "between components" — find the role that
describes it. Reaching for a raw value is how the roles stop meaning anything,
and `no-bespoke-styling` refuses it in a screen for that reason.

**Do not use every value the grid permits.** 124px and 128px both sit on the 4px
grid and neither is available, because a system whose values are "anything
divisible by four" has not reduced anything. Six roles is the entire spacing
vocabulary for layout. That is the point of it.

---

## Density, which a flat scale cannot have

The roles are rebound by density: compact, default and comfortable produce
different geometry from the same component code. A value written as a number
cannot participate — `gap-4` is 16px in every mode forever.

Two roles are deliberately **not** rebound: `space.section` and
`space.container`. The page frame holds still while the components inside it
compress, so switching to compact packs information without reflowing the layout
around it.

This is the practical reason the roles exist at all. It is not a naming
preference — a component bound to a number is a component that silently opts out
of a mode the generator proves in every check.

---

## When something will not fit

It happens, and it is not a failure. A control containing text will sometimes
land between steps because the text's line box decides its height, and forcing
the outcome onto the grid means shipping a control that is slightly wrong to
satisfy a rule about numbers.

The discipline is narrower than "everything is divisible by four":

- **Spacing you author** — gaps, padding, margins — comes from a role, always.
- **Sizes that resolve from content** — a control that grows to fit its label,
  a cell that fits its longest value — land where they land. `h-control` is a
  `min-block-size` for exactly this reason: it is a floor, and a floor that
  clips is not a floor.

If a value has to be off-grid and is not a hairline, a focus ring, or type, that
is worth a sentence in the commit explaining which of the two categories above it
falls into.

---

## Recorded: an error in the source guidance

The design note this file derives from illustrates "not everything aligns with
the grid" with a button ladder — 36px, 40px and 44px — and says *"the 44px and
36px buttons doesn't strictly adhere to the grid"*.

That is arithmetically wrong. 36 ÷ 4 = 9, 40 ÷ 4 = 10, 44 ÷ 4 = 11. **All three
are on the 4px grid.** They are off the *8px* grid, which is almost certainly
what was meant, but the section it appears in is about the 4px soft grid it has
just finished recommending.

The genuinely off-grid value is in the same example and goes unmentioned: the
default button's **10px padding**. 10 is not a multiple of 4, and it is the one
number there that breaks the rule the example exists to illustrate.

Recorded because the example is memorable and the arithmetic is not, and because
"buttons are allowed off the grid" is the kind of licence that gets quoted later.
The right lesson from that example is the opposite one: a ladder of 36/40/44 is
what you get when control heights are chosen on a 4px grid, and 32/40/48 — this
system's ladder — is what you get when they are chosen on an 8px one.

---

## Not adopted

The source recommends setting Figma's **Big nudge** to 8px so `Shift` + arrow
moves in grid steps. Sound advice for anyone designing in Figma, and nothing to
implement here — recorded so its absence is a decision rather than an oversight.

---

## Related

- `tooling/design-system/POLICY.md` §3c — spacing, density and the argument for
  relationship names. The authority.
- `packages/design/generated/FOUNDATIONS.md` — every token and its value.
  Generated; never hand-edited.
- [docs/icons.md](icons.md) — icon sizing, which is on the same density axis.
