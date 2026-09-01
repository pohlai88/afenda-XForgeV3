import { type Contract, contracts, type PropSpec, type SlotSpec } from '@xforge/ui/contracts'

/**
 * The smallest document the grammar accepts for a contract, built from its own
 * declaration.
 *
 * WHY GENERATED. Two conformance suites now mount contracts one at a time --
 * `inert-contracts.spec.ts` and `live-region-politeness.spec.ts` -- and both
 * derive their subjects from the registry by profile. Hand-writing a fixture per
 * contract would put back the list of component names that ADR-025 removed, and
 * it rots the moment a contract gains a required prop or slot. A generator reads
 * the contract, so a contract that changes shape either still mounts or fails
 * loudly.
 *
 * Not a `.spec.ts`, so Playwright's default `testMatch` does not collect it.
 */

export interface ConfigNode {
  component: string
  props?: Record<string, unknown>
  slots?: Record<string, string | ConfigNode[]>
}

const isText = (spec: SlotSpec): spec is Extract<SlotSpec, { text: true }> => 'text' in spec

/** A value satisfying a declared prop, derived from the spec rather than named. */
function sampleValue(spec: PropSpec): unknown {
  if (spec.type === 'enum') {
    return spec.values[0]
  }
  if (spec.type === 'boolean') {
    return true
  }
  return spec.type === 'number' ? 1 : 'x'
}

/**
 * The cheapest contract that satisfies a slot.
 *
 * Prefers one whose own slots are all text or optional, because that terminates
 * the recursion in a single step. Sorted by id first, so the choice is
 * deterministic rather than dependent on declaration order.
 */
function fillerFor(spec: Exclude<SlotSpec, { text: true }>): string {
  if (spec.accepts?.length) {
    const [first] = [...spec.accepts].sort()
    if (first === undefined) {
      throw new Error('slot declares an empty accepts list')
    }
    return first
  }
  // BY KIND WHERE A SLOT OFFERS BOTH AXES, and by capability only where it is
  // the sole option -- `Field.children` accepts `field-control` and declares no
  // kinds at all, so a kinds-only filler threw "no contract satisfies a slot
  // accepting kinds []" while a contract was deliberately mis-declared, which
  // reads as detection and is not.
  //
  // THE ORDER IS NOT ARBITRARY. Capability-first made `Stack` -- whose slot
  // takes `form-field` AND five kinds -- generate `Stack{Field{Checkbox}}`,
  // three contracts deep, when `Stack{Code}` says the same thing about Stack.
  // The inertness suite then reported Stack as wiring an accessible
  // relationship, which was the nested Field's doing and not Stack's: the
  // root-versus-subtree distinction, reappearing in the generator rather than in
  // the assertion. The cheapest legal child keeps a minimal document about the
  // contract under test.
  //
  // Still owed if it ever matters: a slot whose ONLY option is a form-control
  // would put that back, and would need the wiring attributed by differencing
  // the child mounted alone. No slot is shaped that way today.
  const capability = spec.acceptsCapability
  const kinds = spec.acceptsKinds ?? []
  const byKind = kinds.length > 0
  const candidates = Object.entries(contracts)
    .filter(([, c]) =>
      byKind
        ? kinds.includes(c.kind)
        : capability !== undefined && ((c as Contract).capabilities ?? []).includes(capability),
    )
    .sort(([a], [b]) => a.localeCompare(b))
  const terminal = candidates.find(([, c]) =>
    Object.values((c as Contract).slots ?? {}).every((s) => isText(s) || (s.min ?? 0) === 0),
  )
  const chosen = terminal ?? candidates[0]
  if (!chosen) {
    throw new Error(
      byKind
        ? `no contract satisfies a slot accepting kinds [${kinds.join(', ')}]`
        : `no contract provides the capability ${capability}`,
    )
  }
  return chosen[0]
}

/**
 * `props` overrides let a caller pin a declared prop to a specific value -- the
 * politeness suite walks every Alert `tone` rather than accepting the first one
 * `sampleValue` happens to pick. Overrides are merged over the generated props,
 * never instead of them, so a required prop the caller did not mention is still
 * supplied and the document still mounts.
 */
export function minimalDocument(
  id: string,
  overrides: { props?: Record<string, unknown> } = {},
  depth = 0,
): ConfigNode {
  if (depth > 6) {
    throw new Error(`generating a document for ${id} did not terminate`)
  }
  const contract = contracts[id as keyof typeof contracts] as Contract
  const node: ConfigNode = { component: id }

  const props: Record<string, unknown> = {}
  for (const [name, spec] of Object.entries(contract.props ?? {})) {
    if ((spec as PropSpec & { required?: boolean }).required) {
      props[name] = sampleValue(spec)
    }
  }
  Object.assign(props, overrides.props ?? {})
  if (Object.keys(props).length > 0) {
    node.props = props
  }

  const slots: Record<string, string | ConfigNode[]> = {}
  for (const [name, spec] of Object.entries(contract.slots ?? {})) {
    if (isText(spec)) {
      // Filled regardless of `min`: a text slot always accepts a string, and a
      // document missing a required one is refused for a reason that has
      // nothing to do with what the calling suite is testing.
      slots[name] = 'x'
      continue
    }
    if ((spec.min ?? 0) > 0) {
      slots[name] = [minimalDocument(fillerFor(spec), {}, depth + 1)]
    }
  }
  if (Object.keys(slots).length > 0) {
    node.slots = slots
  }
  return node
}
