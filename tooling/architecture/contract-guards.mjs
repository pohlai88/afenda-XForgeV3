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

/** Resolve a local $ref against the document. */
function deref(doc, node, depth = 0) {
  if (!node || depth > 10) return node
  if (node.$ref?.startsWith('#/')) {
    const target = node.$ref
      .slice(2)
      .split('/')
      .reduce((acc, k) => (acc == null ? acc : acc[k.replace(/~1/g, '/').replace(/~0/g, '~')]), doc)
    return deref(doc, target, depth + 1)
  }
  return node
}

function requestBodySchema(doc, op) {
  const body = deref(doc, op.requestBody)
  const media = body?.content?.['application/json']
  return media ? deref(doc, media.schema) : null
}

export const contractGuards = [
  {
    id: 'operation-id-required',
    law: 3,
    title: 'Every operation has a stable operationId',
    check(doc) {
      const out = []
      for (const [path, item] of Object.entries(doc.paths ?? {})) {
        for (const verb of VERBS) {
          const op = item[verb]
          if (op && !op.operationId) {
            out.push({ where: `${verb.toUpperCase()} ${path}`, message: 'no operationId' })
          }
        }
      }
      return out
    },
  },
  {
    id: 'version-token-on-updates',
    law: 22,
    title: 'Update operations carry a version token (ADR-013)',
    check(doc) {
      const out = []
      for (const [path, item] of Object.entries(doc.paths ?? {})) {
        for (const verb of ['put', 'patch']) {
          const op = item[verb]
          if (!op) continue
          const schema = requestBodySchema(doc, op)
          const props = schema?.properties ?? {}
          if (!('version' in props)) {
            out.push({
              where: op.operationId ?? `${verb.toUpperCase()} ${path}`,
              message:
                'update operation has no version token in its request body -- ' +
                'a stale write would be merged rather than rejected with 409',
            })
          } else if (!(schema.required ?? []).includes('version')) {
            out.push({
              where: op.operationId ?? `${verb.toUpperCase()} ${path}`,
              message:
                'version is present but optional -- an omitted version disables the staleness check',
            })
          }
        }
      }
      return out
    },
  },
  {
    id: 'conflict-response-declared',
    law: 22,
    title: 'Update operations declare 409 (ADR-013)',
    check(doc) {
      const out = []
      for (const [path, item] of Object.entries(doc.paths ?? {})) {
        for (const verb of ['put', 'patch']) {
          const op = item[verb]
          if (op && !op.responses?.['409']) {
            out.push({
              where: op.operationId ?? `${verb.toUpperCase()} ${path}`,
              message:
                'no 409 response declared -- the client cannot distinguish a conflict from a generic error',
            })
          }
        }
      }
      return out
    },
  },
  {
    id: 'commands-not-status-patches',
    law: 17,
    title: 'Consequential transitions are commands, never status patches',
    check(doc) {
      const out = []
      for (const [path, item] of Object.entries(doc.paths ?? {})) {
        const op = item.patch
        if (!op) continue
        const schema = requestBodySchema(doc, op)
        if (schema?.properties && 'status' in schema.properties) {
          out.push({
            where: op.operationId ?? `PATCH ${path}`,
            message:
              'PATCH carries a status field -- use an explicit command endpoint (POST .../approve)',
          })
        }
      }
      return out
    },
  },
]

export function scanContract() {
  const path = join(ROOT, SPEC)
  if (!existsSync(path)) return { present: false, violations: [], checked: 0 }
  const doc = JSON.parse(readFileSync(path, 'utf8'))
  const violations = []
  for (const g of contractGuards) {
    for (const v of g.check(doc)) violations.push({ guard: g.id, law: g.law, ...v })
  }
  const checked = Object.values(doc.paths ?? {}).reduce(
    (n, item) => n + VERBS.filter((v) => item[v]).length,
    0,
  )
  return { present: true, violations, checked }
}
