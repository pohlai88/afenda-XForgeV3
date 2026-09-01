/**
 * The part of a tone that survives greyscale.
 *
 * WHAT WAS ACTUALLY WRONG. An Alert's tone reached the reader through colour and
 * nothing else. `danger` and `success` differed by hue alone -- the exact pair
 * red/green deficiency collapses -- and `warning` and `info` differed from both
 * by hue alone too. Print it in greyscale, or hand it to roughly one man in
 * twelve, and four tones become one beige banner.
 *
 * THE DEFENCE WAS A SENTENCE. Two comments in this package said the copy carries
 * the meaning, which is true when the author writes "Payroll run failed" and
 * false when they write "Cannot continue" -- and nothing anywhere executes the
 * difference. `09-xforge.md` names this precisely: colour carrying meaning alone
 * is uncovered by every automated check in the repository. A cue the COMPONENT
 * renders is the only version of that rule a component can be held to.
 *
 * DRAWN, NOT TYPED, which is the same decision `.xf-checkbox-mark` records: a
 * glyph character is one the font may not have and one a screen reader may read
 * aloud, so the tone would arrive twice for one reader and not at all for
 * another. These are paths. The `<svg>` is `aria-hidden`, because `role` and
 * `aria-live` already carry urgency to a screen reader and the text carries the
 * rest -- a second announcement of the same fact is noise, not redundancy.
 *
 * NO COLOUR HERE. The mark paints in `currentColor`, so it inherits
 * `--semantic-text-<tone>` and lands on `--semantic-surface-<tone>`: a pair the
 * token generator already measures at 4.5:1 for every tone in both themes.
 * Giving the mark a fill of its own would have created the first foreground in
 * this system whose contrast nothing checks.
 *
 * ITS OWN MODULE, for `live-region.ts`'s reason rather than a new one: a spec
 * that wants to assert the mapping should not have to import React and the
 * component tree to read it.
 */

/**
 * One filled path per tone, on a 24x24 grid, with the glyph knocked out of the
 * body by `fill-rule="evenodd"`.
 *
 * OUTER SILHOUETTE CARRIES AS MUCH AS THE GLYPH. `warning` is a triangle and the
 * other three are discs, so the tone that means "look before you act" is
 * distinguishable at a size where an inner glyph is a smudge. The remaining
 * three separate on a cross, a tick and a bar -- shapes, not hues.
 */
const DISC = 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z'

export const TONE_MARK = {
  /** A cross. */
  danger: `${DISC}M15.85 8.93 15.07 8.15 12 11.22 8.93 8.15 8.15 8.93 11.22 12 8.15 15.07 8.93 15.85 12 12.78 15.07 15.85 15.85 15.07 12.78 12Z`,
  /** A bar and a dot, upright: the lowercase informational i. */
  info: `${DISC}M11 6h2v2.4h-2ZM11 10.4h2V18h-2Z`,
  /** A tick. */
  success: `${DISC}M9.9 14.3 7.4 11.8 6.55 12.65 9.9 16 17.1 8.8 16.25 7.95Z`,
  /** A triangle around an exclamation -- the one silhouette that is not a disc. */
  warning: 'M12 3 22 20H2ZM11 9h2v5.5h-2ZM11 16h2v2h-2Z',
} as const satisfies Record<string, string>
