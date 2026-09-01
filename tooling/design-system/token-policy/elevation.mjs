import { COLOR_ROLE_POLICIES } from './color.mjs'
import { deepFreeze } from './freeze.mjs'

/**
 * ELEVATION POLICY -- how a layer is separated from the one beneath it.
 *
 * LAYER IS STRUCTURE; SHADOW IS ONE EXPRESSION OF IT. The two get equated
 * casually -- "layer three, therefore a bigger shadow" -- and that is consumer
 * software thinking. This is a data tool read for hours at a time, so the order
 * of preference is deliberately inverted from the fashionable one:
 *
 *   spacing  ->  surface contrast  ->  boundary  ->  scrim  ->  shadow
 *
 * A SHADOW MAY NEVER BE THE ONLY MEANS, and this is the rule the whole domain
 * exists to state. Windows High Contrast and `forced-colors: active` discard
 * `box-shadow` outright, so a dialog separated from the page by shadow alone is,
 * for those readers, not separated at all -- it is content floating in other
 * content. The same is true of anyone whose display makes a soft gradient
 * invisible. A shadow may reinforce a boundary; it may not be the boundary.
 *
 * WHAT THIS GOVERNS TODAY, honestly: the stylesheet contains no `box-shadow` and
 * no `z-index`. The Dialog is separated by a scrim over a raised surface, and the
 * Card by surface contrast plus a border. So this policy RATIFIES what already
 * ships rather than changing it.
 *
 * AND IT ENFORCES NOTHING ABOUT A STYLESHEET. This paragraph used to claim that
 * "the first shadow anyone reaches for now has to arrive beside another means",
 * which is not true and was never true: `assertElevationLayers` validates the
 * TABLE BELOW and nothing else. No elevation code reads a `.css` file. Two
 * unrelated mechanisms are what actually refuse a shadow today --
 *
 *   guards/index.mjs   rejects any `box-shadow` value that is not a keyword,
 *                      scoped to packages/ui/**.css. A hardcoded-literal rule:
 *                      shadows are refused for having no TOKEN, not for being a
 *                      sole means.
 *   values.mjs         has no `shadow` value shape, so a shadow token cannot
 *                      exist to satisfy that guard in the first place.
 *
 * -- and the exit from both is the same edit. Add a shadow `$type` and a token,
 * write `box-shadow: var(--semantic-shadow-raised)`, and the literal guard passes
 * it. At that moment this rule becomes the only one standing, and it is the one
 * that does not run. The rule fires exactly when it stops being enforced by
 * accident.
 *
 * NO STYLESHEET GUARD IS PROPOSED. Nothing renders a shadow, so enforcement for a
 * means nobody uses is infrastructure ahead of a measured pain (law 30). What is
 * written down instead is the condition: the day `SUPPORTED_VALUE_SHAPES` grows a
 * shadow entry is the day this needs a consumer, and that is the commit to say so
 * in.
 */

/**
 * The closed set of ways one layer is told apart from another.
 *
 * `shadow` is a member so that it can be USED, and refused as a sole means. A
 * set that simply omitted it would leave the rule unstated and the next author
 * free to invent it.
 *
 * `spacing` is a member for a different reason and it is worth separating them:
 * no layer names it. It heads the preference order above because separation by
 * distance survives everything and costs nothing, and it is admitted ahead of use
 * so that reaching for it is not a policy edit. `shadow` is present to be
 * refused; `spacing` is present to be reached for. Only the SHADOW rule of that
 * ordering is enforced -- the rest is a stated preference, not a check.
 */
export const SEPARATION_MEANS = deepFreeze(['boundary', 'scrim', 'shadow', 'spacing', 'surface'])

/**
 * Means that do NOT survive forced-colors and low-contrast displays alone.
 *
 * THE FRAGILE SET IS THE DECLARED ONE, and robustness is what remains. It was the
 * other way round -- a hand-written `ROBUST_MEANS` listing the four survivors --
 * which put one fact in two lists with nothing comparing them. Adding a means to
 * `SEPARATION_MEANS` and forgetting the other list would refuse a layer as
 * fragile while telling it forced-colors discards something it does not, and a
 * typo (`'boundry'`) would quietly demote a real means.
 *
 * Declaring the fragile side also puts the failure in the safe direction. A typo
 * HERE leaves the mistyped means out of the fragile set, so `shadow` becomes
 * robust and a shadow-only layer passes -- the module's central rule, failing
 * open. That is why the set is checked against `SEPARATION_MEANS` below rather
 * than trusted.
 */
const FRAGILE_MEANS = deepFreeze(['shadow'])

const ROBUST_MEANS = deepFreeze(SEPARATION_MEANS.filter((means) => !FRAGILE_MEANS.includes(means)))

/**
 * The layers this product actually renders, and what separates each.
 *
 * Three, not five. Carbon runs a deeper ladder because it dresses a much wider
 * surface area; here a fourth layer would be a level nothing occupies, and an
 * elevation nobody renders is exactly the fabricated relationship the colour
 * policy refuses next door.
 */
export const ELEVATION_LAYERS = deepFreeze({
  base: {
    rank: 0,
    reason: 'the page itself, which nothing sits beneath',
    separatedBy: [],
    surface: 'surface.page',
  },
  overlay: {
    rank: 2,
    reason: 'a dialog, which must read as interrupting the page rather than joining it',
    // The scrim is what does the work, and it is a colour role rather than an
    // effect -- so a theme rebinds it and forced-colors still renders it.
    //
    // WHAT PUTS IT ON TOP IS DOM ORDER, NOT A NUMBER. `rank` above is this
    // model's vocabulary for "further from the page"; it is not a z-index and
    // does not become one. The product has exactly two positioned elements,
    // `.xf-dialog-backdrop` and `.xf-dialog`, both inside ONE Base UI portal with
    // the backdrop rendered first -- so the popup paints above it because of
    // where it sits in the tree, and there is no `z-index` anywhere in
    // `packages` or `apps`. `tokens.test.ts` holds that premise, because a
    // sentence claiming an absence goes wrong quietly.
    //
    // That is source order deciding a visual result, which `tokens.mjs` calls
    // "source order masquerading as architecture" about mode blocks -- and here
    // it is the RIGHT mechanism, because one portal with two siblings has an
    // order the tree states. The two cases look identical and only one is a
    // defect, which is why this is written down rather than assumed.
    //
    // A SECOND PORTALLED LAYER IS WHAT ENDS IT. Two portals mounted
    // independently stack by mount order, which nobody chose. That is when an
    // explicit order earns itself -- and not before: a z-index ladder for one
    // dialog is the same reflex as a shadow ladder, which this file opens by
    // refusing. The Dialog is portalled rather than in the browser's top layer;
    // if it ever moves there, the backdrop becomes `::backdrop` and this note is
    // obsolete rather than merely stale.
    separatedBy: ['scrim', 'surface'],
    surface: 'surface.overlay',
  },
  raised: {
    rank: 1,
    reason: 'a card, which groups content without leaving the page',
    separatedBy: ['boundary', 'surface'],
    surface: 'surface.raised',
  },
  sunken: {
    rank: -1,
    reason: 'a recessed well -- code blocks, empty states -- reading as beneath the page',
    separatedBy: ['surface'],
    surface: 'surface.sunken',
  },
})

/**
 * A means that is not an effect but a painted role, and the role that paints it.
 *
 * Only `scrim` today. `boundary` is rendered by a border role too, but WHICH one
 * depends on the layer -- so it is a per-layer fact this table cannot hold, and
 * inventing an entry for it would be a mapping that is wrong more often than
 * right. One entry, stated where it is true.
 */
const MEANS_PAINTED_BY_ROLE = deepFreeze({ scrim: 'overlay.scrim' })

/** The elevation table's own rules. */
export function assertElevationLayers(layers = ELEVATION_LAYERS, roles = COLOR_ROLE_POLICIES) {
  // The fragile set decides the module's central rule, so it is checked before
  // anything is judged against it. A means here that is not a declared means
  // makes nothing fragile, and a shadow-only layer would pass.
  for (const means of FRAGILE_MEANS) {
    if (!SEPARATION_MEANS.includes(means)) {
      throw new Error(
        `'${means}' is named as fragile but is not one of ${SEPARATION_MEANS.join(', ')} -- ` +
          'it excludes nothing from the robust set, so the means it was meant to disqualify ' +
          'now counts as sufficient on its own',
      )
    }
  }

  if (Object.keys(layers).length === 0) {
    throw new Error(
      'the elevation model was proven over zero layers -- every rule below is about a layer, ' +
        'so an empty table satisfies all of them and reports a model that does not exist',
    )
  }

  const ranks = new Set()

  for (const [layer, policy] of Object.entries(layers)) {
    if (ranks.has(policy.rank)) {
      throw new Error(
        `elevation layer '${layer}' shares rank ${policy.rank} with another -- two layers at ` +
          'one rank have no order, so neither is above the other',
      )
    }
    ranks.add(policy.rank)

    // CROSSES INTO THE COLOUR DOMAIN ON PURPOSE. A layer names the surface it
    // paints with, and a surface that no colour policy governs would be a layer
    // whose contrast nothing measures.
    if (!roles[policy.surface]) {
      throw new Error(
        `elevation layer '${layer}' paints with '${policy.surface}', which has no colour ` +
          'policy -- a layer on an ungoverned surface is one whose contrast nothing measures',
      )
    }

    if (typeof policy.reason !== 'string' || policy.reason.trim() === '') {
      throw new Error(`elevation layer '${layer}' must say what renders there`)
    }

    for (const means of policy.separatedBy) {
      if (!SEPARATION_MEANS.includes(means)) {
        throw new Error(
          `elevation layer '${layer}' is separated by '${means}', which is not one of ` +
            `${SEPARATION_MEANS.join(', ')}`,
        )
      }
      // The same crossing as `surface:` above, one field further. A means that is
      // a painted role rather than an effect is only robust BECAUSE a role paints
      // it -- that is the argument for the scrim, and it stops being true the
      // moment the role is gone.
      const painter = MEANS_PAINTED_BY_ROLE[means]
      if (painter !== undefined && !roles[painter]) {
        throw new Error(
          `elevation layer '${layer}' is separated by '${means}', which is painted by the ` +
            `colour role '${painter}' -- and that role does not exist, so the separation ` +
            'this layer counts as robust is rendered by nothing',
        )
      }
    }

    if (policy.rank === 0) {
      if (policy.separatedBy.length > 0) {
        throw new Error(
          `elevation layer '${layer}' is rank 0 and names a separation -- there is nothing ` +
            'beneath it to be separated from',
        )
      }
      continue
    }

    if (policy.separatedBy.length === 0) {
      throw new Error(
        `elevation layer '${layer}' names no separation -- a layer indistinguishable from the ` +
          'one beneath it is not a layer, it is a claim',
      )
    }

    if (!policy.separatedBy.some((means) => ROBUST_MEANS.includes(means))) {
      throw new Error(
        `elevation layer '${layer}' is separated only by ${policy.separatedBy.join(' and ')} -- ` +
          'forced-colors mode discards box-shadow, so for those readers this layer would not be ' +
          'separated at all. A shadow may reinforce a boundary; it may not be the boundary',
      )
    }
  }

  // A STACK NEEDS A FLOOR. Rank uniqueness was checked and rank EXISTENCE was
  // not, so a table with no rank 0 passed: the `rank === 0` branch simply never
  // fired, every remaining layer needed a separation and had one, and nothing
  // observed that there was no page for any of them to be separated from.
  if (!ranks.has(0)) {
    throw new Error(
      `no elevation layer is at rank 0 -- the ranks declared are ${[...ranks].sort((a, b) => a - b).join(', ')}, ` +
        'and every one of them describes sitting above or below a ground that nothing defines',
    )
  }
}
