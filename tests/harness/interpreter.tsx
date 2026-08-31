/**
 * The conformance harness interpreter.
 *
 * WHAT THIS IS FOR. Every contract and slot declared so far was designed
 * against an imagined caller and checked only structurally: the compiler
 * verified that components match contracts, and a schema verified that
 * documents match the grammar, but nothing ever took a document and produced a
 * screen. A vocabulary that has never been spoken is not known to say anything.
 *
 * So this renders the EXISTING emergency-contacts screen from configuration and
 * the specs compare the result against the hand-built one. The output that
 * matters is not "it rendered" -- it is the list of things the vocabulary could
 * not express, which is the only evidence that the grammar was designed right.
 *
 * WHAT THIS IS NOT. It is not a metadata renderer and must not become one. The
 * permitted pipeline is exactly:
 *
 *     static config -> schema validation -> depth validation
 *                   -> registry resolution -> render
 *
 * and never: API access, policy, permissions, expressions, workflow,
 * persistence, routing or conditional visibility. Each of those is a decision
 * the real renderer has to make properly, and a harness that acquires them
 * becomes a second renderer nobody chose to build -- which is this repository's
 * recurring defect, in the place it would be most expensive.
 *
 * IT ALSO DISCHARGES AN OBLIGATION. JSON Schema cannot express a recursion
 * bound, so `MAX_NESTING_DEPTH` was recorded as owed by "the validator" -- and
 * no validator existed. This is that validator, and the bound is enforced here
 * rather than left as a note in the generated schema's description.
 */
import { contracts, MAX_NESTING_DEPTH } from '@xforge/ui/contracts'
import { resolve } from '@xforge/ui/runtime'
import schema from '@xforge/ui/schema' with { type: 'json' }
import Ajv2020 from 'ajv/dist/2020'
import { createElement, Fragment, type ReactNode } from 'react'

/** A configuration node, as a document carries it. */
export interface ConfigNode {
  component: string
  props?: Record<string, unknown>
  slots?: Record<string, string | ConfigNode[]>
}

const ajv = new Ajv2020({ allErrors: true, discriminator: true, strict: true })
const validate = ajv.compile(schema)

/**
 * Depth, measured before anything is resolved.
 *
 * Checked separately from the schema because JSON Schema has no construct for
 * it: a document can be perfectly valid and still nest deeply enough to exhaust
 * a renderer. Tenant configuration is untrusted input, so the bound is enforced
 * rather than assumed.
 */
function assertDepth(node: ConfigNode, depth = 1): void {
  if (depth > MAX_NESTING_DEPTH) {
    throw new Error(
      `configuration nests deeper than ${MAX_NESTING_DEPTH}, which the schema ` +
        'cannot express and the validator therefore owes',
    )
  }
  for (const value of Object.values(node.slots ?? {})) {
    if (Array.isArray(value)) {
      for (const child of value) {
        assertDepth(child, depth + 1)
      }
    }
  }
}

/** Every component id the document mentions, so all can be resolved up front. */
function idsIn(node: ConfigNode, seen = new Set<string>()): Set<string> {
  seen.add(node.component)
  for (const value of Object.values(node.slots ?? {})) {
    if (Array.isArray(value)) {
      for (const child of value) {
        idsIn(child, seen)
      }
    }
  }
  return seen
}

/** Whether a slot holds exactly one component, per its contract. */
function isSingle(componentId: string, slot: string): boolean {
  const contract = contracts[componentId as keyof typeof contracts] as {
    slots?: Record<string, { max?: number | null }>
  }
  return contract.slots?.[slot]?.max === 1
}

type Registry = Map<string, Parameters<typeof createElement>[0]>

function build(node: ConfigNode, registry: Registry, key?: string): ReactNode {
  const component = registry.get(node.component)
  if (!component) {
    throw new Error(`no implementation resolved for ${node.component}`)
  }

  const props: Record<string, unknown> = { ...node.props, key }

  for (const [slot, value] of Object.entries(node.slots ?? {})) {
    if (typeof value === 'string') {
      props[slot] = value
      continue
    }
    const children = value.map((child, i) => build(child, registry, `${slot}-${i}`))
    // A slot capped at one component is a single ELEMENT, because that is what
    // a composing primitive needs to clone props onto -- Dialog's trigger being
    // the case that forced the distinction.
    props[slot] = isSingle(node.component, slot) ? children[0] : children
  }

  const { children, ...rest } = props
  return createElement(component, rest, children as ReactNode)
}

/**
 * Configuration -> React, refusing anything the grammar does not permit.
 *
 * Async because the runtime registry holds LOADERS rather than components, so
 * a bundler can split them. Everything the document mentions is resolved before
 * rendering begins; a renderer that resolved lazily mid-tree would produce a
 * screen that appears in pieces.
 */
export async function renderConfig(document: unknown): Promise<ReactNode> {
  if (!validate(document)) {
    const problems = (validate.errors ?? [])
      .map((e) => `${e.instancePath || '/'} ${e.message}`)
      .join('; ')
    throw new Error(`configuration is not valid against the UI grammar: ${problems}`)
  }

  const node = document as ConfigNode
  assertDepth(node)

  const registry: Registry = new Map()
  for (const id of idsIn(node)) {
    registry.set(id, (await resolve(id)) as Parameters<typeof createElement>[0])
  }

  return createElement(Fragment, null, build(node, registry))
}
