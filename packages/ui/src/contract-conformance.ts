/**
 * The contracts and the components they describe, checked by the compiler.
 *
 * A contract is a claim about a component: "Button accepts a `variant` of
 * `primary` or `secondary`, and children." Nothing makes that claim true. The
 * component can lose the prop, rename it, narrow the union, or require
 * something the contract never mentions, and the contract goes on describing a
 * component that no longer exists -- a fact with two sources that agree right
 * up until they do not, which is the defect this repository keeps having.
 *
 * So the claim is checked. Every entry in the registry must name an exported
 * component, and that component must accept every prop its contract declares,
 * with the declared type, and children wherever the contract declares a slot.
 *
 * ENTIRELY TYPE-LEVEL. Every import here is `import type`, so this file erases
 * completely and contributes nothing to any bundle -- which matters, because
 * the whole point of the separate `contracts` entrypoint is that reading the
 * vocabulary must not drag the implementations in behind it.
 *
 * WHEN THIS FAILS the error names the component:
 *
 *     Type 'Button' does not satisfy the constraint 'never'.
 *
 * That means Button's props and Button's contract disagree. Fix whichever is
 * wrong -- and the answer is not automatically the contract.
 */
import type { ReactElement, ReactNode } from 'react'
import type { ContractId, DeclaredProps } from './contracts'
import type { ImplementationModules } from './runtime'

/**
 * EVERY MODULE A CONTRACT CAN LIVE IN, derived from `runtime.ts`.
 *
 * Previously this file held a second independent list of the three
 * implementation modules (`index`, `command-palette`, `data-grid`). Adding a
 * new `'use client'` module required updating both files, and the comment here
 * named that as a maintenance cost. Now `runtime.ts` is the single authority:
 * adding a module to the runtime loader automatically includes it in the
 * conformance check.
 */
type Implementations = ImplementationModules

/**
 * Parameter positions are contravariant under `strictFunctionTypes`, so this
 * says: the component must accept AT LEAST what the contract declares. Extra
 * OPTIONAL props are fine and stay invisible to metadata -- `Button.onClick` is
 * a function and could never appear in a contract. An extra REQUIRED prop is
 * not fine, and fails here, because configuration would have no way to supply
 * it.
 */
type AcceptsItsContract<Id extends ContractId> = (
  props: DeclaredProps<Id, ReactNode, ReactElement>,
) => unknown

/** The ids whose component disagrees with its contract. Empty, or a compile error. */
type Mismatched = {
  [Id in ContractId]: Implementations[Id] extends AcceptsItsContract<Id> ? never : Id
}[ContractId]

/** Resolves only when `Mismatched` is empty; otherwise the error names the id. */
type NoMismatches<Ids extends never> = Ids

export type ContractsDescribeTheirComponents = NoMismatches<Mismatched>
