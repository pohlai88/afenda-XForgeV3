#!/usr/bin/env tsx
/**
 * UI contracts -> JSON Schema.
 *
 * The contracts are the authority; this is DERIVED (law 27, and the `generate`
 * stage asserts it is byte-identical after regeneration). Two places describing
 * what a Button accepts is the defect this repository keeps having, so the
 * second place is generated rather than written.
 *
 * WHY A SCHEMA AT ALL, when the compiler already checks the contracts. Because
 * the compiler is not present when a metadata document arrives at run time. A
 * tenant's configuration is JSON that was not written in TypeScript and was not
 * compiled against anything; the schema is how the grammar gets enforced on the
 * thing that actually shows up. The two checks cover different moments and
 * neither replaces the other.
 *
 * WHAT THE SCHEMA CANNOT EXPRESS. Nesting depth. JSON Schema has no construct
 * for "no deeper than MAX_NESTING_DEPTH", and the recursive `$ref` here is
 * unbounded by construction. Depth is therefore a VALIDATOR obligation, not a
 * schema one -- recorded in the generated document so that a reader who checks
 * their configuration against the schema alone knows exactly which guarantee
 * they have not obtained.
 *
 * WHY THE UNIONS ARE DISCRIMINATED, and this is not a micro-optimisation.
 * Written the obvious way -- `anyOf` over every permitted component --
 * validation cost is EXPONENTIAL in nesting depth, because a validator
 * collecting all errors explores all eleven branches at every level and
 * descends the whole subtree of each. Measured against ajv 8.20.0 with
 * `allErrors: true`:
 *
 *     depth  6      110 ms
 *     depth  8      548 ms
 *     depth 10     4700 ms
 *     depth 12    80598 ms
 *
 * Metadata documents are TENANT CONFIGURATION, which is untrusted input. A
 * fifteen-level document would have hung the validator -- a denial of service
 * in the metadata plane, reachable by anyone allowed to customise a screen.
 *
 * Tagging each union with `discriminator` on `component` makes branch selection
 * a lookup instead of a search: depth 40 validates in 0.1 ms with all errors
 * still collected.
 *
 * `discriminator` is an OpenAPI keyword rather than a JSON Schema 2020-12 one,
 * so CORRECTNESS must not depend on it, and does not: every branch carries a
 * distinct `component` const, so exactly one can ever match and plain `oneOf`
 * semantics are identical. A validator that ignores the keyword gets the same
 * verdict, more slowly. Only the cost depends on it.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  type Contract,
  contracts,
  type Kind,
  MAX_NESTING_DEPTH,
  type MetadataContractId,
  metadataContractIds,
  type PropSpec,
  type SlotSpec,
  UI_LANGUAGE_VERSION,
} from '../../packages/ui/src/contracts'

const ROOT = join(import.meta.dirname, '../..')
const OUTPUT = join(ROOT, 'packages/ui/generated/schema.json')

type Json = Record<string, unknown>

/** Indexed with the id TYPE, not a widening cast: the lookup cannot miss. */
const kindOf = (id: MetadataContractId): Kind => contracts[id].kind

/** A prop spec as a JSON Schema fragment. */
function propSchema(spec: PropSpec): Json {
  if (spec.type === 'enum') {
    return { enum: [...spec.values] }
  }
  return { type: spec.type }
}

/**
 * The set of component ids a slot will accept, resolved from ids and kinds
 * together. Resolving kinds HERE rather than emitting a kind test means the
 * generated schema names components, so a validation error reads "expected one
 * of Heading, Text" rather than "expected something of kind content".
 */
function acceptedIds(spec: Exclude<SlotSpec, { text: true }>): MetadataContractId[] {
  const byId = (spec.accepts ?? []) as readonly MetadataContractId[]
  const byKind = metadataContractIds.filter((id) => (spec.acceptsKinds ?? []).includes(kindOf(id)))
  return [...new Set([...byId, ...byKind])].sort()
}

/**
 * A union over component ids, tagged so branch selection is a lookup.
 *
 * `type: 'object'` is required next to `discriminator` under ajv's strict mode,
 * and is true regardless. A single permitted component needs no union at all.
 */
function unionOf(ids: readonly MetadataContractId[]): Json {
  const refs = ids.map((id) => ({ $ref: `#/$defs/${id}` }))
  const [only] = refs
  if (only && refs.length === 1) {
    return only
  }
  return {
    discriminator: { propertyName: 'component' },
    oneOf: refs,
    type: 'object',
  }
}

function slotSchema(spec: SlotSpec): Json {
  if ('text' in spec) {
    return { type: 'string' }
  }
  const schema: Json = { items: unionOf(acceptedIds(spec)), type: 'array' }
  if (typeof spec.min === 'number') {
    schema.minItems = spec.min
  }
  if (typeof spec.max === 'number') {
    schema.maxItems = spec.max
  }
  return schema
}

function nodeSchema(id: MetadataContractId, contract: Contract): Json {
  const properties: Json = { component: { const: id } }
  const required = ['component']

  const props = Object.entries(contract.props ?? {})
  if (props.length > 0) {
    const requiredProps = props.filter(([, s]) => s.required).map(([name]) => name)
    properties.props = {
      properties: Object.fromEntries(props.map(([name, s]) => [name, propSchema(s)])),
      type: 'object',
      ...(requiredProps.length > 0 ? { required: requiredProps.sort() } : {}),
      // Refusing unknown props is the whole value of validating configuration:
      // a typo that is silently ignored is a setting the author believes they
      // made.
      additionalProperties: false,
    }
    if (requiredProps.length > 0) {
      required.push('props')
    }
  }

  const slots = Object.entries(contract.slots ?? {})
  if (slots.length > 0) {
    const requiredSlots = slots
      .filter(([, s]) => !('text' in s) && (s.min ?? 0) > 0)
      .map(([name]) => name)
    properties.slots = {
      properties: Object.fromEntries(slots.map(([name, s]) => [name, slotSchema(s)])),
      type: 'object',
      ...(requiredSlots.length > 0 ? { required: requiredSlots.sort() } : {}),
      additionalProperties: false,
    }
    if (requiredSlots.length > 0) {
      required.push('slots')
    }
  }

  return {
    additionalProperties: false,
    description:
      `${contract.kind} / ${contract.interaction.profile} ` +
      `(contract v${contract.contractVersion}, interaction r${contract.interaction.revision})`,
    properties,
    required: required.sort(),
    title: id,
    type: 'object',
  }
}

const exposed = [...metadataContractIds].sort()

const schema = {
  $defs: {
    node: {
      description: 'Any component configuration may name.',
      ...unionOf(exposed),
    },
    ...Object.fromEntries(exposed.map((id) => [id, nodeSchema(id, contracts[id])])),
  },
  $id: `https://xforge.internal/schemas/ui-language/${UI_LANGUAGE_VERSION}.json`,
  $ref: '#/$defs/node',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  description:
    'GENERATED from packages/ui/src/contracts.ts. Never hand-edited (law 27).\n' +
    `UI language version ${UI_LANGUAGE_VERSION}.\n` +
    'NOT ENFORCED HERE: nesting depth. JSON Schema cannot express a recursion ' +
    'bound, so a document valid against this schema may still exceed the stated ' +
    `maximum of ${MAX_NESTING_DEPTH}. That check belongs to the validator.\n` +
    'Unions carry an OpenAPI `discriminator` on `component`. It is a performance ' +
    'affordance only: every branch has a distinct `component` const, so a ' +
    'validator ignoring the keyword reaches the same verdict by plain `oneOf`.',
  title: 'Xforge UI language',
} satisfies Json

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, `${JSON.stringify(schema, null, 2)}\n`)
process.stdout.write(
  `ui schema: ${exposed.length} components -> packages/ui/generated/schema.json\n`,
)
