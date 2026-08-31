/**
 * The generated UI schema, checked against documents it must refuse.
 *
 * A schema is a governance tool, and ADR-024's rule applies to it exactly as it
 * applied to dependency-cruiser: it is not known to work until it has rejected
 * something. A generated schema is especially easy to get wrong in the
 * permissive direction -- forget `additionalProperties: false` and every typo
 * validates, forget `minItems` and an empty list passes, and the suite stays
 * green because everything valid is still valid.
 *
 * So the emphasis here is on refusal. The accepting cases exist to prove the
 * schema has not simply been made impossible to satisfy, which is the other way
 * a validator can be useless.
 */
import Ajv2020 from 'ajv/dist/2020'
import { describe, expect, it } from 'vitest'
import schema from '../../packages/ui/generated/schema.json' with { type: 'json' }

/**
 * `allErrors` because an author fixing configuration wants every problem at
 * once, and `discriminator` because without it that setting makes validation
 * exponential in nesting depth -- see the cost test at the bottom of this file.
 */
const ajv = new Ajv2020({ allErrors: true, discriminator: true, strict: true })
const validate = ajv.compile(schema)

/**
 * Written as statements, not an object literal, because `validate.errors` is
 * only meaningful AFTER `validate(doc)` has run.
 *
 * It was an object literal, and a key sorter moved `errors` above `ok` -- so
 * the errors reported belonged to the previous call. The tests still passed,
 * because they assert on `ok`; the diagnostics had quietly become fiction.
 * Restoring the order would leave the same trap for the next sorter, so the
 * sequence is expressed as a sequence and no ordering rule can reach it.
 */
const check = (doc: unknown) => {
  const ok = validate(doc) as boolean
  const errors = (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`).join('; ')
  return { errors, ok }
}

describe('the generated UI schema', () => {
  it('compiles under strict mode, which catches a malformed schema', () => {
    expect(typeof validate).toBe('function')
  })

  it('describes every component the registry exposes', () => {
    const defs = Object.keys(schema.$defs).filter((k) => k !== 'node')
    expect(defs).toContain('Button')
    expect(defs).toContain('Alert')
    expect(defs.length).toBeGreaterThanOrEqual(11)
  })
})

describe('what the schema accepts', () => {
  it('a text leaf with a declared enum prop', () => {
    expect(
      check({ component: 'Text', props: { tone: 'muted' }, slots: { children: 'Hello' } }).ok,
    ).toBe(true)
  })

  it('a container holding a permitted child kind', () => {
    const doc = {
      component: 'Card',
      props: { labelledBy: 'h' },
      slots: {
        children: [
          { component: 'Heading', props: { id: 'h', level: 2 }, slots: { children: 'Contacts' } },
        ],
      },
    }
    expect(check(doc).ok).toBe(true)
  })

  it('a list of list items, which is the only thing a list may hold', () => {
    const doc = {
      component: 'List',
      slots: {
        children: [
          {
            component: 'ListItem',
            slots: { children: [{ component: 'Code', slots: { children: 'x' } }] },
          },
        ],
      },
    }
    expect(check(doc).ok).toBe(true)
  })
})

describe('what the schema refuses', () => {
  it('a component nobody registered', () => {
    expect(check({ component: 'Toolbar', slots: { children: 'x' } }).ok).toBe(false)
  })

  // The grammar's whole reason for existing. Both are registered components, so
  // a vocabulary-only check would pass this happily.
  it('a Button inside a List, where only ListItem is permitted', () => {
    const doc = {
      component: 'List',
      slots: { children: [{ component: 'Button', slots: { children: 'Save' } }] },
    }
    expect(check(doc).ok).toBe(false)
  })

  it('a Button inside an Alert, whose slot takes content only', () => {
    const doc = {
      component: 'Alert',
      props: { tone: 'danger' },
      slots: { children: [{ component: 'Button', slots: { children: 'Retry' } }] },
    }
    expect(check(doc).ok).toBe(false)
  })

  it('a missing required prop', () => {
    // Alert without a tone has no politeness and therefore no announced
    // behaviour -- the failure this required prop exists to prevent.
    const doc = {
      component: 'Alert',
      slots: { children: [{ component: 'Text', slots: { children: 'x' } }] },
    }
    expect(check(doc).ok).toBe(false)
  })

  it('a value outside a declared enum', () => {
    expect(
      check({ component: 'Button', props: { variant: 'ghost' }, slots: { children: 'x' } }).ok,
    ).toBe(false)
  })

  // A typo that validates is a setting the author believes they made.
  it('an unknown prop', () => {
    expect(
      check({ component: 'Text', props: { colour: 'red' }, slots: { children: 'x' } }).ok,
    ).toBe(false)
  })

  it('an unknown slot', () => {
    expect(check({ component: 'Text', slots: { footer: 'x' } }).ok).toBe(false)
  })

  it('elements where the slot holds text', () => {
    const doc = { component: 'Heading', slots: { children: [{ component: 'Text' }] } }
    expect(check(doc).ok).toBe(false)
  })

  it('text where the slot holds elements', () => {
    expect(check({ component: 'Card', slots: { children: 'just a string' } }).ok).toBe(false)
  })

  it('an empty required slot', () => {
    expect(check({ component: 'Card', slots: { children: [] } }).ok).toBe(false)
  })
})

describe('what the schema deliberately does NOT enforce', () => {
  /**
   * Nesting depth. The recursion here is unbounded by construction, and JSON
   * Schema has no way to express a depth limit -- so a document can be valid
   * against this schema and still exceed MAX_NESTING_DEPTH.
   *
   * Asserted as a PASS rather than left unmentioned, because the gap is the
   * point: a reader who validates configuration against the schema alone needs
   * to know precisely which guarantee they have not obtained. The validator
   * owes this check; the schema cannot.
   */
  it('accepts a document deeper than the stated maximum', () => {
    expect(check(nested(30)).ok).toBe(true)
    expect(schema.description).toContain('nesting depth')
  })
})

/** A validly-nested document `depth` levels deep. */
function nested(depth: number): unknown {
  let doc: unknown = { component: 'Text', slots: { children: 'deep' } }
  for (let i = 0; i < depth; i += 1) {
    doc = { component: 'Stack', slots: { children: [doc] } }
  }
  return doc
}

/**
 * Validation cost, which is a correctness property here rather than a nicety.
 *
 * Metadata documents are tenant configuration: untrusted input. Written as a
 * plain `anyOf` union this schema validated in 80 seconds at depth 12 and was
 * unbounded beyond it -- a denial of service reachable by anyone permitted to
 * customise a screen. The `discriminator` tag turns branch selection into a
 * lookup.
 *
 * The assertion is deliberately loose. It is not measuring how fast a machine
 * is; it is measuring that cost has not gone EXPONENTIAL again, and the gap
 * between the two regimes is five orders of magnitude.
 */
describe('validation cost', () => {
  it('stays fast as documents nest, rather than exploding', () => {
    const elapsed = (depth: number) => {
      const doc = nested(depth)
      const started = performance.now()
      validate(doc)
      return performance.now() - started
    }

    elapsed(4) // warm the JIT, so the first measurement is not the slowest
    const deep = elapsed(20)

    // Exponential behaviour put depth 12 at 80000ms. Anything under a second at
    // depth 20 is unambiguously the other regime.
    expect(deep).toBeLessThan(1000)
  })

  it('keeps the discriminator that makes that true', () => {
    expect(schema.$defs.node).toMatchObject({
      discriminator: { propertyName: 'component' },
      type: 'object',
    })
  })
})
