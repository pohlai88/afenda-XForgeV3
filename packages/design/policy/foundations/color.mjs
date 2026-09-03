/**
 * FOUNDATION — reference palette. Tonal infrastructure, never component API.
 *
 * ── PURPOSE ─────────────────────────────────────────────────────────────────
 *
 * Material 3 gets one thing exactly right for a system like Afenda: semantic
 * colour roles should not own arbitrary literal colours. They should resolve
 * through a stable tonal reference layer that can be rebound for light/dark
 * appearance without changing component semantics.
 *
 * Afenda does NOT adopt Material's public `primary / secondary / tertiary`
 * palette vocabulary wholesale. The families here are the chromatic domains the
 * product actually needs:
 *
 *   neutral          page/text/surface backbone
 *   neutral-variant  boundaries, fields and recessed structure
 *   brand            agency / primary action
 *   secondary        secondary interaction
 *   destructive      destructive action
 *   error            failed state
 *   success          successful state
 *   warning          caution
 *   info             informational state
 *   statutory        regulatory / legal fact
 *
 * The tone ladder follows the useful Material reference cadence:
 *
 *   0 10 20 30 40 50 60 70 80 90 95 99 100
 *
 * THESE NUMBERS ARE FOUNDATION-ONLY. A component may ask for `primary`,
 * `success`, `card`, `muted`, etc. It must never ask for `brand.40` or
 * `neutral.95`. Raw tone access in application code would turn a governed
 * semantic system back into a colour picker.
 *
 * ── VALUES LIVE ELSEWHERE ───────────────────────────────────────────────────
 *
 * This file governs family and tone SHAPE, not literal hex values. Literal
 * colours belong in the token registry, which remains the single source of
 * truth. That avoids copying Afenda's palette into policy and having two colour
 * authorities that agree only until one changes.
 */

import { definePolicy } from '../define-policy.mjs'
import { ACCESSIBILITY_POLICY } from '../interaction/accessibility.mjs'
import { assertLifecycle, assertTokenPath, deepFreeze, HEX } from '../vocabulary.mjs'

export const REFERENCE_TONES = deepFreeze([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100])

export const PALETTE_FAMILY_KINDS = deepFreeze({
  action: {
    reason: 'agency colour used by interactive semantics',
  },
  neutral: {
    reason: 'structural colour whose hue is subordinate to content',
  },
  status: {
    reason: 'domain state colour whose meaning is not interaction',
  },
})

export const REFERENCE_PALETTE_FAMILIES = deepFreeze({
  brand: {
    kind: 'action',
    reason: 'governance teal -- primary agency and selected/focus emphasis',
  },
  destructive: {
    kind: 'action',
    reason: 'an irreversible or dangerous action, not an error state',
  },
  error: {
    kind: 'status',
    reason: 'a failed outcome or invalid state',
  },
  info: {
    kind: 'status',
    reason: 'an informational fact or note',
  },
  neutral: {
    kind: 'neutral',
    reason: 'page, surface and text backbone',
  },
  'neutral-variant': {
    kind: 'neutral',
    reason: 'boundaries, fields and recessed structural surfaces',
  },
  secondary: {
    kind: 'action',
    reason: 'secondary interaction without competing with primary agency',
  },
  statutory: {
    kind: 'status',
    reason: 'a regulatory or legal fact that is neither advice nor warning',
  },
  success: {
    kind: 'status',
    reason: 'a completed or successful outcome',
  },
  warning: {
    kind: 'status',
    reason: 'a caution requiring attention',
  },
})

/**
 * Select a governed subset without allowing a package to invent a palette
 * family the foundation does not understand.
 */
export function paletteFamiliesFor(names, catalogue = REFERENCE_PALETTE_FAMILIES) {
  if (!Array.isArray(names) || names.length === 0) {
    throw new Error('a reference palette must declare at least one family')
  }

  const seen = new Set()

  return deepFreeze(
    Object.fromEntries(
      names.map((name) => {
        if (seen.has(name)) {
          throw new Error(`reference palette family '${name}' is declared twice`)
        }
        seen.add(name)

        const policy = catalogue[name]
        if (!policy) {
          throw new Error(
            `no reference palette family '${name}' -- choose from ` +
              Object.keys(catalogue).sort().join(', '),
          )
        }

        return [name, policy]
      }),
    ),
  )
}

/** The family catalogue's own rules. */
export function assertPaletteFamilies(
  families = REFERENCE_PALETTE_FAMILIES,
  kinds = PALETTE_FAMILY_KINDS,
  tones = REFERENCE_TONES,
) {
  if (families === null || typeof families !== 'object' || Array.isArray(families)) {
    throw new Error('reference palette families must be an object')
  }

  if (!Array.isArray(tones) || tones.length === 0) {
    throw new Error('reference tone ladder must be a non-empty array')
  }

  const seenTones = new Set()
  let previous = Number.NEGATIVE_INFINITY

  for (const tone of tones) {
    if (!Number.isInteger(tone) || tone < 0 || tone > 100) {
      throw new Error(`reference tone '${tone}' is not an integer in [0, 100]`)
    }

    if (seenTones.has(tone)) {
      throw new Error(`reference tone '${tone}' is declared twice`)
    }

    if (tone <= previous) {
      throw new Error('reference tones must be strictly increasing')
    }

    seenTones.add(tone)
    previous = tone
  }

  if (!(seenTones.has(0) && seenTones.has(100))) {
    throw new Error('reference tone ladder must include both 0 and 100 endpoints')
  }

  for (const [family, policy] of Object.entries(families)) {
    if (!kinds[policy.kind]) {
      throw new Error(
        `reference palette family '${family}' has kind '${policy.kind}', which is not one of ` +
          Object.keys(kinds).join(', '),
      )
    }

    if (typeof policy.reason !== 'string' || policy.reason.trim() === '') {
      throw new Error(`reference palette family '${family}' must state why it exists`)
    }
  }

  return families
}

/**
 * Validate a concrete reference palette without assuming the repository's token
 * namespace.
 *
 * `values` shape:
 *
 *   Map<family, Map<tone, "#RRGGBB">>
 *
 * A migration can therefore prove a palette before deciding whether its token
 * path is `primitive.color.*`, `ref.color.*` or something else.
 */
export function assertReferencePaletteValues(
  values,
  families = REFERENCE_PALETTE_FAMILIES,
  tones = REFERENCE_TONES,
) {
  if (!(values instanceof Map)) {
    throw new Error('reference palette validation requires Map<family, Map<tone, color>>')
  }

  for (const family of Object.keys(families)) {
    const scale = values.get(family)

    if (!(scale instanceof Map)) {
      throw new Error(`reference palette family '${family}' has no tone Map`)
    }

    for (const tone of tones) {
      const value = scale.get(tone)

      if (typeof value !== 'string' || !HEX.test(value)) {
        throw new Error(
          `reference palette '${family}.${tone}' is ${JSON.stringify(value)}, which is not hex`,
        )
      }

      if (value.length === 9) {
        throw new Error(
          `reference palette '${family}.${tone}' carries alpha -- tonal primitives must be ` +
            'opaque so their luminance is stable before composition',
        )
      }
    }
  }

  return values
}

/**
 * Validate registry tokens after a project chooses its concrete token-path
 * convention. `pathFor(family, tone)` is supplied by the registry owner rather
 * than invented here.
 */
export function assertReferencePaletteTokens(
  tokens,
  pathFor,
  families = REFERENCE_PALETTE_FAMILIES,
  tones = REFERENCE_TONES,
) {
  if (!(tokens instanceof Map)) {
    throw new Error('reference palette token validation requires a Map of token paths')
  }

  if (typeof pathFor !== 'function') {
    throw new Error('reference palette token validation requires pathFor(family, tone)')
  }

  for (const family of Object.keys(families)) {
    for (const tone of tones) {
      const path = pathFor(family, tone)

      if (typeof path !== 'string' || path.trim() === '') {
        throw new Error(`pathFor('${family}', ${tone}) returned no token path`)
      }

      const token = tokens.get(path)

      if (!token) {
        throw new Error(`reference palette token '${path}' does not exist`)
      }

      if (token.type !== 'color') {
        throw new Error(`reference palette token '${path}' is a ${token.type} and must be a color`)
      }
    }
  }

  return families
}

export const palettePolicy = definePolicy({
  assert: assertPaletteFamilies,
  id: 'foundation.palette',
  kind: 'foundation',
})

/**
 * COLOUR — what a role may be painted, and what it must contrast against.
 *
 * Implements POLICY.md §3's contrast and target-size rows. Two domains in one
 * module because they are inseparable: a colour role's obligation IS its
 * contrast floor, and the floor is a WCAG number rather than a taste.
 *
 * The reasoning lives in POLICY.md; this holds the tables and the refusals.
 */

/**
 * THE ACCESSIBILITY FLOORS ARE NOT HERE, and this file is where a reader coming
 * from `minimumFor` will look for them. They are
 * `../interaction/accessibility.mjs`: a contrast ratio and a target size are
 * facts about whether a person can operate the software, not facts about colour,
 * and that module holds the criterion each floor cites alongside the three
 * levels of evidence that a floor is actually met.
 *
 * THIS FILE HELD A SECOND COPY OF THEM, and the copy is what is gone. Both
 * declared the same three ratios and the same 24px target and agreed with each
 * other, which is what a duplicated fact does right up until it stops -- the
 * defect CLAUDE.md keeps a list of. `interaction/accessibility.mjs` already
 * claimed in its own header that this file imported the floors back rather than
 * restating them; that sentence is now true.
 *
 * `assertTargetMinimum` and `assertAccessibilityPolicy` went with them. Nothing
 * here called either: the generator reaches them through the policy barrel, and
 * `minimumFor` below needs only the table.
 */

/**
 * The closed set of colour-policy kinds.
 *
 * WAS A BINARY -- measured or exempt -- with a `minimumFor` that returned 4.5 for
 * `'text'` and 3 for everything else. That is total over a string, so `kind:
 * 'txet'` silently downgraded a text role to the UI threshold and the generator
 * reported green. The set of legal kinds existed only as an else-branch.
 *
 * THREE MODES, and the third is the one that was missing:
 *
 *   measures       asserts contrast about ITSELF against something
 *   pairedAgainst  asserts nothing about itself; others measure against it
 *   exempt         asserts nothing, and nothing measures against it
 *
 * `backdrop` used to sit in the exempt list, which erased that distinction and
 * made a real hole invisible -- a surface nobody paired against was complete by
 * letter while being measured by nothing.
 */
/**
 * THE NUMBERS ARE NOT HERE ANY MORE. A measuring kind names the accessibility
 * floor it is held to, and `accessibility.mjs` says what that floor is and which
 * success criterion it answers to.
 *
 * They were inline -- `text: { measures: true, minimum: 4.5 }` -- and the twelve
 * lines arguing why `inactive` is 3 sat in this file with them. That argument is
 * an accessibility judgement, not a colour one: it is about declining a WCAG
 * exemption, and it now lives beside the criterion it declines. What stays here
 * is the question this table actually answers, which is what a role of each kind
 * PROVES.
 */
export const COLOR_POLICY_KINDS = deepFreeze({
  compositing: { exempt: true },
  decorative: { exempt: true },
  inactive: { measures: true, threshold: 'inactive' },
  // ONE SURFACE KIND, not two. `intent-surface` existed because `kind` was also
  // being asked where a role may be composed, so a status backdrop had to be a
  // different KIND from a neutral one. Composition contexts answer that question
  // instead, and the second kind dissolved: `danger.surface` and `surface.page`
  // prove exactly the same thing about themselves -- nothing -- and differ only
  // in the context they provide.
  surface: { pairedAgainst: true },
  text: { measures: true, threshold: 'text' },
  ui: { measures: true, threshold: 'ui' },
})

const KIND_MODES = ['exempt', 'measures', 'pairedAgainst']

/**
 * The kinds table's own rules -- the table that decides every threshold, and the
 * one thing here that nothing checked.
 *
 * A MEASURING KIND WITH NO MINIMUM FAILS OPEN, silently and completely. The
 * generator compares `ratio < minimum`, and `anything < undefined` is `false`,
 * so the role would be measured against every surface and pass every one of
 * them. That is worse than an unmeasured role, because the run reports the pairs
 * as checked.
 *
 * A minimum must also exceed 1: contrast ratios live in [1, 21], so a minimum of
 * 1 is a threshold every colour on earth clears, including a colour against
 * itself.
 */
export function assertColorPolicyKinds(kinds = COLOR_POLICY_KINDS) {
  for (const [kind, policy] of Object.entries(kinds)) {
    const modes = KIND_MODES.filter((mode) => policy[mode])
    if (modes.length !== 1) {
      throw new Error(
        `colour-policy kind '${kind}' declares ${modes.length === 0 ? 'no mode' : `modes ${modes.join(' and ')}`} -- ` +
          `exactly one of ${KIND_MODES.join(', ')} says what a role of this kind proves`,
      )
    }
    if (policy.measures) {
      // The RANGE check moved with the numbers: `assertAccessibilityPolicy` holds
      // every floor to (1, 21] and to the criterion it cites. What is checked
      // here is that the name resolves at all -- a kind pointing at a floor that
      // does not exist would reach `minimumFor` as `undefined`, and every ratio
      // compares false against undefined, so the role would be measured against
      // every surface and pass all of them.
      if (!(policy.threshold in ACCESSIBILITY_POLICY.contrast)) {
        throw new Error(
          `colour-policy kind '${kind}' measures contrast against threshold ` +
            `${JSON.stringify(policy.threshold)}, which is not a declared accessibility floor ` +
            `-- the floors are ${Object.keys(ACCESSIBILITY_POLICY.contrast).join(', ')}, and an ` +
            'unresolved one fails OPEN rather than loudly',
        )
      }
    } else if ('threshold' in policy) {
      throw new Error(
        `colour-policy kind '${kind}' measures nothing yet names threshold ` +
          `'${policy.threshold}' -- a floor nothing applies reads as a guarantee`,
      )
    }
  }
}

/**
 * Kinds whose values may carry alpha.
 *
 * Alpha is legal exactly where the policy already says luminance does not
 * measure the role. Stated as a fact about KINDS rather than checked at the
 * point of measurement, so an 8-digit value on an unmeasured role is caught too,
 * and so the rule is reviewable in one place.
 */
export const MAY_CARRY_ALPHA = deepFreeze(['compositing'])

export function assertAlphaPermissions(permitted = MAY_CARRY_ALPHA, kinds = COLOR_POLICY_KINDS) {
  for (const kind of permitted) {
    if (!(kind in kinds)) {
      throw new Error(
        `'${kind}' may carry alpha but is not a colour-policy kind -- the permission names ` +
          'nothing, so it grants nothing, and a role that needs it would be refused instead',
      )
    }
    if (kinds[kind].measures) {
      throw new Error(
        `'${kind}' measures contrast and may not also carry alpha -- a translucent value has ` +
          'no fixed luminance, so every ratio computed from it describes a colour that is not ' +
          'what renders',
      )
    }
  }
}

/**
 * Whether a colour value carries an alpha channel.
 *
 * REFUSES WHAT IT CANNOT CLASSIFY, and this is the module's own FAIL CLOSED
 * principle applied to the one predicate that used to break it. This was
 * `value.length > 7`, which answers `false` for every non-string -- so a DTCG
 * structured colour carrying `alpha: 0.5` reported no alpha, and the check that
 * exists to catch translucency would have gone quiet at the exact moment the
 * shape table widened to admit it. The migration that introduces those forms is
 * now forced to come here first.
 */
export function carriesAlpha(value) {
  if (typeof value === 'string' && HEX.test(value)) {
    return value.length === 9
  }
  throw new Error(
    `cannot decide whether ${JSON.stringify(value)} carries alpha -- only the hex colour ` +
      'form is understood, so widening the colour shape must widen this in the same commit',
  )
}

export function kindPolicy(kind) {
  const policy = COLOR_POLICY_KINDS[kind]
  if (!policy) {
    throw new Error(
      `unknown colour-policy kind '${kind}' -- the legal kinds are ` +
        `${Object.keys(COLOR_POLICY_KINDS).join(', ')}`,
    )
  }
  return policy
}

/**
 * The ratio a kind must clear, resolved through the accessibility policy.
 *
 * Why text is 4.5 everywhere -- including text WCAG would let off at 3:1 for
 * being large -- is recorded with the floor itself in `accessibility.mjs`, along
 * with the criterion each floor cites. This function is the lookup, not the
 * argument.
 */
export function minimumFor(kind) {
  const policy = kindPolicy(kind)
  if (!policy.measures) {
    throw new Error(`colour-policy kind '${kind}' measures nothing, so it has no minimum`)
  }
  const floor = ACCESSIBILITY_POLICY.contrast[policy.threshold]
  if (!floor) {
    throw new Error(
      `colour-policy kind '${kind}' names accessibility floor '${policy.threshold}', which does ` +
        'not exist -- returning undefined here would be measured against every surface and ' +
        'clear every one of them',
    )
  }
  return floor.adopted
}

/**
 * COMPOSITION CONTEXTS -- where a role may legitimately be composed.
 *
 * THE MODEL THIS REPLACED CONFLATED TWO QUESTIONS. A role's `kind` was asked to
 * say both what it must PROVE -- text measures 4.5, ui measures 3 -- and where it
 * may be COMPOSED: a surface is a backdrop, an `intent-surface` a status backdrop.
 * One field, two jobs, and the strain showed as machinery: an `intent` field, a
 * second surface kind, a hand-written `against` list, and an assertion apiece to
 * keep the last two honest.
 *
 * THE TELL WAS `accent.default`. It is a fill that on-accent text sits on AND a
 * boundary that must clear 3:1 against the page. A single-kind classification
 * cannot say both, so `text.on-accent` needed an enumerated escape hatch -- the
 * one hand-maintained list left in a module whose central argument is that
 * hand-maintained lists go stale one entry at a time.
 *
 * Splitting the questions dissolves it. A role states its KIND (what it proves),
 * the contexts it CONSUMES, and the contexts it PROVIDES. `accent.default`
 * measures against `neutral` and provides `accent`, which is simply true of it.
 *
 * The set is CLOSED, and that is the second gain. A misspelled `intent` used to
 * fail in the worst possible direction: the role kept its neutral surfaces, lost
 * the single pair it existed for, and the error -- when one came at all -- named
 * a different role. An unknown context is now refused where it is written.
 */
export const COMPOSITION_CONTEXTS = deepFreeze([
  'accent',
  'danger',
  'disabled',
  'info',
  'neutral',
  'success',
  'warning',
  // The superseding system's contexts. It names one per surface rather than one
  // per intent, which is what lets a role and its `-foreground` state their own
  // pair -- `card` provides `card`, and `card-foreground` is measured on it.
  // `danger` and `neutral` above belong to the system being replaced and go with
  // it; `destructive` and `page` are their counterparts here.
  'card',
  'destructive',
  // THE STATUS TINT FOR FAILURE. `destructive` is the ACTION fill -- a button
  // somebody presses -- and until this existed the tint family had success,
  // warning, info and statutory and nothing for failure. Alert rendered `danger`
  // with warning's classes because there was nothing else to reach for.
  'error',
  'field',
  'muted',
  'page',
  'popover',
  'primary',
  'secondary',
  // TWO CONTEXTS FOR THE RAIL, NOT ONE. The frame and the selected item inside
  // it are different backdrops, and a single 'sidebar' context would measure
  // sidebar-accent-foreground against the rail it does not sit on -- the same
  // error `color.ring` avoids by citing the surfaces a focused control touches.
  'sidebar',
  'sidebar-accent',
  'statutory',
])

/**
 * Colour roles and what must be true of them.
 *
 * PAIRS ARE DERIVED, NEVER LISTED. Three consecutive review rounds found a
 * hand-maintained pair list short by one surface -- the accent tint missing from
 * the text roles, then `sunken` missing from `border.strong`, then `sunken`
 * missing from the status text roles. Each was fixed by hand and the next round
 * found the next one, which says the enumeration METHOD was the defect rather
 * than any particular list. There is now no list left to be short: adding a
 * fourth neutral surface extends every role consuming `neutral`, and adding an
 * `accent.pressed` extends `text.on-accent`, with nobody editing either.
 *
 * CONTEXTS KEEP DERIVATION HONEST. Pairing every text role against every backdrop
 * would manufacture `text.default` on `danger.surface` -- a composition nobody
 * renders. Neutral text consumes `neutral` only; status text consumes `neutral`
 * and its own status.
 */
/**
 * THE PERCEPTUAL FLOOR. Below this two colours are one colour.
 *
 * CIEDE2000 rather than a contrast ratio, because the question is different.
 * Contrast asks whether text on a surface can be READ; this asks whether two
 * surfaces can be TOLD APART, which is a difference in hue and chroma as much
 * as in luminance. A 1.3 CIEDE2000 gap between the statutory and warning tints
 * in dark passed every contrast check in this file and rendered as one colour.
 *
 * 3.0 rather than the ~2.3 usually quoted as the just-noticeable difference:
 * JND is the threshold for a trained observer comparing adjacent patches, and
 * these are surfaces separated by content, seen once, by someone doing
 * something else.
 */
export const DISTINCT_MINIMUM_DELTA_E = 3.0

/**
 * Pairs that must never render as the same colour, and WHY each one is here.
 *
 * THIS TABLE EXISTS BECAUSE NOTHING MEASURED SURFACE AGAINST SURFACE. Every
 * check in this module takes a foreground and the surface it sits on;
 * `pairsFor` returns [] for a `surface` role because its kind is
 * `pairedAgainst`, so a surface is never the left operand of anything. Two
 * roles resolving to the SAME colour therefore passed every existing check --
 * and four of them did: card, popover, field and secondary were all #ffffff.
 *
 * WHAT IS DELIBERATELY NOT HERE, and this is the load-bearing half. A pair
 * belongs in this table only when SURFACE is the means its separation actually
 * rests on:
 *
 *   card / popover   NOT here. A popover is separated by its SHADOW, which
 *                    ELEVATION_LAYERS declares and which works in both themes.
 *                    In light they are both white and cannot differ -- white is
 *                    the ceiling, and demanding a step above it would be a rule
 *                    no palette could satisfy.
 *   card / field     NOT here. A field is separated by its BOUNDARY --
 *                    `color.input`, measured at 4.33:1, well past the 3:1 floor.
 *
 * Adding a pair here is a claim that nothing else separates them.
 */
export const DISTINCT_PAIRS = deepFreeze([
  // A card is separated from the page by a boundary and a surface, and the
  // boundary is `color.border` -- kind `decorative`, exempt, and measured by
  // nothing. If the surface step is also invisible then the panel has no
  // separation at all, which is what 1.8 CIEDE2000 meant.
  [
    'color.background',
    'color.card',
    'a panel on the page, whose only other means is an unmeasured border',
  ],
  // The recessed well -- code blocks, skeletons -- sits ON a card, not on the page.
  ['color.card', 'color.muted', 'a recessed well inside a panel'],
  // THE FIVE STATUS TINTS, MUTUALLY. These carry meaning by colour, and while
  // colour is never their only indicator, two obligations that look identical
  // make the vocabulary a lie. `statutory` and `warning` were 1.3 apart in dark:
  // fixed by law and be careful, rendering as one colour.
  ['color.success', 'color.warning', 'a good outcome and a caution'],
  ['color.success', 'color.error', 'a good outcome and a failure'],
  ['color.success', 'color.info', 'a good outcome and a note'],
  ['color.success', 'color.statutory', 'a good outcome and a legal fact'],
  ['color.warning', 'color.error', 'a caution and a failure'],
  ['color.warning', 'color.info', 'a caution and a note'],
  ['color.warning', 'color.statutory', 'be careful, and fixed by law'],
  ['color.error', 'color.info', 'a failure and a note'],
  ['color.error', 'color.statutory', 'a failure and a legal fact'],
  ['color.info', 'color.statutory', 'a note and a legal fact'],
])

/**
 * CIEDE2000. Not a contrast ratio, and not Euclidean Lab either.
 *
 * The naive distance in Lab overstates differences in saturated regions and
 * understates them in near-neutrals -- which is exactly the region every
 * surface in this system lives in. CIEDE2000 applies the lightness, chroma and
 * hue weightings plus the blue-region rotation term, and it is the standard the
 * just-noticeable-difference figure this file quotes is defined against.
 */
const srgbToLab = (hex) => {
  const n = hex.replace('#', '')
  const lin = (c) => (c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = [0, 2, 4].map((i) => lin(Number.parseInt(n.slice(i, i + 2), 16) / 255))
  const X = r * 0.4124 + g * 0.3576 + b * 0.1805
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722
  const Z = r * 0.0193 + g * 0.1192 + b * 0.9505
  const f = (t) => (t > 0.008_856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const [fx, fy, fz] = [f(X / 0.950_47), f(Y), f(Z / 1.088_83)]
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function deltaE(hexA, hexB) {
  const [L1, a1, b1] = srgbToLab(hexA)
  const [L2, a2, b2] = srgbToLab(hexB)
  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cbar = (C1 + C2) / 2
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)))
  const ap1 = (1 + G) * a1
  const ap2 = (1 + G) * a2
  const Cp1 = Math.hypot(ap1, b1)
  const Cp2 = Math.hypot(ap2, b2)
  const hue = (b, a) => {
    if (b === 0 && a === 0) {
      return 0
    }
    const d = (Math.atan2(b, a) * 180) / Math.PI
    return d < 0 ? d + 360 : d
  }
  const hp1 = hue(b1, ap1)
  const hp2 = hue(b2, ap2)
  let dhp = 0
  if (Cp1 * Cp2 !== 0) {
    dhp = hp2 - hp1
    if (dhp > 180) {
      dhp -= 360
    } else if (dhp < -180) {
      dhp += 360
    }
  }
  const dLp = L2 - L1
  const dCp = Cp2 - Cp1
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dhp * Math.PI) / 360)
  const Lbp = (L1 + L2) / 2
  const Cbp = (Cp1 + Cp2) / 2
  let hbp = hp1 + hp2
  if (Cp1 * Cp2 !== 0) {
    if (Math.abs(hp1 - hp2) > 180) {
      hbp += hbp < 360 ? 360 : -360
    }
    hbp /= 2
  }
  const T =
    1 -
    0.17 * Math.cos(((hbp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hbp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hbp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hbp - 63) * Math.PI) / 180)
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2)
  const Sc = 1 + 0.045 * Cbp
  const Sh = 1 + 0.015 * Cbp * T
  const Rt =
    -2 *
    Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7)) *
    Math.sin((60 * Math.exp(-(((hbp - 275) / 25) ** 2)) * Math.PI) / 180)
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
  )
}

/**
 * Every declared pair, in every mode. A role that is absent is SKIPPED -- the
 * same rule the contrast and typography checks follow, so a synthetic source
 * declaring three tokens is not asked about twelve pairs.
 *
 * Alpha is refused rather than composited. A colour with alpha has no single
 * appearance until it is drawn on something, and answering "are these two
 * distinguishable" about a colour that does not exist yet would be a fabricated
 * number -- the same reason the contrast policy refuses alpha on a measured role.
 */
export function distinctnessFailures(
  resolvedByMode,
  pairs = DISTINCT_PAIRS,
  floor = DISTINCT_MINIMUM_DELTA_E,
) {
  const failures = []
  for (const [label, resolved] of resolvedByMode) {
    for (const [a, b, why] of pairs) {
      // PREFIXED, because the resolved map is keyed by FULL token path while
      // this table -- like COLOR_ROLE_POLICIES -- names roles relative to
      // `semantic.`. Without it every lookup returned undefined, every pair hit
      // the skip below, and the check reported clean over twelve pairs it had
      // not looked at. It was caught by planting a known collision and watching
      // the generator succeed; nothing else would have said so.
      const va = resolved.get(`semantic.${a}`)
      const vb = resolved.get(`semantic.${b}`)
      // A pair whose roles do not both exist is skipped, so a synthetic source
      // declaring three tokens is not asked about twelve pairs. That leniency is
      // what hid the bug above, so it is worth being exact about its scope: this
      // skips a MISSING role, and the generator separately refuses a semantic
      // colour role that has no policy -- so a real token cannot reach here
      // unnoticed.
      if (va === undefined || vb === undefined) {
        continue
      }
      if (carriesAlpha(va) || carriesAlpha(vb)) {
        continue
      }
      const d = deltaE(va, vb)
      if (d < floor) {
        failures.push(
          `${label}: ${a} and ${b} are ${d.toFixed(1)} apart, below the ${floor} floor -- ` +
            `they render as one colour, and this pair is ${why}`,
        )
      }
    }
  }
  return failures
}

export const COLOR_ROLE_POLICIES = deepFreeze({
  // THREE ROLES RATHER THAN ONE OPACITY, and the reason is that CSS `opacity`
  // composites: it produces colours that exist only after render, so the pair the
  // token graph can see stays green while the pixels do not. `text.default` on
  // `surface.raised` reports 17.85:1 and rendered 4.74:1 through `opacity: 0.6`.
  // As explicit roles it is an ordinary pair the contrast invariant already covers.
  /* ---------------------------------------------------------------------
   * `color.*` -- the superseding design system.
   *
   * FLAT AND PAIRED BY STEM. Every surface provides a context named after
   * itself, and its `-foreground` is measured against exactly that context. The
   * pairing is therefore visible in the names: nothing has to know that `card`
   * and `card-foreground` belong together, because they say so.
   * ------------------------------------------------------------------- */

  'color.accent': {
    kind: 'surface',
    providesContexts: ['accent'],
    reason: 'a subtle tint behind a hovered or selected row, proved through accent-foreground',
  },
  'color.accent-foreground': { againstContexts: ['accent'], kind: 'text' },
  // TONAL STATES, AND THEY ARE FILLS RATHER THAN OVERLAYS. Material 3 expresses
  // these as a state layer -- the 'on' colour composited over the container at
  // 8% and 10%. That is refused here for the reason 'color.primary-pressed'
  // already states and 'button.tsx' records at its destructive variant: an
  // opacity composite means the pair the token graph measures is not the pair a
  // reader sees, which once reported 5.17:1 for a label rendering at 2.56:1.
  // A third fill is measurable; a translucent overlay is not.
  'color.accent-hover': {
    kind: 'surface',
    providesContexts: ['accent'],
    reason: 'the hovered fill of a tonal control, proved through accent-foreground',
  },
  'color.accent-pressed': {
    kind: 'surface',
    providesContexts: ['accent'],
    reason: 'the pressed fill of a tonal control, proved through accent-foreground',
  },
  'color.background': {
    kind: 'surface',
    providesContexts: ['page'],
    reason: 'the page itself, proved through foreground',
  },
  // A divider, never a sole control boundary -- the same exemption the system
  // being replaced granted `border.default`, for the same reason. `color.input`
  // below is the one that must be findable, and it measures.
  'color.border': { kind: 'decorative', reason: 'a divider, never a sole control boundary' },
  'color.card': {
    kind: 'surface',
    providesContexts: ['card'],
    reason: 'a grouped surface, proved through card-foreground',
  },
  'color.card-foreground': { againstContexts: ['card'], kind: 'text' },
  'color.destructive': {
    kind: 'surface',
    providesContexts: ['destructive'],
    reason: 'a status backdrop, proved through destructive-foreground',
  },
  'color.destructive-foreground': { againstContexts: ['destructive'], kind: 'text' },
  'color.destructive-hover': {
    kind: 'surface',
    providesContexts: ['destructive'],
    reason: 'the hovered fill of a destructive control, proved through destructive-foreground',
  },
  // Minted 2026-09-03 (ADR-034 step 3) because COLOR_ROLE_CONTRACTS declared it and the
  // assertion refused the file until it existed. The step below hover, as primary's is:
  // red.950 on light where primary goes to teal.950, red.100 on dark where primary goes
  // to teal.300 -- the deepest and the lightest step the red family has.
  'color.destructive-pressed': {
    kind: 'surface',
    providesContexts: ['destructive'],
    reason: 'the pressed fill of a destructive control, proved through destructive-foreground',
  },
  'color.disabled': {
    kind: 'surface',
    providesContexts: ['disabled'],
    reason: 'the fill of a control that cannot be operated, proved through disabled-foreground',
  },
  // Dimmed, never hidden. `inactive` carries a lower floor than `text` because a
  // disabled control is not being read for content -- but it still has one,
  // because a control whose label cannot be read is one whose absence cannot be
  // understood.
  'color.disabled-foreground': { againstContexts: ['disabled'], kind: 'inactive' },
  'color.error': {
    kind: 'surface',
    providesContexts: ['error'],
    reason: 'a status backdrop for failure, proved through error-foreground',
  },
  // READ ON THE PAGE AS WELL AS ON ITS TINT. Text's trend tone sets a delta in
  // this ink directly on a card or the page, with no `error` backdrop under it,
  // so those surfaces are declared here and measured -- the pairing is the
  // claim, and the generator refuses the token file if the ink stops clearing it.
  'color.error-foreground': { againstContexts: ['card', 'error', 'page'], kind: 'text' },
  'color.field': {
    kind: 'surface',
    providesContexts: ['field'],
    reason: 'the surface of a text control, proved through foreground',
  },
  'color.foreground': { againstContexts: ['field', 'page'], kind: 'text' },
  'color.info': {
    kind: 'surface',
    providesContexts: ['info'],
    reason: 'a status backdrop, proved through info-foreground',
  },
  'color.info-foreground': { againstContexts: ['info'], kind: 'text' },
  // The boundary of a control a person must find and aim at, so it measures at
  // the `ui` floor against every surface a field can sit on.
  'color.input': { againstContexts: ['card', 'page'], kind: 'ui' },
  'color.muted': {
    kind: 'surface',
    providesContexts: ['muted'],
    reason: 'a recessed fill, proved through muted-foreground',
  },
  // Secondary text sits on the page and on cards as well as on `muted`, so it is
  // measured against all three rather than against the one it is named for.
  'color.muted-foreground': { againstContexts: ['card', 'muted', 'page'], kind: 'text' },
  'color.popover': {
    kind: 'surface',
    providesContexts: ['popover'],
    reason: 'a floating surface, proved through popover-foreground',
  },
  'color.popover-foreground': { againstContexts: ['popover'], kind: 'text' },
  'color.primary': {
    kind: 'surface',
    providesContexts: ['primary'],
    reason: 'a filled control, proved through primary-foreground',
  },
  'color.primary-foreground': { againstContexts: ['primary'], kind: 'text' },
  'color.primary-hover': {
    kind: 'surface',
    providesContexts: ['primary'],
    reason: 'the hovered fill of a filled control, proved through primary-foreground',
  },
  // A pressed fill is a third fill, not a hover at another opacity. Both provide
  // `primary`, so `primary-foreground` is measured on them the day they land
  // rather than the day somebody remembers.
  'color.primary-pressed': {
    kind: 'surface',
    providesContexts: ['primary'],
    reason: 'the pressed fill of a filled control, proved through primary-foreground',
  },
  'color.ring': { againstContexts: ['card', 'page'], kind: 'ui' },
  'color.scrim': { kind: 'compositing', reason: 'an alpha layer, not a foreground pair' },
  'color.secondary': {
    kind: 'surface',
    providesContexts: ['secondary'],
    reason: 'an outlined control, proved through secondary-foreground',
  },
  'color.secondary-foreground': { againstContexts: ['secondary'], kind: 'text' },
  'color.secondary-hover': {
    kind: 'surface',
    providesContexts: ['secondary'],
    reason: 'the hovered fill of an outlined control, proved through secondary-foreground',
  },
  'color.secondary-pressed': {
    kind: 'surface',
    providesContexts: ['secondary'],
    reason: 'the pressed fill of an outlined control, proved through secondary-foreground',
  },
  // THE INK A SHADOW IS DRAWN IN, and it is exempt for the same reason the
  // scrim is: what it composites over is decided at render, so the pair the
  // token graph can see is not the pair the eye gets. What DOES have to hold
  // -- that a surface stays distinguishable from the one beneath it -- is a
  // property of the surfaces, and those are measured.
  'color.shadow-ambient': {
    kind: 'compositing',
    reason: 'the wide, faint layer of a shadow; composited, not a pair',
  },
  'color.shadow-key': {
    kind: 'compositing',
    reason: 'the tight, nearer layer of a shadow; composited, not a pair',
  },
  // THE RAIL IS SET INTO THE PAGE, NOT LIFTED OFF IT. `card` is shallower than
  // the page and `sidebar` is deeper -- neutral.100 under a neutral.50 page in
  // light, ink.900 over an ink.950 page in dark. Making them one surface was the
  // alternative and it fails in both directions: a rail matching the card stops
  // reading as frame, and a card matching the rail stops reading as content.
  // `semantic.shell` already says this in its own words -- "the persistent frame,
  // which is a different system from the workspace inside it" -- and owns that
  // frame's DIMENSIONS. These are the same frame's colours, and the two families
  // are deliberately not merged: a width and a fill are different facts.
  'color.sidebar': {
    kind: 'surface',
    providesContexts: ['sidebar'],
    reason: 'the persistent navigation frame, proved through sidebar-foreground',
  },
  'color.sidebar-accent': {
    kind: 'surface',
    providesContexts: ['sidebar-accent'],
    reason: 'the hovered or selected nav item fill, proved through sidebar-accent-foreground',
  },
  'color.sidebar-accent-foreground': { againstContexts: ['sidebar-accent'], kind: 'text' },
  'color.sidebar-border': {
    kind: 'decorative',
    reason: 'a divider inside the rail, never a sole control boundary',
  },
  'color.sidebar-foreground': { againstContexts: ['sidebar'], kind: 'text' },
  // MEASURED AGAINST THE RAIL AND NOT THE PAGE. `color.ring` cites 'card' and
  // 'page' because that is where a focused control sits; a focused nav item sits
  // on the sidebar, and a ring proved against the page would be proved against a
  // surface it never touches.
  'color.sidebar-ring': { againstContexts: ['sidebar'], kind: 'ui' },
  // STATUTORY. EPF, SOCSO, EIS and PCB rates are law, not advice and not a
  // warning. It measures like any other text pair; what it does not do is borrow
  // `info`, which would read as guidance a reader could choose to ignore.
  'color.statutory': {
    kind: 'surface',
    providesContexts: ['statutory'],
    reason: 'the backdrop of a regulatory fact, proved through statutory-foreground',
  },
  'color.statutory-foreground': { againstContexts: ['statutory'], kind: 'text' },
  'color.success': {
    kind: 'surface',
    providesContexts: ['success'],
    reason: 'a status backdrop, proved through success-foreground',
  },
  // Same declaration as `error-foreground`, for the same reason: the trend tone.
  'color.success-foreground': { againstContexts: ['card', 'page', 'success'], kind: 'text' },
  'color.warning': {
    kind: 'surface',
    providesContexts: ['warning'],
    reason: 'a status backdrop, proved through warning-foreground',
  },
  'color.warning-foreground': { againstContexts: ['warning'], kind: 'text' },
  // WAS `accent.default` AND `accent.hover`. They were the last intent-first
  // names in the semantic colour tier -- danger and warning were normalised to
  // property-first for v2 and these were not, which left one accent surface named
  // for its property (`accent-subtle`, immediately below) and two named for their
  // intent, in the same family. `kind: 'ui'` because a filled accent control is a
  // boundary that must clear 3:1 against the page, and it provides the `accent`
  // context that `text.on-accent` is measured against.
  // A PRESSED FILL IS A THIRD FILL, not a hover with a different opacity, and it
  // is here rather than in the stylesheet for the reason the comment above gives:
  // it provides `accent`, so `text.on-accent` is measured on it the day it lands
  // instead of the day somebody remembers. That is the whole return on contexts.
  // SUCCESS AND INFO COMPLETE THE STATE SET, and they were missing rather than
  // deferred. The document palette already enumerates the states this product
  // ships -- draft, submitted, pending, partial, approved, paid, posted,
  // rejected, overdue, cancelled -- across FIVE families, and only three of them
  // had roles here. `approved`, `paid` and `posted` had nowhere to go.
  //
  // NEITHER EXISTING COLOUR COULD TAKE THEM. Neutral would make `approved`
  // identical to `draft`, which are the two states an approver most needs to
  // separate. Teal is worse: teal means AGENCY -- a thing you can press -- so
  // reusing it for a status makes a state indistinguishable from a control.
  //
  // SUCCESS IS FOREST, NOT EMERALD, and that is the load-bearing part. At 144
  // degrees it sits 34 from the teal's 178; an emerald would have been a
  // neighbour of the action colour and the distinction would rest on chroma
  // alone. Colour is still never the whole signal -- the document palette makes
  // the glyph mandatory, because success and danger are exactly the pair that
  // red/green deficiency collapses.
  // A SEPARATE ROLE FROM `raised`, though it currently resolves to the same
  // primitive in both themes. `ELEVATION_LAYERS` already distinguishes the two
  // layers -- `raised` is a card, `overlay` is a dialog interrupting the page --
  // and both named `surface.raised`, so the model said they were different and
  // the tokens said they were the same. A card and a modal have different
  // responsibilities and will diverge; sharing one token means the day they do,
  // every card changes with them.
  // THE POINTER STATES OF THE NEUTRAL CONTROL, and they were previously borrowed.
  // A secondary button hovered to `surface.sunken` -- the recessed-container role
  // -- so a hovered button and an inset well were one token, and neither could
  // move without the other. It is the collision `surface.info` had with the accent
  // tint, in the tier below where it is harder to see: nothing looked wrong,
  // because on paper a hover and a well happen to want the same grey.
  //
  // They are `surface` rather than `ui`: content sits on a hovered button, so the
  // measured obligation is the text on it, not an edge against the page. The
  // control's own boundary is `border.strong` and is measured separately.
  // A SEPARATE ROLE FROM `default`, and the reason is that it changes hue between
  // themes rather than lightness. In light it is executive navy -- the colour
  // that carries authority in a heading or a total, and the one the printed
  // documents already use. On the dark ground that same navy measures 1.40:1, so
  // there the role resolves to near-white and the authority is carried by weight.
  // Binding a heading to `text.default` would have lost that distinction in both
  // directions at once.
  // Consumes `accent` and nothing else. Under the old model this was the single
  // enumerated exception, because deriving it against every backdrop demanded
  // white text clear 4.5 on a white page. A context says the same thing without
  // naming a partner, so a new accent fill is covered the day it lands.
})

/** What a measuring role is checked against, derived from the contexts it consumes. */
export function pairsFor(role, registry = COLOR_ROLE_POLICIES) {
  const policy = registry[role]
  if (!policy) {
    throw new Error(
      `no colour policy for role '${role}' -- every role states one, so an unknown name is a ` +
        'typo rather than a role that happens to assert nothing',
    )
  }
  if (!kindPolicy(policy.kind).measures) {
    return []
  }
  const consumed = new Set(policy.againstContexts)
  return Object.entries(registry)
    .filter(
      ([name, other]) =>
        name !== role && (other.providesContexts ?? []).some((context) => consumed.has(context)),
    )
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Contexts are a closed vocabulary, and both directions of every one must exist.
 *
 * A context nobody provides is a measuring role quietly reduced to its remaining
 * pairs -- the silent-typo failure the `intent` field used to have. A context
 * nobody consumes is a surface measured by nothing, which is the hole that made
 * the old single `backdrop` kind worth splitting up in the first place. Both are
 * refused here, where the message names the CONTEXT rather than some role that
 * merely suffered the consequence.
 */
function assertContextsResolve(registry) {
  const provided = new Set()
  const consumed = new Set()

  for (const [role, policy] of Object.entries(registry)) {
    for (const [field, sink] of [
      ['againstContexts', consumed],
      ['providesContexts', provided],
    ]) {
      for (const context of policy[field] ?? []) {
        if (!COMPOSITION_CONTEXTS.includes(context)) {
          throw new Error(
            `'${role}' names composition context '${context}', which is not one of ` +
              `${COMPOSITION_CONTEXTS.join(', ')} -- the set is closed, so a typo is refused ` +
              'here rather than silently costing the role a pair',
          )
        }
        sink.add(context)
      }
    }
  }

  for (const context of consumed) {
    if (!provided.has(context)) {
      throw new Error(
        `composition context '${context}' is consumed but nothing provides it -- every role ` +
          'measuring against it keeps its other pairs and silently loses this one',
      )
    }
  }
  for (const context of provided) {
    if (!consumed.has(context)) {
      throw new Error(
        `composition context '${context}' is provided but nothing consumes it -- those ` +
          'surfaces exist to be measured against, and nothing measures against them',
      )
    }
  }
}

/**
 * The registry governs itself. Every hole below was reachable before this ran.
 *
 * Completeness is by POLICY, not by pairing: a role either measures against
 * declared contexts, provides one, or states an exemption naming a reason.
 * Demanding a pair from a scrim would only produce a fabricated one marked exempt.
 */
/**
 * A role record's SHAPE, refused by field name.
 *
 * Every other check here validates what a field MEANS. This one catches the
 * failure that never reaches meaning at all: `againstContext` without the s,
 * `provideContexts`, `lifecyle`, `replacment`. A misspelled key is not an error
 * in JavaScript -- it is a new property, silently ignored, and the role quietly
 * behaves as though the line had not been written. That is the same silent-typo
 * class as `kind: 'txet'`, one level up, and it is the only one a closed value
 * vocabulary cannot catch, because the value is never read.
 *
 * This is also the honest answer to "should a schema library do this". It would
 * be four lines of zod. It is nine lines here, needs no dependency in tooling
 * that currently has none, and keeps the refusal text -- which is the part that
 * teaches anyone anything.
 */
/**
 * The families a semantic colour role may belong to -- PROPERTY FIRST: what is
 * styled, then the role or state it carries.
 *
 * CLOSED, AND NOTHING CLOSED IT UNTIL NOW. Every other rule in this file asks
 * something of a role's fields, kind, contexts or pairs; none asked whether its
 * NAME belonged to a family this system admits, so any group at all was accepted.
 * That is the hole `ALLOWED_EDGES` had in `tiers.mjs`: a set closed by convention
 * and by nothing else.
 *
 * It is asserted rather than merely listed because the vocabulary had in fact
 * drifted. `accent.default` and `accent.hover` survived the v2 property-first
 * rename that moved `danger.*` and `warning.*`, and sat beside
 * `surface.accent-subtle` -- the same family, named both ways at once. They are
 * `surface.accent` and `surface.accent-hover` now, and this check is what would
 * have said so.
 *
 * `focus` and `overlay` are admitted deliberately. Neither is a CSS property, and
 * both name the thing being styled rather than an intent it carries, which is the
 * distinction the model is actually making.
 */
export const COLOR_ROLE_GROUPS = deepFreeze([
  // The superseding system's family. Its roles are FLAT and paired by stem --
  // `card` and `card-foreground` -- so each contrast pair is stated by the names
  // rather than inferred from a property family. The five families beneath it
  // belong to the system being replaced and go when it does.
  'color',
  'border',
  'focus',
  'overlay',
  'surface',
  'text',
])

const COLOR_ROLE_FIELDS = deepFreeze([
  'againstContexts',
  'kind',
  'lifecycle',
  'providesContexts',
  'reason',
  'replacement',
])

function assertRoleRecordShape(role, policy) {
  // The role name is a token path with `semantic.` in front of it, so it answers
  // to the naming grammar `identity.mjs` owns rather than to a second one here.
  // A role that could not survive the CSS projection is refused where it is
  // declared instead of where it is emitted.
  assertTokenPath(`semantic.${role}`)
  const [group] = role.split('.')
  if (!COLOR_ROLE_GROUPS.includes(group)) {
    throw new Error(
      `colour role '${role}' is in family '${group}', which is not one of ` +
        `${COLOR_ROLE_GROUPS.join(', ')} -- a role named for its intent rather than for what ` +
        'it styles leaves the family it belongs to holding two vocabularies at once',
    )
  }
  for (const key of Object.keys(policy)) {
    if (!COLOR_ROLE_FIELDS.includes(key)) {
      throw new Error(
        `'${role}' declares '${key}', which no rule reads -- the legal fields are ` +
          `${COLOR_ROLE_FIELDS.join(', ')}, and a misspelled one is not an error in ` +
          'JavaScript but a new property that is silently ignored',
      )
    }
  }
  for (const field of ['againstContexts', 'providesContexts']) {
    const declared = policy[field]
    if (declared === undefined) {
      continue
    }
    if (!Array.isArray(declared)) {
      throw new Error(`'${role}' declares ${field}, which must be an array of contexts`)
    }
    if (declared.some((context) => typeof context !== 'string' || context.trim() === '')) {
      throw new Error(`'${role}' declares an empty or non-string entry in ${field}`)
    }
    if (new Set(declared).size !== declared.length) {
      throw new Error(
        `'${role}' repeats a context in ${field} -- a duplicate adds no relationship and ` +
          'would be collapsed silently, so it is more likely a mistake than an intention',
      )
    }
  }
}

export function assertColorRoleRegistry(registry = COLOR_ROLE_POLICIES) {
  for (const [role, policy] of Object.entries(registry)) {
    assertRoleRecordShape(role, policy)
    const kind = kindPolicy(policy.kind)
    assertLifecycle(role, policy, registry)

    if (kind.exempt) {
      for (const field of ['againstContexts', 'providesContexts']) {
        if (policy[field]) {
          throw new Error(
            `'${role}' is ${policy.kind}, which asserts nothing and is measured by nothing, ` +
              `yet declares ${field} -- the old completeness rule was an OR, so a role could ` +
              'claim a relationship and still be exempt from ever proving it',
          )
        }
      }
    }

    if (
      (kind.exempt || kind.pairedAgainst) &&
      (typeof policy.reason !== 'string' || policy.reason.trim() === '')
    ) {
      throw new Error(`'${role}' is ${policy.kind} and must state a reason`)
    }

    if (kind.pairedAgainst && (policy.providesContexts ?? []).length === 0) {
      throw new Error(
        `'${role}' is ${policy.kind} -- it exists to be composed against, so it must name at ` +
          'least one context, or nothing can ever be measured on it',
      )
    }

    if (kind.measures) {
      if ((policy.againstContexts ?? []).length === 0) {
        throw new Error(
          `'${role}' measures contrast but names no composition context -- a measuring role ` +
            'with nothing to measure against passes by having no work to do',
        )
      }
      const pairs = pairsFor(role, registry)
      if (pairs.length === 0) {
        throw new Error(`'${role}' measures contrast but derives no relationships`)
      }
      if (new Set(pairs).size !== pairs.length) {
        throw new Error(`'${role}' derives a duplicate relationship`)
      }
      for (const other of pairs) {
        if (kindPolicy(registry[other].kind).exempt) {
          throw new Error(
            `'${role}' measures against '${other}', which is exempt -- either the target ` +
              'is not really exempt, or the pair is not a composition this system supports',
          )
        }
      }
    }
  }

  assertContextsResolve(registry)
}

/* ----------------------------------------------------- model completeness -- */

/**
 * Validate the perceptual-distinctness table itself.
 *
 * `distinctnessFailures` evaluates resolved colours, but a malformed pair table
 * can make that evaluator quietly do the wrong work. This assertion closes the
 * table before any colour math runs:
 *
 *   • each entry is [roleA, roleB, reason]
 *   • both roles exist
 *   • both roles are surfaces (paired-against roles)
 *   • a role is never paired with itself
 *   • unordered pairs are unique
 *   • every pair says why perceptual distinction matters
 */
export function assertDistinctPairs(
  pairs = DISTINCT_PAIRS,
  registry = COLOR_ROLE_POLICIES,
  floor = DISTINCT_MINIMUM_DELTA_E,
) {
  if (!Array.isArray(pairs)) {
    throw new Error('distinct colour pairs must be an array')
  }

  if (!(typeof floor === 'number' && Number.isFinite(floor) && floor > 0)) {
    throw new Error(
      `distinct-colour floor is ${JSON.stringify(floor)} -- it must be a positive finite Delta E`,
    )
  }

  const seen = new Set()

  for (const entry of pairs) {
    if (!Array.isArray(entry) || entry.length !== 3) {
      throw new Error(
        `distinct colour pair ${JSON.stringify(entry)} must be [roleA, roleB, reason]`,
      )
    }

    const [a, b, why] = entry

    for (const role of [a, b]) {
      if (typeof role !== 'string' || role.trim() === '') {
        throw new Error(`distinct colour pair ${JSON.stringify(entry)} names an empty role`)
      }

      if (!registry[role]) {
        throw new Error(
          `distinct colour pair '${a}' / '${b}' names '${role}', which has no colour policy`,
        )
      }

      if (!kindPolicy(registry[role].kind).pairedAgainst) {
        throw new Error(
          `distinct colour pair '${a}' / '${b}' includes '${role}', which is not a surface -- ` +
            'this table measures surface-to-surface distinction, not foreground contrast',
        )
      }
    }

    if (a === b) {
      throw new Error(`distinct colour pair '${a}' compares a role with itself`)
    }

    if (typeof why !== 'string' || why.trim() === '') {
      throw new Error(`distinct colour pair '${a}' / '${b}' must say why the distinction matters`)
    }

    const key = [a, b].sort((x, y) => x.localeCompare(y)).join('\u0000')
    if (seen.has(key)) {
      throw new Error(
        `distinct colour pair '${a}' / '${b}' is declared more than once, including reversed order`,
      )
    }
    seen.add(key)
  }

  return pairs
}

/**
 * Prove that every semantic colour role governed by this file names a real
 * semantic colour token, and that the token has the colour value type.
 *
 * Policy paths are relative (`color.card`); token paths are full
 * (`semantic.color.card`). A typo in the policy must fail here instead of
 * silently removing the role from contrast/distinctness governance.
 */
export function assertColorTokens(tokens, registry = COLOR_ROLE_POLICIES) {
  if (!(tokens instanceof Map)) {
    throw new Error('colour token validation requires a Map of token paths')
  }

  for (const role of Object.keys(registry)) {
    const path = `semantic.${role}`
    const token = tokens.get(path)

    if (!token) {
      throw new Error(
        `colour role '${role}' names '${path}', which does not exist -- the role would remain in ` +
          'policy while no token carries its accessibility obligation',
      )
    }

    if (token.type !== 'color') {
      throw new Error(
        `colour role '${role}' names '${path}', which is a ${token.type} and must be a color`,
      )
    }
  }

  return registry
}

/**
 * One entry point for suites that have the token registry available.
 *
 * Kept separate from `colorPolicy.assert` for drop-in compatibility: the
 * registry policy can validate its own table at import time, while token
 * existence requires the token Map owned by the generator/unit suite.
 */
export function assertColorModel(
  tokens,
  registry = COLOR_ROLE_POLICIES,
  kinds = COLOR_POLICY_KINDS,
  permittedAlphaKinds = MAY_CARRY_ALPHA,
  pairs = DISTINCT_PAIRS,
) {
  assertColorPolicyKinds(kinds)
  assertAlphaPermissions(permittedAlphaKinds, kinds)
  assertColorRoleRegistry(registry)
  assertDistinctPairs(pairs, registry)
  assertColorTokens(tokens, registry)

  return registry
}

/**
 * The colour domain as a registered policy.
 *
 * `assert` is `assertColorRoleRegistry` — the role registry IS what this domain
 * governs, and it takes its subject as an argument, which is the falsifiability
 * rule every policy in this tree is held to.
 *
 * THE NAME CHANGED IN THE MERGE, and it is worth saying why rather than leaving
 * a reader to find it in a diff. It was `assertPolicyRegistry`, which is also
 * the name `define-policy.mjs` gives to the function that validates a list of
 * POLICIES. Two different meanings, one name, in two files that now export
 * through one barrel — and `export *` DROPS an ambiguous name rather than
 * reporting it, so the colour registry's own validator would have vanished from
 * the only sanctioned entry point while looking present in the file.
 */
export const colorPolicy = definePolicy({
  assert: assertColorRoleRegistry,
  id: 'foundation.color',
  kind: 'foundation',
})

/* ------------------------------------------------------- role contracts -- */

/**
 * A DESIGNED ABSENCE, as distinct from a field nobody wrote (ADR-034 Decision 2).
 *
 * `scrim` has no foreground because nothing is set in text on a scrim; that is a fact
 * about the design, and it is written down as one. A slot that is simply missing is a
 * defect, refused below, so that "no separate pressed colour exists" and "nobody
 * decided" can never read the same.
 */
export const NONE = Symbol.for('xforge.design.none')

/** The companions a colour root may declare, and the suffix each one wears in a token name. */
export const COLOR_COMPANIONS = deepFreeze(['foreground', 'hover', 'pressed'])

/**
 * THE 48 SEMANTIC COLOUR TOKENS ARE 26 ROOTS, and until this table the grouping lived in
 * the names: `card-foreground` belonged to `card` because of its suffix, and nothing read
 * the suffix. That is the defect CLAUDE.md keeps a list of -- a fact with two sources that
 * agree until they do not -- in its sixth appearance. `destructive` had a hover and no
 * pressed, and no check could say whether that was a decision.
 *
 * Every root is declared, including the eleven with no companion. Every companion slot
 * is a token reference or NONE; a missing slot is refused. The relationship lives inside
 * the role rather than in a generic wrapper, because `scrim` is a scrim and not "a family
 * with only a container".
 *
 * WHAT THIS TABLE IS NOT. `COLOR_ROLE_POLICIES` above says what each token PROVES about
 * contrast (its kind and the contexts it is measured against). This table says which
 * tokens are ONE ROLE. The two overlap in vocabulary and not in fact: `error-foreground`
 * is `error`'s foreground here, and is measured against `card` and `page` there, because
 * Text sets it on both.
 */
export const COLOR_ROLE_CONTRACTS = deepFreeze({
  accent: {
    base: 'semantic.color.accent',
    foreground: 'semantic.color.accent-foreground',
    hover: 'semantic.color.accent-hover',
    pressed: 'semantic.color.accent-pressed',
  },
  background: {
    base: 'semantic.color.background',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  border: {
    base: 'semantic.color.border',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  card: {
    base: 'semantic.color.card',
    foreground: 'semantic.color.card-foreground',
    hover: NONE,
    pressed: NONE,
  },
  // An ACTION fill, like primary, secondary and accent -- each of which has a pressed
  // state. destructive had a hover and no pressed, and nothing here could say whether
  // that was a decision or an omission. It was an omission: this row is the decision,
  // and the token it names was minted in ADR-034 Migration step 3.
  destructive: {
    base: 'semantic.color.destructive',
    foreground: 'semantic.color.destructive-foreground',
    hover: 'semantic.color.destructive-hover',
    pressed: 'semantic.color.destructive-pressed',
  },
  disabled: {
    base: 'semantic.color.disabled',
    foreground: 'semantic.color.disabled-foreground',
    hover: NONE,
    pressed: NONE,
  },
  error: {
    base: 'semantic.color.error',
    foreground: 'semantic.color.error-foreground',
    hover: NONE,
    pressed: NONE,
  },
  field: {
    base: 'semantic.color.field',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  foreground: {
    base: 'semantic.color.foreground',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  info: {
    base: 'semantic.color.info',
    foreground: 'semantic.color.info-foreground',
    hover: NONE,
    pressed: NONE,
  },
  input: {
    base: 'semantic.color.input',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  muted: {
    base: 'semantic.color.muted',
    foreground: 'semantic.color.muted-foreground',
    hover: NONE,
    pressed: NONE,
  },
  popover: {
    base: 'semantic.color.popover',
    foreground: 'semantic.color.popover-foreground',
    hover: NONE,
    pressed: NONE,
  },
  primary: {
    base: 'semantic.color.primary',
    foreground: 'semantic.color.primary-foreground',
    hover: 'semantic.color.primary-hover',
    pressed: 'semantic.color.primary-pressed',
  },
  ring: {
    base: 'semantic.color.ring',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  scrim: {
    base: 'semantic.color.scrim',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  secondary: {
    base: 'semantic.color.secondary',
    foreground: 'semantic.color.secondary-foreground',
    hover: 'semantic.color.secondary-hover',
    pressed: 'semantic.color.secondary-pressed',
  },
  'shadow-ambient': {
    base: 'semantic.color.shadow-ambient',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  'shadow-key': {
    base: 'semantic.color.shadow-key',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  sidebar: {
    base: 'semantic.color.sidebar',
    foreground: 'semantic.color.sidebar-foreground',
    hover: NONE,
    pressed: NONE,
  },
  'sidebar-accent': {
    base: 'semantic.color.sidebar-accent',
    foreground: 'semantic.color.sidebar-accent-foreground',
    hover: NONE,
    pressed: NONE,
  },
  'sidebar-border': {
    base: 'semantic.color.sidebar-border',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  'sidebar-ring': {
    base: 'semantic.color.sidebar-ring',
    foreground: NONE,
    hover: NONE,
    pressed: NONE,
  },
  statutory: {
    base: 'semantic.color.statutory',
    foreground: 'semantic.color.statutory-foreground',
    hover: NONE,
    pressed: NONE,
  },
  success: {
    base: 'semantic.color.success',
    foreground: 'semantic.color.success-foreground',
    hover: NONE,
    pressed: NONE,
  },
  warning: {
    base: 'semantic.color.warning',
    foreground: 'semantic.color.warning-foreground',
    hover: NONE,
    pressed: NONE,
  },
})

/**
 * The root a semantic colour token belongs to by its NAME. Used only to check the table
 * against the names -- never the other way round. `sidebar-accent-foreground` is
 * `sidebar-accent`'s foreground; `sidebar-border` is a root of its own, because `border`
 * is not a companion.
 */
export function colorRootOf(name) {
  for (const companion of COLOR_COMPANIONS) {
    const suffix = `-${companion}`
    if (name.endsWith(suffix) && name.length > suffix.length) {
      return { companion, root: name.slice(0, -suffix.length) }
    }
  }
  return { companion: null, root: name }
}

const SEMANTIC_COLOR = 'semantic.color.'

/**
 * The contract table against the tokens that exist (ADR-034 Verification, cases 1-3).
 *
 * DRIVEN BY THE TOKENS THAT EXIST, like the colour policy and the typography roles: a
 * root whose base the source does not declare is skipped, because a synthetic source
 * that declares two colours is not defective for lacking twenty-four roots. What is
 * refused is a token nothing owns, a slot nobody decided, a suffix the table disagrees
 * with, and a reference from a PRESENT root to a token that does not exist -- which is
 * how `destructive-pressed` was demanded before it was minted.
 */
export function assertColorRoleContracts(tokens, contracts = COLOR_ROLE_CONTRACTS) {
  if (!(tokens instanceof Map)) {
    throw new TypeError('colour role contracts are checked against a Map<tokenPath, token>')
  }
  const owners = new Map()
  const claim = (path, root, slot) => {
    const prior = owners.get(path)
    if (prior && prior.root !== root) {
      throw new Error(
        `'${path}' is claimed by root '${prior.root}' as ${prior.slot} and by root '${root}' as ` +
          `${slot} -- a token is one role, never two`,
      )
    }
    owners.set(path, { root, slot })
  }

  for (const [root, contract] of Object.entries(contracts)) {
    if (contract === null || typeof contract !== 'object' || Array.isArray(contract)) {
      throw new TypeError(`colour root '${root}' must be an object`)
    }
    if (typeof contract.base !== 'string' || !contract.base.startsWith(SEMANTIC_COLOR)) {
      throw new Error(`colour root '${root}' must name its base as a semantic.color.* token`)
    }
    for (const key of Object.keys(contract)) {
      if (key !== 'base' && !COLOR_COMPANIONS.includes(key)) {
        throw new Error(
          `colour root '${root}' declares '${key}', which is not a companion ` +
            `(${COLOR_COMPANIONS.join(', ')})`,
        )
      }
    }
    for (const companion of COLOR_COMPANIONS) {
      if (!(companion in contract)) {
        throw new Error(
          `colour root '${root}' leaves '${companion}' undeclared -- write a token reference ` +
            'or NONE, so an absence is a decision and not a gap',
        )
      }
      const value = contract[companion]
      if (value !== NONE && (typeof value !== 'string' || !value.startsWith(SEMANTIC_COLOR))) {
        throw new Error(
          `colour root '${root}' declares '${companion}' as ${String(value)} -- a companion is a ` +
            'semantic.color.* reference or NONE',
        )
      }
    }

    const present = tokens.has(contract.base)
    if (present) {
      claim(contract.base, root, 'base')
    }
    for (const companion of COLOR_COMPANIONS) {
      const value = contract[companion]
      if (value === NONE) {
        continue
      }
      if (tokens.has(value)) {
        claim(value, root, companion)
      } else if (present) {
        throw new Error(
          `colour root '${root}' names ${companion} '${value}', which does not exist -- mint ` +
            'the token or declare the absence as NONE',
        )
      }
    }
  }

  for (const [path, token] of tokens) {
    if (!path.startsWith(SEMANTIC_COLOR) || token.type !== 'color') {
      continue
    }
    // The suffix rule first: a token nobody owns BECAUSE the table disagrees with its
    // name gets the message that names the disagreement, not the generic one.
    const { companion, root } = colorRootOf(path.slice(SEMANTIC_COLOR.length))
    if (companion !== null && contracts[root]?.[companion] !== path) {
      throw new Error(
        `'${path}' carries the companion suffix '${companion}' but root '${root}' does not ` +
          `declare it as its ${companion} -- the name is checked against the table, not the ` +
          'table against the name',
      )
    }
    if (!owners.has(path)) {
      throw new Error(
        `'${path}' is owned by no declared root -- every semantic colour token is one role's ` +
          'base or one of its companions (COLOR_ROLE_CONTRACTS)',
      )
    }
  }
}
