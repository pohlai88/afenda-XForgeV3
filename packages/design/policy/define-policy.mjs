/**
 * THE POLICY CONTRACT. What every policy in every tree must BE, and the registry
 * invariant no single tree can check about itself.
 *
 * This is the kernel underneath foundation/component/interaction/projection
 * policy trees. It owns the runtime shape of a policy and the cross-tree identity
 * rule: one policy id, one authority.
 *
 * Deliberately small surface:
 *   - POLICY_KINDS
 *   - definePolicy(definition)
 *   - assertPolicyContract(policy)
 *   - assertPolicyRegistry(policies)
 *
 * A policy remains exactly `{ id, kind, assert }`. The hardening is in what this
 * module refuses to accept, not in a larger policy vocabulary.
 */
import { deepFreeze } from './vocabulary.mjs'

export const POLICY_KINDS = deepFreeze(['foundation', 'component', 'interaction', 'projection'])

const POLICY_KIND_SET = new Set(POLICY_KINDS)
const POLICY_FIELDS = deepFreeze(['id', 'kind', 'assert'])
const POLICY_FIELD_SET = new Set(POLICY_FIELDS)
const POLICY_ID = /^(foundation|component|interaction|projection)\.[a-z0-9]+(?:-[a-z0-9]+)*$/

const isPlainRecord = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const printable = (value) => {
  if (typeof value === 'string') {
    return `'${value}'`
  }
  if (value === undefined) {
    return '<missing>'
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Validate and freeze one policy definition.
 *
 * The same object is returned for compatibility with existing policy modules.
 * There are no nested mutable policy fields, so shallow freezing is sufficient:
 * `id` and `kind` are strings and `assert` is a function reference.
 */
export function definePolicy(definition) {
  assertPolicyContract(definition)
  return Object.freeze(definition)
}

/**
 * The exact runtime contract for a policy.
 *
 * Important details:
 *   - own properties only: inherited `id`, `kind`, or `assert` cannot satisfy it;
 *   - symbols are refused: Object.keys() cannot see them, so allowing them would
 *     make the advertised "exactly three fields" contract untrue;
 *   - id namespace and kind must agree;
 *   - the assertion must be executable, not merely named.
 */
export function assertPolicyContract(policy) {
  if (!isPlainRecord(policy)) {
    throw new Error(
      'policy must be a plain object -- a policy the kernel cannot inspect cannot govern anything',
    )
  }

  const ownKeys = Reflect.ownKeys(policy)
  for (const key of ownKeys) {
    if (typeof key !== 'string') {
      throw new Error(
        'policy declares a symbol field -- the policy contract is exactly id, kind, assert and ' +
          'symbol fields are invisible to ordinary registry inspection',
      )
    }
    if (!POLICY_FIELD_SET.has(key)) {
      throw new Error(
        `policy ${printable(policy.id)} declares unknown field '${key}' -- ` +
          `the contract is ${POLICY_FIELDS.join(', ')}`,
      )
    }
  }

  for (const field of POLICY_FIELDS) {
    if (!Object.hasOwn(policy, field)) {
      throw new Error(
        `policy ${printable(policy.id)} is missing own field '${field}' -- inherited policy ` +
          'metadata cannot be a canonical declaration',
      )
    }
  }

  if (typeof policy.id !== 'string' || !POLICY_ID.test(policy.id)) {
    throw new Error(
      `policy id ${printable(policy.id)} must be '<kind>.<name>' using lowercase kebab-case`,
    )
  }

  if (!POLICY_KIND_SET.has(policy.kind)) {
    throw new Error(
      `policy '${policy.id}' has kind ${printable(policy.kind)} -- allowed kinds are ` +
        POLICY_KINDS.join(', '),
    )
  }

  const [idKind] = policy.id.split('.', 1)
  if (idKind !== policy.kind) {
    throw new Error(`policy '${policy.id}' says kind '${policy.kind}' -- its id and kind disagree`)
  }

  if (typeof policy.assert !== 'function') {
    throw new Error(
      `policy '${policy.id}' has no assert function -- policy without enforcement is documentation`,
    )
  }

  return policy
}

/**
 * Validate the cross-tree registry and return its canonical frozen collection.
 *
 * The registry owns identity, so it checks more than each entry can check itself:
 *   - the collection is real and non-empty;
 *   - every entry satisfies the policy contract;
 *   - the same policy id cannot have two authorities;
 *   - the same policy object cannot be inserted twice under the appearance of
 *     two registry slots.
 *
 * A fresh array is frozen rather than freezing the caller's container. Entries
 * are already frozen by `definePolicy` in normal use; `deepFreeze` also makes a
 * raw-but-valid entry immutable if a caller bypassed `definePolicy`.
 */
export function assertPolicyRegistry(policies) {
  if (!Array.isArray(policies) || policies.length === 0) {
    throw new Error(
      'policy registry is empty -- zero policies satisfy every registry invariant while governing nothing',
    )
  }

  const ids = new Set()
  const identities = new Set()
  const canonical = []

  for (const [index, policy] of policies.entries()) {
    assertPolicyContract(policy)

    if (identities.has(policy)) {
      throw new Error(
        `policy '${policy.id}' is the same object at registry slot ${index} more than once -- ` +
          'duplicate slots do not create independent authority',
      )
    }
    identities.add(policy)

    if (ids.has(policy.id)) {
      throw new Error(
        `policy '${policy.id}' is registered twice -- one policy id must have one authority`,
      )
    }
    ids.add(policy.id)
    canonical.push(policy)
  }

  return deepFreeze(canonical)
}
