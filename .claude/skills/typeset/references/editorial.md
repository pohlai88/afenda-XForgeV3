# Editorial style and the stylesheet

Read this when the content has footnotes, abbreviations, numeric tables,
strikethrough or definition lists — or when someone asks the stylesheet to
enforce a writing standard, which it cannot.

**A style guide governs the copy. A stylesheet governs the marks that copy
produces.** That is the whole relationship, and confusing the two produces both
a stylesheet that tries to police prose and a document whose real typographic
bugs go unfound.

---

## What is actually retrievable about AP style

Recorded so nobody repeats the search.

- **`apstylebook.com` is not fetchable.** The Stylebook is a paid subscription
  product; the primary source is unavailable to an agent. Everything below is
  from secondary sources and is marked as such.
- **context7 is a trap here.** Resolving "AP Stylebook" returns
  `/websites/apistylebook_design` — **"API Stylebook"**, a collection of REST API
  design guidelines. A near-identical name for an entirely unrelated thing, with
  High source reputation and 715 snippets, so it looks like a hit. An agent that
  took it would load API conventions believing it had editorial rules. context7
  indexes code libraries; a writing standard is not one.

Sources used: [PR Daily on AP dashes](https://www.prdaily.com/dashes-hyphens-ap-style/),
[Kent State AP Style Essentials](https://human.libretexts.org/Courses/Kent_State_University/Reporting_and_Writing_with_the_Audience_in_Mind/21:_AP_Style_Essentials/21.01:_AP_Style_Essentials),
[UDel AP cheat sheet](https://www.udel.edu/students/studentlife/communications/content-marketing/ap-style-cheat-sheet/).
Retrieved 2026-09-02.

---

## The three AP rules that reach the rendering layer

**1. Figures for 10 and above.** So prose and tables carry numerals as a matter
of course. In a proportional face the `1` is narrower than the `8`, so a numeric
column does not align and cannot be scanned down. `font-variant-numeric:
tabular-nums` on `table` is the fix, and it is inert on a face with no tabular
set — nothing to lose by stating it.

**2. Em dashes are spaced on both sides; AP uses no en dashes at all.** A range
is `1995 to 2005` or a hyphen, never `1995–2005`. **This one CSS cannot help
with, and it is the finding worth carrying away:** markdown "typographer"
extensions — SmartyPants, `remark-smartypants`, markdown-it's `typographer: true`
— convert `--` to an en dash automatically. A project writing AP copy through a
renderer with that flag on is producing a mark its own style guide forbids, and
no stylesheet rule can see it.

> If the content follows AP, check the renderer's typographer setting before
> blaming the stylesheet for a dash that looks wrong.

**3. Commas and periods go inside quotation marks.** A punctuation-placement rule,
so purely editorial — but it implies *curly* quotes, which is the same renderer
flag as the dash conversion. One setting decides both.

**Everything else in AP — capitalization, abbreviation, attribution, titles — is
copy.** No stylesheet rule should try to reach it, and the one CSS mechanism that
appears to (`text-transform`) is the wrong answer: it changes what is displayed
without changing what is written, so the copy and the page disagree and a
non-Latin script gets nothing. This repository already refuses it by guard —
`case-lives-in-the-copy` — and an editorial standard and a build guard landing on
the same rule from opposite directions is worth noticing.

---

## What auditing for those marks actually turned up

Checking which elements a CommonMark + GFM renderer can emit against which
`assets/shadcn-typography.css` styled found **eleven unstyled inline elements**,
three of them real bugs rather than omissions.

| Element | Emitted by | Was | Now |
| --- | --- | --- | --- |
| `sup` / `sub` | GFM footnotes | **Line-box bug** — see below | `line-height: 0` + relative offset |
| `mark` | `==highlight==` extensions | **Dark-mode bug** — browser yellow with inherited light text | `--muted` background, `color: inherit` |
| `table` numerals | any numeric table | **Misaligned digits** | `tabular-nums` |
| `dt` / `dd` | definition lists | `dl` had flow spacing, terms and definitions were indistinguishable | weight on `dt`, indent on `dd` |
| `del` / `s` | GFM `~~strike~~` | unstyled | muted foreground |
| `ins` | `<ins>` | unstyled — default underline reads as a link | link-matching underline offset |
| `abbr[title]` | `*[HTML]:` extensions | browsers disagree on the default | dotted underline, help cursor |
| `small`, `cite` | inline HTML | unstyled | sized / italic |
| `li > input` | GFM task lists | collided with the marker it replaces | spaced, aligned |

**The `sup` bug is the one worth understanding**, because it is invisible in
review and markdown produces it constantly. A default `vertical-align: super`
raises the glyph *while it keeps its own line-height*, so the line box grows. One
paragraph in a document then sits taller than its neighbours for the single
reason that it cites something. It reads as "the spacing is slightly off here"
and never as a cause. `line-height: 0` on the raised element is the entire fix.

**`text-wrap: pretty` was added to body paragraphs** at the same time — it
prevents a single word stranded on a paragraph's last line. Headings keep
`balance`, which is the right algorithm for two or three lines; `pretty` is the
one for running text.

---

## Applying this to a different style guide

AP is one house standard among several, and the substitution is mechanical. Ask
three questions of whichever one governs the copy:

1. **Does it produce numerals in running text or tables?** Almost all do →
   tabular figures.
2. **Which dash and quote forms does it mandate?** → this is a *renderer*
   setting, not a stylesheet rule. Chicago uses en dashes for ranges and closed-up
   em dashes; AP uses neither. The same typographer flag that satisfies one
   violates the other.
3. **Does it use footnotes, abbreviations or defined terms?** → `sup`, `abbr`,
   `dl` need to exist in the stylesheet, and by default they do not.

What no style guide changes: the container model, the three controls, and the
append-stability rules. Editorial standards decide *which marks appear*; they
never decide how the container is built.
