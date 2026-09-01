import { deepFreeze } from './freeze.mjs'

/**
 * `dimension` is px and rem ONLY. It briefly allowed `em`, `%`, `ch`, `vh` and
 * `vw`, and that was not merely broad -- it DEFEATED THE TARGET-SIZE FLOOR.
 * `assertTargetFloor` converts rem and otherwise calls `parseFloat`, so a
 * `target-min` of `50%` parsed as 50, cleared a 24px floor, and exited 0 while
 * having no pixel size at all. DTCG permits exactly these two units, so
 * narrowing moves toward conformance rather than away from it.
 *
 * The bare `"0"` is the single documented legacy exception: CSS permits a
 * unitless zero length and `space.0` uses it. DTCG requires the unit even at
 * zero, so this is the one entry that must change shape at migration rather than
 * merely gain an alternative.
 */
/**
 * Exported because the colour policy asks whether a value carries alpha, and that
 * is the same question as "what does a hex colour look like". Keeping it private
 * here and re-deriving it there would give the colour format two definitions --
 * which the split made visible: `carriesAlpha` referenced this constant across a
 * boundary that did not exist while everything lived in one file.
 */
export const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/
const LENGTH = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem)$/
const FONT_STACK = /^[^;{}\r\n]+$/

/** The eighteen DTCG weight aliases, in full. A partial list would be a trap. */
const FONT_WEIGHT_KEYWORDS = new Set([
  'thin',
  'hairline',
  'extra-light',
  'ultra-light',
  'light',
  'normal',
  'regular',
  'book',
  'medium',
  'semi-bold',
  'demi-bold',
  'bold',
  'extra-bold',
  'ultra-bold',
  'black',
  'heavy',
  'extra-black',
  'ultra-black',
])

/**
 * What a value may look like, per declared `$type`.
 *
 * THE INVARIANT IS "the value matches a supported shape for its declared type",
 * NOT "values are strings". Expressed as a table so a DTCG migration WIDENS the
 * entries rather than deleting the check.
 *
 * A TYPE IS ADMITTED ONLY WHERE THE GENERATOR CAN SERIALIZE IT. `duration` and
 * `cubicBezier` were excluded on the strength of that rule's second half: DTCG
 * gives them STRUCTURED forms -- `{value, unit}` and a four-number array -- and
 * the emitter wrote values straight into CSS, so an easy validator would have
 * been exactly how a structured value reaches the stylesheet as `[object
 * Object]`. When they were needed the missing half was BUILT rather than waived:
 * every shape carries `serialize`, the emitter calls it, and both are admitted
 * in their native DTCG form. Modelling them as legacy strings ("1600ms") was
 * rejected -- it would have grown the migration to spite a rule the serializer
 * satisfies in four lines.
 *
 * `color`, `dimension` and `fontFamily` remain in their legacy string forms and
 * are the whole of the remaining migration; `number` and `fontWeight` are
 * already at their final DTCG representation.
 *
 * TWO KINDS OF RULE LIVE IN THIS TABLE, and the distinction is worth keeping
 * visible before it blurs:
 *
 *   REPRESENTATION   is this legal DTCG?   duration is a number plus ms|s
 *   DOMAIN           will Xforge accept it? duration is not negative
 *
 * `duration`'s `value >= 0` is the second kind. DTCG's normative validation
 * restricts the UNIT and says nothing about sign, so a negative duration is
 * conformant and simply useless here. It is deliberately not split into a second
 * registry -- one entry does not earn one -- but a table that quietly becomes a
 * mixture of specification syntax and product judgement is one nobody can later
 * migrate, because there is no way to tell which rules the spec is responsible
 * for. `dimension`'s px/rem narrowing is the same category and is argued above.
 */
export const SUPPORTED_VALUE_SHAPES = deepFreeze({
  color: {
    describe: 'a 6- or 8-digit hex string',
    serialize: (v) => v,
    test: (v) => typeof v === 'string' && HEX.test(v),
  },
  cubicBezier: {
    describe: 'four finite numbers, with the two x coordinates within [0, 1]',
    serialize: (v) => `cubic-bezier(${v.join(', ')})`,
    test: (v) =>
      Array.isArray(v) &&
      v.length === 4 &&
      v.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
      v[0] >= 0 &&
      v[0] <= 1 &&
      v[2] >= 0 &&
      v[2] <= 1,
  },
  dimension: {
    describe: 'a length in px or rem, or a bare "0"',
    serialize: (v) => v,
    test: (v) => typeof v === 'string' && (v === '0' || LENGTH.test(v)),
  },
  duration: {
    describe: 'an object { value, unit } with a non-negative value and unit "ms" or "s"',
    serialize: (v) => `${v.value}${v.unit}`,
    test: (v) =>
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      typeof v.value === 'number' &&
      Number.isFinite(v.value) &&
      v.value >= 0 &&
      (v.unit === 'ms' || v.unit === 's'),
  },
  fontFamily: {
    // Structural CSS characters are refused not because the input is hostile,
    // but because a generator should reject malformed source rather than emit
    // malformed CSS successfully.
    describe: 'a font stack containing no CSS structural characters',
    serialize: (v) => v,
    test: (v) => typeof v === 'string' && v.trim().length > 0 && FONT_STACK.test(v),
  },
  fontWeight: {
    describe: 'a weight from 1 to 1000, or a DTCG weight keyword',
    serialize: (v) => String(v),
    test: (v) =>
      (typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 1000) ||
      (typeof v === 'string' && FONT_WEIGHT_KEYWORDS.has(v)),
  },
  number: {
    describe: 'a finite number',
    serialize: (v) => String(v),
    test: (v) => typeof v === 'number' && Number.isFinite(v),
  },
})

/**
 * The shape table's own rules, so "a type is admitted only where the generator
 * can serialize it" is enforced rather than merely written above the table.
 *
 * A shape missing `serialize` would not fail here and then fail later; it would
 * throw `shape.serialize is not a function` from inside the emitter, at which
 * point the message names the mechanism instead of the policy.
 */
export function assertValueShapeRegistry(shapes = SUPPORTED_VALUE_SHAPES) {
  for (const [type, shape] of Object.entries(shapes)) {
    for (const member of ['test', 'serialize']) {
      if (typeof shape[member] !== 'function') {
        throw new Error(
          `value shape '${type}' has no ${member}() -- a type the generator cannot ` +
            `${member === 'test' ? 'validate' : 'serialize'} must not be admitted`,
        )
      }
    }
    if (typeof shape.describe !== 'string' || shape.describe.trim() === '') {
      throw new Error(
        `value shape '${type}' has no description -- it is the entire text of the refusal ` +
          'a contributor sees, so an empty one turns a good error into a blank one',
      )
    }
  }
}

/**
 * The single place a token value becomes CSS text.
 *
 * Refuses rather than falling back to `String(value)`. A default here would
 * reinstate the `[object Object]` path for the next structured type someone adds,
 * which is the whole reason the emitter stopped doing its own stringification.
 */
/**
 * The value contract, in one place: the type is supported, and the value is a
 * shape that type admits. Returns the shape, so a caller that has just proven a
 * value valid does not look it up a second time.
 *
 * NAMED RATHER THAN LEFT INSIDE `serializeValue`, because serialization is only
 * one thing that depends on validity. `toPixels` is another, and it used to ask
 * a weaker question of its own -- `typeof length === 'string'` -- which is how a
 * string that is not a dimension at all reached it and came back as `null`.
 */
export function assertSupportedValue(type, value) {
  const shape = SUPPORTED_VALUE_SHAPES[type]
  if (!shape) {
    throw new Error(
      `no supported value shape for type '${type}', so nothing can serialize it to CSS`,
    )
  }
  if (!shape.test(value)) {
    throw new Error(
      `${JSON.stringify(value)} is not a valid '${type}' -- it is not ${shape.describe}`,
    )
  }
  return shape
}

export function serializeValue(type, value) {
  // VALIDATES ITS OWN INPUT rather than trusting the caller to have done it. The
  // generator does validate first, so this is currently belt and braces there --
  // but the export is reachable on its own, and `serializeValue('duration', {})`
  // would otherwise reach `${v.value}${v.unit}` and return the string
  // "undefinedundefined". The law is worth stating without an asterisk: NO CALLER
  // CAN SERIALIZE AN INVALID DESIGN VALUE.
  return assertSupportedValue(type, value).serialize(value)
}

/**
 * Conversion to pixels, or `null` where the caller has not said what a rem is.
 *
 * THERE IS NO ROOT SIZE IN THIS MODULE ANY MORE. `PX_PER_UNIT` held `rem: 16`,
 * and `accessibility.mjs` had already written down what a hidden root costs: the
 * target floor and its token "agreed with each other by SHARING A PREMISE rather
 * than by either being true, and a reader whose root was smaller got a target
 * under the floor with everything green". That was fixed for the target floor by
 * making the token `24px` -- and the same 16 went on living here, with every
 * typography floor still measured through it. The premise is the caller's to
 * state now, out loud, somewhere a reader can disagree with it.
 *
 * `null` MEANS ONE THING: a rem with no usable root. After the px/rem narrowing
 * there is no such thing as a valid dimension in an unconvertible unit, and a
 * value that is not a dimension is a refusal rather than a `null` -- `null` would
 * invite the "no pixel size, therefore fine" reading that let `50%` clear a 24px
 * floor as the number 50. It used to be exactly what `toPixels('50%')` returned.
 */
export function toPixels(length, { rootPx } = {}) {
  assertSupportedValue('dimension', length)
  if (length === '0') {
    return 0
  }
  if (length.endsWith('px')) {
    return Number.parseFloat(length)
  }
  // rem is the only remaining unit the shape table admits.
  return typeof rootPx === 'number' && Number.isFinite(rootPx) && rootPx > 0
    ? Number.parseFloat(length) * rootPx
    : null
}
