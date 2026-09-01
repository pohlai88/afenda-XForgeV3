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
import type * as commandPalette from './command-palette'
import type { ContractId, DeclaredProps } from './contracts'
import type * as dataGrid from './data-grid'
import type * as components from './index'

/**
 * EVERY MODULE A CONTRACT CAN LIVE IN, and the union is the maintenance cost of
 * the client-boundary split rather than a design choice.
 *
 * `CommandPalette` and the DataGrid family hold interactive state, so they are
 * `'use client'` and cannot sit in the barrel that server components import --
 * `boundary.tsx` records why. This file consequently holds a second copy of
 * "where components live", which the runtime map also holds. Nothing derives
 * one from the other, so the failure to watch for is a contract added to a
 * module missing here: it would resolve to `undefined`, and the weld below
 * would go red naming the id, which is the outcome worth having.
 */
type Implementations = typeof components & typeof commandPalette & typeof dataGrid

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
