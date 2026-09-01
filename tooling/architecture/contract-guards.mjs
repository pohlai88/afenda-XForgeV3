/**
 * Contract guards -- rules checked against the generated OpenAPI document
 * rather than against source text.
 *
 * WHY THIS FILE EXISTS
 *
 * `version-token-on-updates` began as a source guard scanning createRoute
 * blocks for the string "version". It passed its mutation fixture, which used
 * an inline body schema, and then false-positived on the first real route --
 * because real routes reference a named schema (`UpdateEmergencyContact`) and
 * the field lives in the schema, not the block. The guard was correct about
 * nothing; the fixture was just easier than reality.
 *
 * The lesson is not "write a cleverer regex". It is that a rule about the
 * CONTRACT should be checked against the contract, where $refs are resolved and
 * the answer is a fact rather than an inference. Source guards keep the rules
 * that are genuinely about source: imports, dependency direction, wall-clock
 * reads.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../verify/lib/util.mjs'

const SPEC = 'contracts/openapi.generated.json'
const VERBS = ['get', 'post', 'put', 'patch', 'delete']

/**
 * Resolve a local `$ref`, and SAY WHAT HAPPENED.
 *
 * This returned the unresolved node past `depth > 10`, so a pathological or
 * merely deep chain read as "the schema has no properties" and produced a
 * confident false finding -- `version-token-on-updates` announcing a missing
 * version token on an operation whose schema it never actually read.
 *
 * DEPTH IS NOT THE DETECTION MECHANISM. A counter is wrong in both directions:
 * a legitimately deep schema trips it, and a cycle longer than the ceiling does
 * not. A pointer already on the current resolution path IS a cycle,
 * definitionally, at any depth -- so a visited set decides, and the depth
 * ceiling survives only as a last resort against input this reasoning has not
 * anticipated.
 *
 * The set is per-path, not global: the same `$ref` reached twice through
 * different branches is reuse, which is ordinary and legal, and only a pointer
 * repeating within one chain is a cycle.
 *
 * Callers must never read "not RESOLVED" as "the rule does not hold". A
 * resolution failure means the rule COULD NOT BE EVALUATED, which is its own
 * finding and a different one.
 */
const RESOLUTION = {
  COMPOSED: 'composed',
  CYCLIC: 'cyclic',
  DEPTH_LIMIT: 'depth-limit',
  NOT_JSON: 'not-json',
  RESOLVED: 'resolved',
  UNRESOLVABLE: 'unresolvable',
}

/** Generous, and no longer load-bearing: the visited set decides. */
const DEPTH_CEILING = 50

function resolve(doc, node, seen = new Set(), depth = 0) {
  // An ABSENT node is resolved to nothing, not unresolvable. An operation with
  // no request body is a fact about the operation, not a failure to read it.
  if (!node?.$ref) {
    return { kind: RESOLUTION.RESOLVED, node }
  }
  const pointer = node.$ref
  if (!pointer.startsWith('#/')) {
    return { kind: RESOLUTION.UNRESOLVABLE, pointer }
  }
  if (seen.has(pointer)) {
    return { kind: RESOLUTION.CYCLIC, pointer }
  }
  if (depth > DEPTH_CEILING) {
    return { kind: RESOLUTION.DEPTH_LIMIT, pointer }
  }
  const target = pointer
    .slice(2)
    .split('/')
    // `== null`, not `=== null`: a $ref that does not resolve yields
    // undefined, and dereferencing it throws inside a guard.
    // biome-ignore lint/suspicious/noEqualsToNull: matches undefined too, see above
    .reduce((acc, k) => (acc == null ? acc : acc[k.replace(/~1/g, '/').replace(/~0/g, '~')]), doc)
  if (target === undefined || target === null) {
    return { kind: RESOLUTION.UNRESOLVABLE, pointer }
  }
  return resolve(doc, target, new Set(seen).add(pointer), depth + 1)
}

/**
 * The request body schema, or the reason it could not be read.
 *
 * TWO FAILURES USED TO RETURN THE SUCCESS VALUE, and both then read as "the
 * body has no properties" -- which is the exact conflation the doc block above
 * forbids, arriving through the one path that did not go through `resolve()`.
 *
 *   NO application/json  returned `{RESOLVED, node: null}`, indistinguishable
 *                        from an operation with no request body at all.
 *   allOf / oneOf / anyOf  resolves to a node whose `properties` is absent,
 *                        because nothing descends into the members.
 *
 * The consequence is a matched pair, always: `commands-not-status-patches`
 * goes silently green on a PATCH that plainly carries `status`, while
 * `version-token-on-updates` reports "no version token in its request body"
 * for the same operation -- a red whose stated reason is false. It is not
 * hypothetical: this repository's generator emits `allOf` for a registered
 * schema extended with `.extend({ version })`.
 *
 * Composition is REPORTED rather than resolved. Merging `allOf` members is a
 * real feature and a guard may not guess at one; saying "not evaluated" is the
 * honest answer, and it is the answer this file already gives for a cycle.
 */
function requestBodySchema(doc, op) {
  const body = resolve(doc, op.requestBody)
  if (body.kind !== RESOLUTION.RESOLVED) {
    return body
  }
  // No request body at all is a fact about the operation, not a failure.
  if (!body.node) {
    return { kind: RESOLUTION.RESOLVED, node: null }
  }
  const media = body.node.content?.['application/json']
  if (!media) {
    return {
      kind: RESOLUTION.NOT_JSON,
      pointer: Object.keys(body.node.content ?? {}).join(', ') || 'no content',
    }
  }
  const schema = resolve(doc, media.schema)
  if (schema.kind !== RESOLUTION.RESOLVED) {
    return schema
  }
  const composed = ['allOf', 'oneOf', 'anyOf'].find((k) => Array.isArray(schema.node?.[k]))
  return composed ? { kind: RESOLUTION.COMPOSED, pointer: composed } : schema
}

/**
 * The finding a guard makes when it could not read what it needed.
 *
 * Distinct from every rule finding on purpose: "I could not evaluate this" and
 * "this is wrong" are different claims, and collapsing them is what made an
 * unresolved chain look like a missing version token.
 */
function unevaluable(result, where) {
  const WHY = {
    [RESOLUTION.COMPOSED]: (p) =>
      `its request body schema is composed with ${p}, and this guard does not merge members`,
    [RESOLUTION.CYCLIC]: (p) => `its request body schema cycles through ${p}`,
    [RESOLUTION.DEPTH_LIMIT]: (p) => `its request body schema nests past the depth ceiling at ${p}`,
    [RESOLUTION.NOT_JSON]: (p) => `its request body declares ${p}, not application/json`,
    [RESOLUTION.UNRESOLVABLE]: (p) =>
      `its request body schema references ${p}, which does not resolve`,
  }
  const why = WHY[result.kind]?.(result.pointer) ?? `its request body schema is ${result.kind}`
  return {
    message: `${why} -- the rule was NOT EVALUATED, which is not the same as it holding or failing`,
    where,
  }
}

export const contractGuards = [
  {
    check(doc) {
      const out = []
      for (const [path, item] of Object.entries(doc.paths ?? {})) {
        for (const verb of VERBS) {
          const op = item[verb]
          if (op && !op.operationId) {
            out.push({ message: 'no operationId', where: `${verb.toUpperCase()} ${path}` })
          }
        }
      }
      return out
    },
    id: 'operation-id-required',
    law: 3,
    title: 'Every operation has a stable operationId',
  },
  {
    check(doc) {
      const out = []
      for (const [path, item] of Object.entries(doc.paths ?? {})) {
        for (const verb of ['put', 'patch']) {
          const op = item[verb]
          if (!op) {
            continue
          }
          const resolved = requestBodySchema(doc, op)
          const target = op.operationId ?? `${verb.toUpperCase()} ${path}`
          if (resolved.kind !== RESOLUTION.RESOLVED) {
            out.push(unevaluable(resolved, target))
            continue
          }
          const schema = resolved.node
          const props = schema?.properties ?? {}
          if (!('version' in props)) {
            out.push({
              message:
                'update operation has no version token in its request body -- ' +
                'a stale write would be merged rather than rejected with 409',
              where: op.operationId ?? `${verb.toUpperCase()} ${path}`,
            })
          } else if (!(schema.required ?? []).includes('version')) {
            out.push({
              message:
                'version is present but optional -- an omitted version disables the staleness check',
              where: op.operationId ?? `${verb.toUpperCase()} ${path}`,
            })
          }
        }
      }
      return out
    },
    id: 'version-token-on-updates',
    law: 22,
    title: 'Update operations carry a version token (ADR-013)',
  },
  {
    check(doc) {
      const out = []
      for (const [path, item] of Object.entries(doc.paths ?? {})) {
        for (const verb of ['put', 'patch']) {
          const op = item[verb]
          if (op && !op.responses?.['409']) {
            out.push({
              message:
                'no 409 response declared -- the client cannot distinguish a conflict from a generic error',
              where: op.operationId ?? `${verb.toUpperCase()} ${path}`,
            })
          }
        }
      }
      return out
    },
    id: 'conflict-response-declared',
    law: 22,
    title: 'Update operations declare 409 (ADR-013)',
  },
  {
    check(doc) {
      const out = []
      for (const [path, item] of Object.entries(doc.paths ?? {})) {
        const op = item.patch
        if (!op) {
          continue
        }
        const resolved = requestBodySchema(doc, op)
        if (resolved.kind !== RESOLUTION.RESOLVED) {
          out.push(unevaluable(resolved, op.operationId ?? `PATCH ${path}`))
          continue
        }
        const schema = resolved.node
        if (schema?.properties && 'status' in schema.properties) {
          out.push({
            message:
              'PATCH carries a status field -- use an explicit command endpoint (POST .../approve)',
            where: op.operationId ?? `PATCH ${path}`,
          })
        }
      }
      return out
    },
    id: 'commands-not-status-patches',
    law: 17,
    title: 'Consequential transitions are commands, never status patches',
  },
]

export function scanContract() {
  const path = join(ROOT, SPEC)
  if (!existsSync(path)) {
    return { checked: 0, present: false, violations: [] }
  }
  const doc = JSON.parse(readFileSync(path, 'utf8'))
  const violations = []
  for (const g of contractGuards) {
    for (const v of g.check(doc)) {
      violations.push({ guard: g.id, law: g.law, ...v })
    }
  }
  const checked = Object.values(doc.paths ?? {}).reduce(
    (n, item) => n + VERBS.filter((v) => item[v]).length,
    0,
  )
  return { checked, present: true, violations }
}
