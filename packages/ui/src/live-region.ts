/**
 * How a live region announces.
 *
 * ONE PAIR, NEVER TWO INDEPENDENT CHOICES. `Alert` derived `aria-live` and
 * `role` from `tone` in two separate ternaries -- two derivations of one fact,
 * and the failure mode is not hypothetical: edit one and not the other and the
 * region ships `role="alert"` with `aria-live="polite"`, a combination that
 * contradicts itself and that no reviewer would notice in a diff touching one
 * line. Pairing them makes it unwritable.
 *
 * ITS OWN MODULE, and deliberately a tiny one. The obvious home was
 * `contracts.ts`, which already owns the `live-region` profile -- but `index.tsx`
 * would then import the whole contract registry to render an Alert, and this
 * repository measures per-route bundles. A rendering constant does not get to
 * drag the vocabulary in behind it.
 *
 * NO JSX HERE either, so a Playwright spec can import it without pulling React
 * and the component tree into its module graph.
 */

/**
 * The politeness levels, each with the role that must accompany it.
 *
 * The pairing is W3C's, not this repository's: `role="alert"` carries an
 * implicit `aria-live="assertive"` and `role="status"` an implicit `polite`, so
 * writing them across each other produces an element whose declared urgency
 * disagrees with its role's own semantics.
 */
export const ANNOUNCEMENT = {
  assertive: { ariaLive: 'assertive', role: 'alert' },
  polite: { ariaLive: 'polite', role: 'status' },
} as const

export type Announcement = keyof typeof ANNOUNCEMENT

/**
 * Which announcement each Alert tone uses -- the rule, in one place.
 *
 * `danger` and `warning` interrupt because something needs attention now: a
 * failed load, a rejected write. `info` does not, so a status message never cuts
 * across what a screen-reader user is already reading.
 *
 * That rule was previously stated in the Alert contract's comment, in the
 * component's doc comment, and twice in the component's markup -- four
 * statements of one fact, two of them executable and independently derived. A
 * conformance test asserting the mapping would have been the fifth, which is why
 * the test calls this instead.
 *
 * A FULLER VERSION belongs in the contract itself, so the generated schema and
 * a metadata renderer could read it. That is recorded as undecided in
 * `project-state.md`: it costs schema and guard work, and this obligation does
 * not need it to stop the fact having four owners.
 */
export const TONE_ANNOUNCEMENT = {
  danger: 'assertive',
  info: 'polite',
  warning: 'assertive',
} as const satisfies Record<string, Announcement>
