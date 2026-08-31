/**
 * The UI contracts -- the metadata vocabulary authority.
 *
 * This file answers one question: what can configuration SAY? The metadata
 * renderer (architecture sections 5 and 7.4) composes screens from
 * configuration rather than JSX, and a component library that serves only JSX
 * authors gets rewritten the day that renderer lands. So the vocabulary is
 * declared here, once, and everything else is derived from it.
 *
 * PURE SERIALIZABLE DATA. No functions, no React nodes, no closures, no
 * imported runtime objects. The same contract has to be read by the TypeScript
 * compiler, a JSON Schema generator, a metadata validator, architecture guards,
 * AI tooling and possibly Figma -- and not one of those should be executing
 * arbitrary JavaScript to find out what a Button is. A test asserts the whole
 * registry survives a JSON round trip, because "pure data" is otherwise a
 * convention that lasts until the first convenient helper function.
 *
 * `kind` AND `interaction.profile` ARE ORTHOGONAL. This is the correction that
 * matters most. Dialog is a `layout` component and carries the most
 * consequential focus management in the system -- modal trapping, initial and
 * final focus, Escape to close. Gating accessibility evidence by `kind` would
 * exempt it, and a Skeleton would be asked for an NVDA scenario for a shimmer.
 * So `kind` governs grammar and composition; `profile` governs behavioural
 * semantics and what accessibility evidence a component owes.
 *
 * A GRAMMAR, NOT A VOCABULARY. Without composition rules, configuration can put
 * a Toolbar inside a Field's error slot and every guard passes, because both
 * are registered. Each slot states what it accepts and how many.
 *
 * WHAT IS DELIBERATELY ABSENT. Event handlers. `Button.onClick` is a function
 * and therefore cannot appear here; metadata will reference actions by
 * identifier through the command layer instead. That omission is the contract
 * doing its job, not a gap in it.
 *
 * Contracts are added HERE when their component exists, never in advance. A
 * contract without a runtime resolver fails the resolver guard, which is the
 * property that stops this file becoming a wish list.
 */

/**
 * A breaking change to the document shape or the grammar itself -- not to any
 * one component. Established now as a field; no migration framework is built
 * for it, because there is nothing yet to migrate.
 */
export const UI_LANGUAGE_VERSION = 1

/**
 * How deep a configuration tree may nest. Stated rather than left implicit: an
 * unbounded grammar is one where a generated document can exhaust the renderer,
 * and "how deep is too deep" is a decision, not a discovery.
 */
export const MAX_NESTING_DEPTH = 8

/** Governs grammar and composition: where a component may legally appear. */
export type Kind = 'layout' | 'content' | 'field' | 'action' | 'collection' | 'feedback'

/**
 * Governs behavioural semantics, and what accessibility evidence is owed.
 *
 *   none            no interactive behaviour of its own
 *   native-control  a native element carrying the platform's own semantics
 *   form-control    labelling, description and validity wiring
 *   modal           focus trapping, initial and final focus, Escape
 *   composite       one tab stop, arrow-key navigation within
 *   composite-grid  as composite, in two dimensions, per the APG grid pattern
 *   live-region     announces asynchronously; politeness is the whole design
 *
 * Stage 8 gates A11y-3 (assistive-technology evidence) on this, not on `kind`.
 */
export type InteractionProfile =
  | 'none'
  | 'native-control'
  | 'form-control'
  | 'modal'
  | 'composite'
  | 'composite-grid'
  | 'live-region'

/** Profiles owing recorded screen-reader evidence before a contract may ship. */
export const PROFILES_REQUIRING_AT_EVIDENCE = [
  'form-control',
  'modal',
  'composite',
  'composite-grid',
] as const satisfies readonly InteractionProfile[]

/**
 * `metadata` is vocabulary configuration may name. `internal` is legitimate
 * implementation that is illegal vocabulary -- VisuallyHidden, Portal, GridRow.
 * The guard is deliberately NOT "every primitive is registered".
 */
export type Exposure = 'metadata' | 'internal'

export type PropSpec =
  | { type: 'string'; required?: boolean }
  | { type: 'boolean'; required?: boolean }
  | { type: 'number'; required?: boolean }
  /**
   * Enum values may be numbers as well as strings. `Heading.level` is 1, 2 or 3
   * and is a number in both the component and the JSON a metadata document
   * would carry; writing it as the strings '1' | '2' | '3' to keep this type
   * tidy would have made the contract disagree with the component it describes,
   * and the type-level check below would have caught it as a compile error --
   * which is the check earning its place.
   */
  | { type: 'enum'; values: readonly (string | number)[]; required?: boolean }

/**
 * A slot holds either free text or child components, never both. Mixing them
 * makes the accessible name of a node ambiguous, and a grammar whose meaning
 * depends on which case a document happened to use is not one worth having.
 */
export type SlotSpec =
  | { text: true }
  | {
      accepts?: readonly string[]
      acceptsKinds?: readonly Kind[]
      min?: number
      /** `null` means unbounded, and is written rather than left off. */
      max?: number | null
    }

export interface Contract {
  /** The component's own public metadata contract. Bumped on prop changes. */
  contractVersion: number
  exposure: Exposure
  interaction: { profile: InteractionProfile; revision: number }
  kind: Kind
  props?: Readonly<Record<string, PropSpec>>
  slots?: Readonly<Record<string, SlotSpec>>
}

/**
 * The registry.
 *
 * `interaction.revision` is 0 where a component has no interactive behaviour to
 * version. It is 1 and upwards where it does, and changing keyboard, focus or
 * ARIA behaviour bumps it -- which invalidates that component's recorded
 * screen-reader evidence. `contractVersion` moves independently: adding a
 * Button variant invalidates no evidence at all.
 */
export const contracts = {
  Alert: {
    contractVersion: 1,
    exposure: 'metadata',
    // Politeness is chosen by tone, not by the caller: danger and warning
    // interrupt, info does not. That is behaviour, so it carries a revision.
    interaction: { profile: 'live-region', revision: 1 },
    kind: 'feedback',
    props: {
      testId: { type: 'string' },
      tone: { required: true, type: 'enum', values: ['danger', 'warning', 'info'] },
    },
    slots: { children: { acceptsKinds: ['content'], max: null, min: 1 } },
  },

  Button: {
    contractVersion: 1,
    exposure: 'metadata',
    // A native <button>: the platform supplies the role, the Enter and Space
    // handling and the disabled semantics. Wrapping that in a managed focus
    // model would be strictly worse, so the profile says so.
    interaction: { profile: 'native-control', revision: 1 },
    kind: 'action',
    props: {
      disabled: { type: 'boolean' },
      testId: { type: 'string' },
      variant: { type: 'enum', values: ['primary', 'secondary'] },
    },
    slots: { children: { text: true } },
  },

  Card: {
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'layout',
    props: {
      // The id of the heading that names this region. A card without one is an
      // unnamed landmark, which is worse than no landmark.
      labelledBy: { type: 'string' },
    },
    slots: {
      children: {
        acceptsKinds: ['layout', 'content', 'collection', 'feedback'],
        max: null,
        min: 1,
      },
    },
  },

  Code: {
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'content',
    slots: { children: { text: true } },
  },

  Heading: {
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'content',
    props: {
      id: { type: 'string' },
      // A level rather than a fixed tag, so a document outline stays correct --
      // which is how a screen-reader user navigates a page.
      level: { type: 'enum', values: [1, 2, 3] },
    },
    slots: { children: { text: true } },
  },

  List: {
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'collection',
    props: { testId: { type: 'string' } },
    // Only ListItem, because a <ul> whose children are not <li> is invalid
    // markup and reads as an empty list. The grammar refuses what the
    // accessibility tree would silently discard.
    slots: { children: { accepts: ['ListItem'], max: null, min: 0 } },
  },

  ListItem: {
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'collection',
    slots: {
      children: {
        acceptsKinds: ['layout', 'content', 'action', 'feedback'],
        max: null,
        min: 1,
      },
    },
  },
  Page: {
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'layout',
    slots: {
      children: {
        acceptsKinds: ['layout', 'content', 'collection', 'feedback'],
        max: null,
        min: 1,
      },
    },
  },

  Stack: {
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'layout',
    props: {
      direction: { type: 'enum', values: ['column', 'row'] },
      gap: { type: 'enum', values: ['tight', 'normal', 'loose'] },
    },
    slots: {
      children: {
        acceptsKinds: ['layout', 'content', 'action', 'collection', 'feedback'],
        max: null,
        min: 1,
      },
    },
  },

  Status: {
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'live-region', revision: 1 },
    kind: 'feedback',
    slots: { children: { text: true } },
  },

  Text: {
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'content',
    props: { tone: { type: 'enum', values: ['default', 'muted'] } },
    slots: { children: { text: true } },
  },
} as const satisfies Readonly<Record<string, Contract>>

export type ContractId = keyof typeof contracts

/** The vocabulary configuration may name. `internal` entries are excluded. */
export type MetadataContractId = {
  [Id in ContractId]: (typeof contracts)[Id]['exposure'] extends 'metadata' ? Id : never
}[ContractId]

export const contractIds = Object.keys(contracts) as ContractId[]

export const metadataContractIds = contractIds.filter(
  (id) => contracts[id].exposure === 'metadata',
) as MetadataContractId[]

export const KINDS: readonly Kind[] = [
  'layout',
  'content',
  'field',
  'action',
  'collection',
  'feedback',
]

// ---------------------------------------------------------------------------
// Derived types. Compile-time only -- every one of these erases, so nothing
// here reaches a bundle. This is the half of the contract the TypeScript
// compiler enforces; the generated JSON Schema is the half a running validator
// enforces. Both are DERIVED from the data above, so neither can drift from it.
// ---------------------------------------------------------------------------

/** The TypeScript type a declared prop spec stands for. */
type PropValue<S> = S extends { type: 'enum'; values: readonly (infer V)[] }
  ? V
  : S extends { type: 'string' }
    ? string
    : S extends { type: 'boolean' }
      ? boolean
      : S extends { type: 'number' }
        ? number
        : never

type PropsOf<Id extends ContractId> = (typeof contracts)[Id] extends { props: infer P }
  ? P
  : Record<string, never>

type RequiredNames<P> = {
  [K in keyof P]: P[K] extends { required: true } ? K : never
}[keyof P]

type SlotsOf<Id extends ContractId> = (typeof contracts)[Id] extends { slots: infer S } ? S : never

/**
 * The props a component MUST accept for its contract to be honest.
 *
 * Required where the contract says required, optional otherwise, and `children`
 * whenever the contract declares any slot -- a component that declares a slot
 * and accepts no children could never render what configuration puts in it.
 *
 * `Children` is a PARAMETER rather than React's `ReactNode`, because this file
 * is imported by the JSON Schema generator, architecture guards and eventually
 * AI tooling -- none of which should resolve React to find out what a Button
 * is. That is law 5's dependency direction applied to the type layer. The
 * concrete React binding is made once, where the components live.
 */
export type DeclaredProps<Id extends ContractId, Children = unknown> = {
  [K in RequiredNames<PropsOf<Id>>]: PropValue<PropsOf<Id>[K]>
} & {
  [K in Exclude<keyof PropsOf<Id>, RequiredNames<PropsOf<Id>>>]?: PropValue<PropsOf<Id>[K]>
} & ([SlotsOf<Id>] extends [never] ? unknown : { children: Children })
