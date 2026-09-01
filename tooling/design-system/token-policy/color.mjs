import { ACCESSIBILITY_POLICY } from './accessibility.mjs'
import { assertLifecycle } from './contract.mjs'
import { deepFreeze } from './freeze.mjs'
import { assertTokenPath } from './identity.mjs'
import { HEX } from './values.mjs'

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
export const COLOR_ROLE_POLICIES = deepFreeze({
  'border.danger': { kind: 'decorative', reason: 'status is carried by text and surface' },
  'border.default': { kind: 'decorative', reason: 'a divider, never a sole control boundary' },
  // THREE ROLES RATHER THAN ONE OPACITY, and the reason is that CSS `opacity`
  // composites: it produces colours that exist only after render, so the pair the
  // token graph can see stays green while the pixels do not. `text.default` on
  // `surface.raised` reports 17.85:1 and rendered 4.74:1 through `opacity: 0.6`.
  // As explicit roles it is an ordinary pair the contrast invariant already covers.
  'border.disabled': {
    kind: 'decorative',
    reason: 'the boundary of a control that cannot be operated, not one to be found',
  },
  'border.info': { kind: 'decorative', reason: 'status is carried by text and surface' },
  'border.strong': { againstContexts: ['neutral'], kind: 'ui' },
  'border.success': { kind: 'decorative', reason: 'status is carried by text and surface' },
  'border.warning': { kind: 'decorative', reason: 'status is carried by text and surface' },
  'focus.ring': { againstContexts: ['neutral'], kind: 'ui' },
  'overlay.scrim': { kind: 'compositing', reason: 'an alpha layer, not a foreground pair' },
  // WAS `accent.default` AND `accent.hover`. They were the last intent-first
  // names in the semantic colour tier -- danger and warning were normalised to
  // property-first for v2 and these were not, which left one accent surface named
  // for its property (`accent-subtle`, immediately below) and two named for their
  // intent, in the same family. `kind: 'ui'` because a filled accent control is a
  // boundary that must clear 3:1 against the page, and it provides the `accent`
  // context that `text.on-accent` is measured against.
  'surface.accent': { againstContexts: ['neutral'], kind: 'ui', providesContexts: ['accent'] },
  // A PRESSED FILL IS A THIRD FILL, not a hover with a different opacity, and it
  // is here rather than in the stylesheet for the reason the comment above gives:
  // it provides `accent`, so `text.on-accent` is measured on it the day it lands
  // instead of the day somebody remembers. That is the whole return on contexts.
  'surface.accent-active': {
    againstContexts: ['neutral'],
    kind: 'ui',
    providesContexts: ['accent'],
  },
  'surface.accent-hover': {
    againstContexts: ['neutral'],
    kind: 'ui',
    providesContexts: ['accent'],
  },
  'surface.accent-subtle': {
    kind: 'surface',
    // Provides `neutral`, not `accent`: ordinary text sits on this tint, which is
    // what the context names. `accent` is the context of a FILLED accent control,
    // whose foreground is `text.on-accent`.
    providesContexts: ['neutral'],
    reason: 'a tint that content sits on',
  },
  'surface.danger': {
    kind: 'surface',
    providesContexts: ['danger'],
    reason: 'danger text sits on it',
  },
  'surface.disabled': {
    kind: 'surface',
    providesContexts: ['disabled'],
    reason: 'the fill of a disabled control, which its label sits on',
  },
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
  'surface.info': {
    kind: 'surface',
    providesContexts: ['info'],
    reason: 'informational text sits on it',
  },
  // A SEPARATE ROLE FROM `raised`, though it currently resolves to the same
  // primitive in both themes. `ELEVATION_LAYERS` already distinguishes the two
  // layers -- `raised` is a card, `overlay` is a dialog interrupting the page --
  // and both named `surface.raised`, so the model said they were different and
  // the tokens said they were the same. A card and a modal have different
  // responsibilities and will diverge; sharing one token means the day they do,
  // every card changes with them.
  'surface.overlay': {
    kind: 'surface',
    providesContexts: ['neutral'],
    reason: 'the modal layer, which ordinary content sits on',
  },
  'surface.page': {
    kind: 'surface',
    providesContexts: ['neutral'],
    reason: 'the application backdrop',
  },
  'surface.raised': {
    kind: 'surface',
    providesContexts: ['neutral'],
    reason: 'the backdrop of a raised container',
  },
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
  'surface.raised-active': {
    kind: 'surface',
    providesContexts: ['neutral'],
    reason: 'the backdrop of a control being pressed, which its label sits on',
  },
  'surface.raised-hover': {
    kind: 'surface',
    providesContexts: ['neutral'],
    reason: 'the backdrop of a hovered control, which its label sits on',
  },
  'surface.success': {
    kind: 'surface',
    providesContexts: ['success'],
    reason: 'success text sits on it',
  },
  'surface.sunken': {
    kind: 'surface',
    providesContexts: ['neutral'],
    reason: 'the backdrop of a recessed container',
  },
  'surface.warning': {
    kind: 'surface',
    providesContexts: ['warning'],
    reason: 'warning text sits on it',
  },
  'text.danger': { againstContexts: ['danger', 'neutral'], kind: 'text' },
  'text.default': { againstContexts: ['neutral'], kind: 'text' },
  'text.disabled': { againstContexts: ['disabled', 'neutral'], kind: 'inactive' },
  // A SEPARATE ROLE FROM `default`, and the reason is that it changes hue between
  // themes rather than lightness. In light it is executive navy -- the colour
  // that carries authority in a heading or a total, and the one the printed
  // documents already use. On the dark ground that same navy measures 1.40:1, so
  // there the role resolves to near-white and the authority is carried by weight.
  // Binding a heading to `text.default` would have lost that distinction in both
  // directions at once.
  'text.heading': { againstContexts: ['neutral'], kind: 'text' },
  'text.info': { againstContexts: ['info', 'neutral'], kind: 'text' },
  'text.muted': { againstContexts: ['neutral'], kind: 'text' },
  // Consumes `accent` and nothing else. Under the old model this was the single
  // enumerated exception, because deriving it against every backdrop demanded
  // white text clear 4.5 on a white page. A context says the same thing without
  // naming a partner, so a new accent fill is covered the day it lands.
  'text.on-accent': { againstContexts: ['accent'], kind: 'text' },
  'text.success': { againstContexts: ['neutral', 'success'], kind: 'text' },
  'text.warning': { againstContexts: ['neutral', 'warning'], kind: 'text' },
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
export const COLOR_ROLE_GROUPS = deepFreeze(['border', 'focus', 'overlay', 'surface', 'text'])

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

export function assertPolicyRegistry(registry = COLOR_ROLE_POLICIES) {
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
