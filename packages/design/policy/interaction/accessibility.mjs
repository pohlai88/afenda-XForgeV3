/**
 * INTERACTION — accessibility. Normative floors, product benchmarks, adopted
 * interaction floors, and the three levels of evidence that a floor is met.
 *
 * ── THE SEPARATION THIS FILE HOLDS ──────────────────────────────────────────
 *
 * WCAG_MINIMUM is normative. It records published success-criterion floors and
 * this repository may adopt more, never less.
 *
 * ACCESSIBILITY_BENCHMARKS is prior art. Material 3 is useful product-design
 * evidence, but an Android dp is not silently relabelled as a CSS px and a
 * recommendation is not promoted into WCAG by proximity.
 *
 * ACCESSIBILITY_POLICY is ours. Every adopted value either cites a normative
 * floor or says why it exists. A benchmark can inform a house decision without
 * pretending to be the authority for that decision.
 *
 * That distinction matters most for targets:
 *
 *     WCAG 2.5.8       24 CSS px     normative minimum
 *     Afenda pointer   24 CSS px     adopted normative floor
 *     M3 touch         48 dp         external product benchmark
 *     Afenda touch     48 CSS px     house adoption for coarse/touch input
 *
 * The last two deliberately share a number and deliberately do NOT share a
 * unit. The house rule is "48 CSS px for the web product", benchmarked from M3;
 * it is not the false statement "48dp equals 48px".
 *
 * DENSITY MAY COMPRESS PRESENTATION, NEVER OPERABILITY. A 24px visual icon may
 * live inside a larger hit area; compact density is not permission to shrink
 * the active input profile's target floor.
 *
 * ── EVIDENCE, NOT VERDICTS ─────────────────────────────────────────────────
 *
 * POLICY.md 3i states three levels:
 *
 *     A11y-1   automated detectable-rule evidence           mechanical
 *     A11y-2   browser operability evidence                 mechanical
 *     A11y-3   actual assistive-technology output           person, transcribed
 *
 * Each level states both what it answers and what it cannot answer. That second
 * field is load-bearing: a green scan of a tree that never rendered a dialog is
 * not evidence about dialogs, and an ARIA attribute present in the DOM is not
 * evidence of what a screen reader actually announced.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze, toPixels } from '../vocabulary.mjs'

/* -------------------------------------------------------------- standards -- */

/**
 * Published WCAG floors. These are not house preferences.
 *
 * `minimum` is the threshold; `criterion` is the success criterion; `unit`
 * prevents pixels and ratios from becoming accidentally comparable data.
 */
export const WCAG_MINIMUM = deepFreeze({
  target: { criterion: '2.5.8', minimum: 24, unit: 'px' },
  text: { criterion: '1.4.3', minimum: 4.5, unit: 'ratio' },
  ui: { criterion: '1.4.11', minimum: 3, unit: 'ratio' },
})

/* ------------------------------------------------------------- benchmarks -- */

/**
 * Product-design prior art. A benchmark is evidence, not legislation.
 *
 * Material's touch values are recorded in dp because that is how the benchmark
 * states them. The adopted web policy below uses CSS px and explains the
 * translation instead of silently treating the units as interchangeable.
 */
export const ACCESSIBILITY_BENCHMARKS = deepFreeze({
  m3: {
    touchSeparation: {
      minimum: 8,
      status: 'recommendation',
      unit: 'dp',
    },
    touchTarget: {
      minimum: 48,
      status: 'minimum',
      unit: 'dp',
    },
  },
})

/* --------------------------------------------------------------- adopted -- */

const POINTER_TARGET_POLICY = {
  adopted: 24,
  cites: 'target',
  unit: 'px',
}

const TOUCH_TARGET_POLICY = {
  adopted: 48,
  benchmark: 'm3.touchTarget',
  cites: null,
  reason:
    'coarse/touch input adopts a 48 CSS-pixel web hit-area floor, benchmarked from M3 48dp ' +
    'guidance without asserting that CSS px and Android dp are the same unit',
  unit: 'px',
}

/**
 * What this system adopts.
 *
 * Contrast keeps the existing strict policy: 4.5:1 for text regardless of the
 * large-text exemption, 3:1 for non-text UI, and a deliberate 3:1 house floor
 * for inactive controls even though WCAG exempts them.
 *
 * Target policy is now input-profile aware. `pointer` is the normative WCAG
 * floor. `touch` is the stronger product floor. `targetMinimumPx` remains as a
 * compatibility alias for pointer consumers that existed before this split.
 */
export const ACCESSIBILITY_POLICY = deepFreeze({
  contrast: {
    inactive: {
      adopted: 3,
      cites: null,
      reason: 'WCAG exempts inactive components; this system deliberately declines the exemption',
      unit: 'ratio',
    },
    text: { adopted: 4.5, cites: 'text', unit: 'ratio' },
    ui: { adopted: 3, cites: 'ui', unit: 'ratio' },
  },
  target: {
    pointer: POINTER_TARGET_POLICY,
    touch: TOUCH_TARGET_POLICY,
  },

  // Backward-compatible public shape. This MUST remain the pointer floor.
  targetMinimumPx: POINTER_TARGET_POLICY,
})

/** Existing public name: the pointer/WCAG floor in CSS pixels. */
export const TARGET_MINIMUM_PX = ACCESSIBILITY_POLICY.target.pointer.adopted

/** Coarse/touch hit-area floor in CSS pixels. */
export const TOUCH_TARGET_MINIMUM_PX = ACCESSIBILITY_POLICY.target.touch.adopted

/** A contrast ratio lives in (1, 21]. */
const inContrastRange = (value) => typeof value === 'number' && value > 1 && value <= 21

/** A dimensional floor must be finite and strictly positive. */
const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0

function getPath(subject, path) {
  return path.split('.').reduce((value, key) => value?.[key], subject)
}

function assertReasonedHouseRule(name, floor) {
  if (typeof floor.reason !== 'string' || floor.reason.trim() === '') {
    throw new Error(
      `accessibility floor '${name}' cites no criterion and states no reason -- a number ` +
        'with neither a standard behind it nor an argument for it is a preference wearing ' +
        'the word accessibility',
    )
  }
}

function assertCitedFloor(name, floor, cited) {
  const standard = cited[floor.cites]
  if (!standard) {
    throw new Error(
      `accessibility floor '${name}' cites '${floor.cites}', which is not a declared ` +
        `criterion -- the criteria are ${Object.keys(cited).join(', ')}`,
    )
  }

  if (floor.unit !== standard.unit) {
    throw new Error(
      `accessibility floor '${name}' is stated in '${floor.unit}' but WCAG ${standard.criterion} ` +
        `is recorded here in '${standard.unit}' -- a stricter comparison is meaningless until ` +
        'the units agree',
    )
  }

  if (floor.adopted < standard.minimum) {
    throw new Error(
      `accessibility floor '${name}' is ${floor.adopted}${floor.unit === 'ratio' ? ':1' : floor.unit}, ` +
        `below the ${standard.minimum}${standard.unit === 'ratio' ? ':1' : standard.unit} that ` +
        `WCAG ${standard.criterion} requires -- this system may hold itself to more than a ` +
        'success criterion and may not adopt less of one',
    )
  }
}

/**
 * The adopted floors' own rules.
 *
 * The assertion deliberately refuses empty policy, missing target profiles,
 * unit mismatches, unexplained house rules, missing benchmark references, and a
 * compatibility alias that drifts away from the pointer floor.
 *
 * It does NOT compare dp numerically with CSS px. For a cross-unit benchmark,
 * the benchmark proves provenance and the house-rule reason proves the chosen
 * translation. Pretending unlike units are directly comparable would make the
 * assertion look stronger while making it less true.
 */
export function assertAccessibilityPolicy(
  policy = ACCESSIBILITY_POLICY,
  cited = WCAG_MINIMUM,
  benchmarks = ACCESSIBILITY_BENCHMARKS,
) {
  const contrastFloors = Object.entries(policy.contrast ?? {})
  if (contrastFloors.length === 0) {
    throw new Error(
      'the accessibility policy declares no contrast floors -- an empty table satisfies every ' +
        'comparison while measuring nothing',
    )
  }

  for (const [name, floor] of contrastFloors) {
    if (!inContrastRange(floor?.adopted)) {
      throw new Error(
        `contrast floor '${name}' is ${JSON.stringify(floor?.adopted)} -- a contrast ratio is a ` +
          'number in (1, 21], and a missing one fails OPEN because comparisons against undefined ' +
          'do not prove a floor',
      )
    }

    if (floor.unit !== 'ratio') {
      throw new Error(
        `contrast floor '${name}' is stated in '${floor.unit}' -- contrast floors use unit 'ratio'`,
      )
    }

    if (floor.cites === null) {
      assertReasonedHouseRule(`contrast.${name}`, floor)
    } else {
      assertCitedFloor(`contrast.${name}`, floor, cited)
    }
  }

  const targets = Object.entries(policy.target ?? {})
  if (targets.length === 0) {
    throw new Error(
      'the accessibility policy declares no target profiles -- density would then have no ' +
        'operability floor to defer to',
    )
  }

  for (const required of ['pointer', 'touch']) {
    if (!policy.target?.[required]) {
      throw new Error(
        `accessibility target profile '${required}' is missing -- pointer and touch are separate ` +
          'because dense visual geometry must not silently become a coarse-input hit area',
      )
    }
  }

  for (const [name, floor] of targets) {
    if (!isPositiveNumber(floor?.adopted)) {
      throw new Error(
        `target floor '${name}' is ${JSON.stringify(floor?.adopted)} -- a target floor must be a ` +
          'finite positive number',
      )
    }

    if (floor.unit !== 'px') {
      throw new Error(
        `target floor '${name}' is stated in '${floor.unit}' -- adopted web target floors are ` +
          'stated in CSS px so they can be compared to rendered geometry without an assumed root',
      )
    }

    if (floor.cites === null) {
      assertReasonedHouseRule(`target.${name}`, floor)
    } else {
      assertCitedFloor(`target.${name}`, floor, cited)
    }

    if (floor.benchmark !== undefined) {
      const benchmark = getPath(benchmarks, floor.benchmark)
      if (!benchmark) {
        throw new Error(
          `target floor '${name}' names benchmark '${floor.benchmark}', which does not exist -- ` +
            'benchmark provenance must be machine-checkable, not a prose claim',
        )
      }
      if (!isPositiveNumber(benchmark.minimum) || typeof benchmark.unit !== 'string') {
        throw new Error(
          `benchmark '${floor.benchmark}' is incomplete -- a benchmark needs a positive minimum ` +
            'and an explicit unit before it can explain an adopted floor',
        )
      }
      if (benchmark.unit !== floor.unit && floor.cites === null) {
        assertReasonedHouseRule(`target.${name}`, floor)
      }
    }
  }

  if (policy.target.touch.adopted < policy.target.pointer.adopted) {
    throw new Error(
      `touch target floor ${policy.target.touch.adopted}px is below pointer floor ` +
        `${policy.target.pointer.adopted}px -- a coarse-input profile may demand more space, ` +
        'never less',
    )
  }

  if (
    !policy.targetMinimumPx ||
    policy.targetMinimumPx.adopted !== policy.target.pointer.adopted ||
    policy.targetMinimumPx.unit !== policy.target.pointer.unit
  ) {
    throw new Error(
      '`targetMinimumPx` is the backward-compatible pointer alias and has drifted from ' +
        '`target.pointer` -- old and new consumers would enforce different floors',
    )
  }

  return policy
}

/* ---------------------------------------------------------- measurements -- */

function assertPixelTargetMinimum(length, floor, criterion, label) {
  const px = toPixels(length)
  if (px === null) {
    throw new Error(
      `${label} is '${length}', which is a rem -- a target floor cannot be measured through an ` +
        'assumed root size, so this token states pixels or nothing can compare it to the ' +
        `${floor}px floor`,
    )
  }
  if (!(px >= floor)) {
    const provenance = criterion
      ? `WCAG ${criterion} permits documented exceptions, but not a silent one`
      : 'the active input profile adopts this as a product floor; density does not waive it'
    throw new Error(`${label} is ${length} (${px}px), below the ${floor}px floor -- ${provenance}`)
  }
  return px
}

/**
 * Backward-compatible pointer target assertion.
 *
 * Existing callers keep enforcing WCAG 2.5.8's adopted 24 CSS-pixel floor.
 */
export function assertTargetMinimum(length, label = 'semantic.target.minimum') {
  return assertPixelTargetMinimum(length, TARGET_MINIMUM_PX, WCAG_MINIMUM.target.criterion, label)
}

/** Coarse/touch target assertion for hit areas, not necessarily visual bounds. */
export function assertTouchTargetMinimum(length, label = 'semantic.target.touch-minimum') {
  return assertPixelTargetMinimum(length, TOUCH_TARGET_MINIMUM_PX, null, label)
}

/* ---------------------------------------------------------------- levels -- */

/**
 * The three levels of accessibility evidence, and what each one CANNOT answer.
 *
 * A11y-1 intentionally does NOT say "conforms to WCAG". Automated rules can
 * prove the absence of violations they know how to detect in scenarios they
 * actually rendered. That is valuable evidence and still not a conformance
 * verdict.
 *
 * A11y-2 names four separate focus obligations: reachability, visibility, order,
 * and restoration. Enterprise dialogs, sheets, grids and bulk-action surfaces
 * can pass "focus moved" while still failing one of the other three.
 *
 * A11y-3 names no universal screen-reader brand. The supported assistive
 * technology belongs to `interaction.profile`; changing that profile invalidates
 * the evidence rather than leaving a hard-coded NVDA/JAWS sentence behind.
 */
export const A11Y_LEVELS = deepFreeze({
  'A11y-1': {
    answers:
      'the rendered scenarios contain no mechanically detectable WCAG A/AA violations covered ' +
      'by the configured automated rules',
    cannot:
      'prove WCAG conformance, assess a component or state it never rendered, or determine ' +
      'whether the resulting interaction is understandable and operable with assistive technology',
    manual: false,
    mechanism: ['e2e/a11y-conformance.spec.ts', 'e2e/design-system-conformance.spec.ts'],
    rank: 1,
  },
  'A11y-2': {
    answers:
      'operability in a real browser: keyboard reachability, visible focus, focus order and ' +
      'restoration, accessible name/role/state/value, ARIA relationships and non-pointer alternatives',
    cannot:
      'prove what assistive technology announces or whether the announced interaction model is ' +
      'understandable to a person using it',
    manual: false,
    mechanism: ['e2e/a11y-conformance.spec.ts', 'e2e/design-system-conformance.spec.ts'],
    rank: 2,
  },
  'A11y-3': {
    answers:
      'what the supported assistive technology ACTUALLY SAID, transcribed verbatim, per scenario',
    cannot:
      'be generated, scheduled or inferred. It is evidence from a person using the assistive ' +
      'technology named by interaction.profile, and it is stale when that profile or its ' +
      'interaction revision moves',
    manual: true,
    mechanism: ['.architecture/a11y-evidence.json'],
    rank: 3,
  },
})

/**
 * The level model's own rules.
 *
 * In addition to the previous invariants, ranks must now be contiguous from 1.
 * A missing rank would otherwise make "the level below" undefined while every
 * individual level still looked valid.
 */
export function assertA11yLevels(levels = A11Y_LEVELS) {
  const entries = Object.entries(levels)
  if (entries.length === 0) {
    throw new Error(
      'no accessibility levels are declared -- an empty model satisfies every rule below ' +
        'while describing no evidence at all',
    )
  }

  const ranks = new Map()
  const manual = []

  for (const [id, level] of entries) {
    for (const field of ['answers', 'cannot']) {
      if (typeof level[field] !== 'string' || level[field].trim() === '') {
        throw new Error(
          `accessibility level '${id}' states no '${field}' -- a level that advertises what it ` +
            'answers and not what it cannot is how a scan gets read as a verdict',
        )
      }
    }

    if (!Array.isArray(level.mechanism) || level.mechanism.length === 0) {
      throw new Error(
        `accessibility level '${id}' names no mechanism -- a check named only in prose can ` +
          'survive after its caller is deleted while the repository stays green',
      )
    }

    if (typeof level.manual !== 'boolean') {
      throw new Error(
        `accessibility level '${id}' does not say whether it is manual -- that field decides ` +
          'whether a missing result is a red build or a human evidence obligation',
      )
    }
    if (level.manual) {
      manual.push(id)
    }

    if (!Number.isInteger(level.rank) || level.rank < 1) {
      throw new Error(
        `accessibility level '${id}' has rank ${JSON.stringify(level.rank)} -- ranks are positive ` +
          'integers because they state capability order, not display order',
      )
    }

    const held = ranks.get(level.rank)
    if (held !== undefined) {
      throw new Error(
        `accessibility levels '${held}' and '${id}' both hold rank ${level.rank} -- each level ` +
          'answers a question the one below it cannot, so one rank cannot name two capabilities',
      )
    }
    ranks.set(level.rank, id)
  }

  if (manual.length !== 1) {
    throw new Error(
      `${manual.length} accessibility levels are manual (${manual.join(', ') || 'none'}) -- ` +
        'interaction.profile derives ONE human evidence obligation into ONE ledger. Zero manual ' +
        'levels removes that proof; two creates competing ledgers',
    )
  }

  const orderedRanks = [...ranks.keys()].sort((a, b) => a - b)
  for (let index = 0; index < orderedRanks.length; index += 1) {
    const expected = index + 1
    if (orderedRanks[index] !== expected) {
      throw new Error(
        `accessibility evidence ranks are ${orderedRanks.join(', ')} -- rank ${expected} is ` +
          'missing, so the capability ladder has a hole',
      )
    }
  }

  return levels
}

/* --------------------------------------------------------------- coverage -- */

/**
 * Proves that every scenario derived from `interaction.profile` has evidence.
 *
 * This assertion intentionally accepts the two sets rather than importing the
 * profile here: accessibility owns the invariant, while interaction.profile owns
 * the vocabulary from which required scenarios are derived.
 *
 * The caller should pass stable scenario ids, for example:
 *
 *   dialog.open.keyboard
 *   dialog.close.focus-return
 *   combobox.error.announcement
 *
 * A scan cannot prove a state that never entered the rendered tree; this is the
 * guard against "green because absent".
 */
export function assertA11yCoverage(requiredScenarios, provenScenarios, label = 'accessibility') {
  if (!Array.isArray(requiredScenarios) || requiredScenarios.length === 0) {
    throw new Error(
      `${label} requires no scenarios -- an empty requirement set makes complete coverage ` +
        'indistinguishable from measuring nothing',
    )
  }
  if (!Array.isArray(provenScenarios)) {
    throw new Error(`${label} proven scenarios must be an array`)
  }

  const required = new Set(requiredScenarios)
  const proven = new Set(provenScenarios)

  if (required.size !== requiredScenarios.length) {
    throw new Error(`${label} required scenarios contain duplicate ids`)
  }
  if (proven.size !== provenScenarios.length) {
    throw new Error(`${label} proven scenarios contain duplicate ids`)
  }

  for (const id of required) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error(`${label} required scenario ids must be non-empty strings`)
    }
  }
  for (const id of proven) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error(`${label} proven scenario ids must be non-empty strings`)
    }
  }

  const missing = [...required].filter((id) => !proven.has(id))
  if (missing.length > 0) {
    throw new Error(
      `${label} is missing evidence for ${missing.length} required scenario(s): ${missing.join(', ')} -- ` +
        'an unrendered scenario is absent evidence, not a passing accessibility result',
    )
  }

  return provenScenarios
}

/* --------------------------------------------------------------- policy -- */

export const accessibilityPolicy = definePolicy({
  assert: assertA11yLevels,
  id: 'interaction.accessibility',
  kind: 'interaction',
})
