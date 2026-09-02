/**
 * Contract id -> component implementation, resolved at run time.
 *
 * This is the entrypoint a METADATA RENDERER needs and a hand-written screen
 * must never touch. A screen that imports `@xforge/ui` pulls in the two
 * components it uses; a screen that imported this map would pull in all of
 * them, because a lookup table naming every component is a reference to every
 * component. With 33.6 kB of headroom on the employee route -- Next and React
 * having already spent 130 kB of the 180 kB budget -- that distinction is not
 * theoretical. A Stage 8 guard holds it, with the conformance harness and
 * `metadata-ui` as the only permitted importers.
 *
 * LOADERS, NOT COMPONENTS. Each entry is a function returning a promise, so a
 * bundler is free to split them. Today every primitive lives in one module and
 * they will therefore share a chunk -- the shape is what buys the option later,
 * when the data grid and the command palette are the components whose weight
 * actually matters. Saying so plainly is better than implying a split that the
 * current module layout cannot deliver.
 *
 * The map is typed PER ID against the same `DeclaredProps` the contracts
 * derive, so a loader returning the wrong component is a compile error rather
 * than a runtime one -- the second compile-time tie between a contract and the
 * thing it claims to describe.
 */
import type { ReactElement, ReactNode } from 'react'
import type { DeclaredProps, MetadataContractId } from './contracts'

/** A component as the contract describes it. */
type Implementation<Id extends MetadataContractId> = (
  props: DeclaredProps<Id, ReactNode, ReactElement>,
) => ReactNode

type Loader<Id extends MetadataContractId> = () => Promise<Implementation<Id>>

/**
 * A widened component, for a caller resolving an id it only knows at run time.
 *
 * `never` props rather than `any`: a renderer holding one of these cannot
 * invent props and call it directly. It passes a validated document node
 * through `createElement`, where the validation -- not the type -- is what
 * makes the props correct.
 */
export type AnyImplementation = (props: never) => ReactNode

export const runtime: { [Id in MetadataContractId]: Loader<Id> } = {
  Alert: () => import('./index').then((m) => m.Alert),
  Button: () => import('./index').then((m) => m.Button),
  Card: () => import('./index').then((m) => m.Card),
  Checkbox: () => import('./index').then((m) => m.Checkbox),
  Code: () => import('./index').then((m) => m.Code),
  Combobox: () => import('./index').then((m) => m.Combobox),
  CommandPalette: () => import('./command-palette').then((m) => m.CommandPalette),
  DataGrid: () => import('./data-grid').then((m) => m.DataGrid),
  DataGridCell: () => import('./data-grid').then((m) => m.DataGridCell),
  DataGridEditableCell: () => import('./data-grid').then((m) => m.DataGridEditableCell),
  DataGridHeaderCell: () => import('./data-grid').then((m) => m.DataGridHeaderCell),
  DataGridRow: () => import('./data-grid').then((m) => m.DataGridRow),
  Dialog: () => import('./index').then((m) => m.Dialog),
  EmptyState: () => import('./index').then((m) => m.EmptyState),
  Field: () => import('./index').then((m) => m.Field),
  FieldGroup: () => import('./index').then((m) => m.FieldGroup),
  Heading: () => import('./index').then((m) => m.Heading),
  Input: () => import('./index').then((m) => m.Input),
  List: () => import('./index').then((m) => m.List),
  ListItem: () => import('./index').then((m) => m.ListItem),
  Page: () => import('./index').then((m) => m.Page),
  Section: () => import('./index').then((m) => m.Section),
  Skeleton: () => import('./index').then((m) => m.Skeleton),
  Stack: () => import('./index').then((m) => m.Stack),
  Status: () => import('./index').then((m) => m.Status),
  Table: () => import('./index').then((m) => m.Table),
  TableCell: () => import('./index').then((m) => m.TableCell),
  TableHeaderCell: () => import('./index').then((m) => m.TableHeaderCell),
  TableRow: () => import('./index').then((m) => m.TableRow),
  Text: () => import('./index').then((m) => m.Text),
  Toolbar: () => import('./index').then((m) => m.Toolbar),
  ToolbarButton: () => import('./index').then((m) => m.ToolbarButton),
  ToolbarSeparator: () => import('./index').then((m) => m.ToolbarSeparator),
}

/** Every id this registry can resolve. */
export const resolvableIds = Object.keys(runtime) as MetadataContractId[]

/** Resolve an id known only at run time. Rejects rather than returning undefined. */
export async function resolve(id: string): Promise<AnyImplementation> {
  const loader = (runtime as Record<string, (() => Promise<AnyImplementation>) | undefined>)[id]
  if (!loader) {
    throw new Error(`no runtime implementation for contract id ${JSON.stringify(id)}`)
  }
  return await loader()
}
