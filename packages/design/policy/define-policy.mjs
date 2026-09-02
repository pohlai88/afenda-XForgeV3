/**
 * THE POLICY CONTRACT. What every policy in every tree must BE, and the registry
 * invariant no single tree can check about itself.
 *
 * ── WHY IT SITS HERE AND NOT IN A TREE ─────────────────────────────────────
 *
 * It was `foundations/contract.mjs`, and it is not a foundation. A foundation
 * answers "what may a value BE" and is checked against `tokens.json`; this
 * answers "what may a POLICY be", and `interaction/` and `projection/` imported
 * it across into `foundations/` to ask. Every module in all three trees depends
 * on it, which is precisely the shape `index.mjs` records for `vocabulary.mjs` —
 * "the kernel underneath the other three... it sits ABOVE the trees rather than
 * inside one". The same sentence was true of this file while its location said
 * otherwise, so the location moved to match.
 *
 * `foundations/index.mjs` no longer re-exports it either. That barrel is the
 * foundations tree's surface; re-exporting the policy contract through it made
 * `definePolicy` look like a foundation to anything reading the barrel, and the
 * policy root now exports it directly beside `vocabulary.mjs`.
 *
 * ── THE NAME ───────────────────────────────────────────────────────────────
 *
 * `contract.mjs` collided with two unrelated meanings inside one package.
 * `packages/design/policy/contracts.ts` is the COMPONENT registry — what a Button
 * is, which profile it declares, what evidence it owes — and `packages/policy`
 * is business authorisation. Three things called "contract" or "policy" within
 * one repository, and the collision was not theoretical: it produced a request
 * to delete `policy/contracts.ts` as redundant with this file. Named after its
 * export instead, which is what a reader is actually looking for.
 */

import { deepFreeze } from './vocabulary.mjs'

export const POLICY_KINDS = deepFreeze(['foundation', 'component', 'interaction', 'projection'])

const POLICY_ID = /^(foundation|component|interaction|projection)\.[a-z0-9]+(?:-[a-z0-9]+)*$/

export function definePolicy(definition) {
  assertPolicyContract(definition)
  return Object.freeze(definition)
}

export function assertPolicyContract(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    throw new Error(
      'policy must be an object -- a policy the kernel cannot inspect cannot govern anything',
    )
  }

  const keys = Object.keys(policy)
  const allowed = ['id', 'kind', 'assert']

  for (const key of keys) {
    if (!allowed.includes(key)) {
      throw new Error(
        `policy '${policy.id ?? '<unknown>'}' declares unknown field '${key}' -- ` +
          `the contract is ${allowed.join(', ')}`,
      )
    }
  }

  if (typeof policy.id !== 'string' || !POLICY_ID.test(policy.id)) {
    throw new Error(`policy id '${policy.id}' must be '<kind>.<name>' using lowercase kebab-case`)
  }

  if (!POLICY_KINDS.includes(policy.kind)) {
    throw new Error(
      `policy '${policy.id}' has kind '${policy.kind}' -- allowed kinds are ` +
        POLICY_KINDS.join(', '),
    )
  }

  if (!policy.id.startsWith(`${policy.kind}.`)) {
    throw new Error(`policy '${policy.id}' says kind '${policy.kind}' -- its id and kind disagree`)
  }

  if (typeof policy.assert !== 'function') {
    throw new Error(
      `policy '${policy.id}' has no assert function -- policy without enforcement is documentation`,
    )
  }

  return policy
}

export function assertPolicyRegistry(policies) {
  if (!Array.isArray(policies) || policies.length === 0) {
    throw new Error(
      'policy registry is empty -- zero policies satisfy every registry invariant while governing nothing',
    )
  }

  const ids = new Set()

  for (const policy of policies) {
    assertPolicyContract(policy)

    if (ids.has(policy.id)) {
      throw new Error(
        `policy '${policy.id}' is registered twice -- one policy id must have one authority`,
      )
    }

    ids.add(policy.id)
  }

  // FROZEN, BECAUSE AN EXPORTED REGISTRY IS A TABLE LIKE ANY OTHER. It was
  // returned raw, and nothing noticed for as long as no barrel put the three
  // registries where the freeze walk could reach them. The merge did, and
  // `tokens.test.ts` went red on all four at once -- which is the check working:
  // `FOUNDATION_POLICIES.push(...)` was a supported operation on a canonical
  // table, and `definePolicy` freezing each ENTRY had made the collection look
  // protected from the outside.
  return deepFreeze(policies)
}
