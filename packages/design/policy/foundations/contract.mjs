import { deepFreeze } from '../vocabulary.mjs'

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
