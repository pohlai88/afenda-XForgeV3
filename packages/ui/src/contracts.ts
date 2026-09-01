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

/**
 * Profiles owing recorded screen-reader evidence.
 *
 * THE CRITERION, so the set is computed rather than remembered: a profile is
 * gated when the component MANAGES FOCUS ITSELF or ANNOUNCES STATE THE DOM DOES
 * NOT ALREADY CARRY. Those are the cases where axe passes, the browser-observed
 * keyboard and ARIA checks pass, and a screen reader still says the wrong
 * thing -- roving focus that moves without the accessibility tree agreeing, a
 * trap that restores focus somewhere unexpected, an announcement whose timing
 * decides whether it lands at all.
 *
 * `form-control` was here and is not any more. An Input's name, role and
 * validity come from native semantics: axe verifies them statically and the
 * A11y-2 specs verify them in Chromium, which is what
 * `conformance-harness.spec.ts` now does for Field, Input and Checkbox. A
 * screen-reader session on those confirms what two cheaper layers already
 * established.
 *
 * THIS IS A REDUCTION IN THE GATE, NOT IN COVERAGE. What it gives up is real:
 * A11y-2 observes computed names, roles and focus order, and says nothing about
 * what NVDA reads aloud, in what order, or how a virtual cursor traverses --
 * all of which can diverge from a correct accessibility tree. The ungated
 * contracts carry that residual risk knowingly, and stay in scope for the first
 * session that runs; they simply do not block it.
 *
 * A profile-derived set also means a future component joins by declaring what
 * it is. Combobox is `composite` and will be gated the day it lands, without
 * anyone editing a list.
 */
export const PROFILES_REQUIRING_AT_EVIDENCE = [
  'modal',
  'composite',
  'composite-grid',
] as const satisfies readonly InteractionProfile[]

/**
 * What a component can DO, independently of what it is.
 *
 * `field-control` means: this can be the control inside a `Field`, taking its
 * accessible name, description and error wiring from that Field. Input and
 * Checkbox both qualify; Combobox, Select and Switch will.
 */
export type Capability =
  /** Can be the control inside a `Field`, taking its name and wiring from it. */
  | 'field-control'
  /**
   * Is a labelled field, and may therefore sit in ordinary layout.
   *
   * The distinction matters because the two are not interchangeable. A layout
   * slot accepting kind `field` would admit a bare Checkbox -- a control whose
   * accessible name comes from a Field that is no longer there. Accepting
   * `form-field` admits the labelled thing and keeps the raw control reachable
   * only through the component that names it.
   */
  | 'form-field'

/**
 * Whether a component holds CONTENT or a VALUE.
 *
 * Declared rather than inferred from whether `slots` happens to be present.
 * Inferring it makes a forgotten slot declaration indistinguishable from a
 * deliberate leaf, which is exactly the confusion that had `Input` written into
 * a test as a named exception -- a rule that would have aged badly the moment
 * Separator, Progress or Icon arrived.
 */
export type Composition = 'leaf' | 'container'

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
  | { text: true; min?: number }
  | {
      accepts?: readonly string[]
      acceptsKinds?: readonly Kind[]
      /**
       * Accept by CAPABILITY rather than by name.
       *
       * `Field` accepts anything that can act as a field control. Written as a
       * whitelist -- `accepts: ['Input']` -- the rule refuses Combobox and
       * Select too, and the next person to add one reads the whitelist as an
       * oversight and widens it to every `field` kind, which lets back in the
       * thing the whitelist was guarding against. Naming the property that
       * causes the rule is what stops that cycle.
       */
      acceptsCapability?: Capability
      /** Omitted means 1: a slot is required unless it says otherwise. */
      min?: number
      /** `null` means unbounded, and is written rather than left off. */
      max?: number | null
    }

export interface Contract {
  /** What this can act AS, for slots that accept by capability. */
  capabilities?: readonly Capability[]
  /** Whether this holds content (`container`) or a value (`leaf`). */
  composition: Composition
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
    composition: 'container',
    contractVersion: 1,
    exposure: 'metadata',
    // Politeness is chosen by tone, not by the caller. That is behaviour, so it
    // carries a revision. WHICH tone announces how lives in `live-region.ts`,
    // not here: this comment stated the mapping and so did three other places,
    // and a rule with four owners diverges in silence.
    interaction: { profile: 'live-region', revision: 1 },
    kind: 'feedback',
    props: {
      testId: { type: 'string' },
      tone: { required: true, type: 'enum', values: ['danger', 'warning', 'info'] },
    },
    slots: { children: { acceptsKinds: ['content'], max: null, min: 1 } },
  },

  Button: {
    composition: 'container',
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
    composition: 'container',
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

  /**
   * A boolean control. Its accessible name comes from the Field that wraps it,
   * exactly as an Input's does -- `CheckboxRoot` reads `labelId` from the Field
   * context and sets `aria-labelledby`. It has no label slot of its own, and an
   * earlier version giving it one is what produced the double label this
   * grammar was briefly written to forbid.
   */
  Checkbox: {
    capabilities: ['field-control'],
    composition: 'leaf',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'form-control', revision: 1 },
    kind: 'field',
    props: {
      disabled: { type: 'boolean' },
      name: { type: 'string' },
      testId: { type: 'string' },
    },
  },

  Code: {
    composition: 'container',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'content',
    slots: { children: { text: true } },
  },

  /**
   * The reason `kind` and `interaction.profile` are separate dimensions.
   *
   * Dialog is `layout` -- it is a region that holds other things, and the
   * grammar treats it as one. It also carries the most consequential focus
   * management in the system: a focus trap, an initial focus target, a return
   * target on close, and Escape to dismiss. Gating accessibility evidence on
   * `kind` would have exempted exactly this component while demanding an NVDA
   * scenario for a Skeleton.
   *
   * This is the first contract whose profile owes recorded screen-reader
   * evidence, so it is the first that can be shipped wrong in a way no
   * automated check here would notice. The keyboard and focus behaviour is
   * covered by a hand-authored conformance spec; the AT evidence itself is
   * owed and not yet recorded.
   */
  Dialog: {
    composition: 'container',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'modal', revision: 1 },
    kind: 'layout',
    props: { testId: { type: 'string' } },
    slots: {
      actions: { accepts: ['Button'], max: null, min: 0 },
      children: {
        acceptsKinds: ['layout', 'content', 'collection', 'feedback'],
        max: null,
        min: 1,
      },
      description: { min: 0, text: true },
      // A dialog without a name is an unnamed region, so `title` is required
      // and `description` is not.
      title: { text: true },
      trigger: { accepts: ['Button'], max: 1, min: 0 },
    },
  },

  /**
   * There is genuinely nothing to show -- and nothing went wrong.
   *
   * Distinct from error, forbidden, partial and loading, all of which stage 4
   * will need to keep apart. Collapsing them into one component with different
   * strings is precisely what stops a user learning whether to wait, retry, ask
   * for access, or create the first record.
   *
   * `action` is what makes it useful rather than decorative: an empty list
   * whose only content is a sentence has told the user what is true and not
   * what to do about it.
   */
  EmptyState: {
    composition: 'container',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'feedback',
    props: { testId: { type: 'string' } },
    slots: {
      action: { accepts: ['Button'], max: 1, min: 0 },
      description: { min: 0, text: true },
      title: { text: true },
    },
  },

  Field: {
    capabilities: ['form-field'],
    composition: 'container',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'form-control', revision: 1 },
    kind: 'field',
    props: { testId: { type: 'string' } },
    slots: {
      children: { acceptsCapability: 'field-control', max: 1, min: 1 },
      description: { min: 0, text: true },
      error: { min: 0, text: true },
      label: { text: true },
    },
  },

  Heading: {
    composition: 'container',
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

  /**
   * A text control. THE ONE CONTRACT WITH NO SLOTS, deliberately.
   *
   * An input holds a value, not content: it has nothing to render inside it.
   * Every other contract here is a container or a text leaf, and the test that
   * asserts so now names this exception rather than being quietly relaxed --
   * the difference between a considered leaf and a forgotten declaration.
   *
   * Its accessible name comes from the Field that wraps it. Base UI's Input
   * renders `Field.Control` internally, which is what makes that automatic.
   */
  Input: {
    capabilities: ['field-control'],
    composition: 'leaf',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'form-control', revision: 1 },
    kind: 'field',
    props: {
      disabled: { type: 'boolean' },
      name: { type: 'string' },
      placeholder: { type: 'string' },
      required: { type: 'boolean' },
      testId: { type: 'string' },
      // Deliberately narrow. `type` changes the on-screen keyboard, the
      // validation and the autofill behaviour, so it is a fixed vocabulary and
      // not an arbitrary string -- and `password` is absent because a
      // credential field needs decisions this contract does not make.
      type: { type: 'enum', values: ['text', 'email', 'tel', 'url', 'search'] },
    },
  },

  List: {
    composition: 'container',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'collection',
    props: { testId: { type: 'string' } },
    // Only ListItem, because a <ul> whose children are not <li> is invalid
    // markup and reads as an empty list. The grammar refuses what the
    // accessibility tree would silently discard.
    //
    // `min: 1`, not 0. This said 0 until the slot-to-prop derivation made the
    // disagreement a compile error: the contract permitted an empty list while
    // the component required children. An empty collection is an EMPTY STATE --
    // a different component, saying something useful -- and never a `<ul>` with
    // nothing in it, which is what the screen already does.
    slots: { children: { accepts: ['ListItem'], max: null, min: 1 } },
  },

  ListItem: {
    composition: 'container',
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
    composition: 'container',
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

  /**
   * The labelling, description and validity wrapper for one control.
   *
   * Base UI's Field owns the wiring -- generated ids, `aria-describedby` to the
   * description and the error, `aria-labelledby` to the label, and the validity
   * state that flows to the control. Doing that by hand is how a form ends up
   * with a label that reads correctly and an error message no screen reader
   * ever announces.
   *
   * `children` accepts anything with the `field-control` CAPABILITY.
   *
   * It said `accepts: ['Input']`, on the premise that a Checkbox carries its own
   * label and would be double-labelled here. That premise was false, and the
   * component that made it look true was mine: `CheckboxRoot` reads `labelId`
   * from the Field context and sets `aria-labelledby` from it, so a Checkbox
   * takes its name FROM this Field. It was my wrapper putting a second label
   * around it.
   *
   * The whitelist would also have refused Combobox and Select, which need
   * exactly this labelling -- and the next person adding one would read
   * `['Input']` as an oversight and widen it to every `field` kind. Accepting
   * by capability states the property that decides, so it admits the controls
   * that qualify without admitting the ones that do not.
   */
  /**
   * A visual placeholder for content that has not arrived.
   *
   * DELIBERATELY NOT THE LOADING STATE. Skeleton is an affordance; the state is
   * `ResourceState.loading`, and the announcement belongs to whatever renders
   * that state. So this is `aria-hidden` and carries no live region: a shimmer
   * that announced itself would talk over the thing that should be speaking.
   *
   * That leaves a real obligation for stage 4 -- a screen-reader user must
   * still learn that something is loading -- and it is recorded rather than
   * solved here, because solving it in a placeholder is how two components end
   * up announcing the same fact.
   *
   * The variants are a closed set on purpose. Width, height, radius and line
   * count as metadata props would turn a placeholder into a small layout
   * language; a structural skeleton is composed from several of these through
   * the layout primitives that already exist.
   */
  Skeleton: {
    composition: 'leaf',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'feedback',
    props: {
      testId: { type: 'string' },
      variant: { type: 'enum', values: ['text', 'block'] },
    },
  },

  Stack: {
    composition: 'container',
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
        acceptsCapability: 'form-field',
        acceptsKinds: ['layout', 'content', 'action', 'collection', 'feedback'],
        max: null,
        min: 1,
      },
    },
  },

  Status: {
    composition: 'container',
    // 2: gained `testId`, which Alert and List already declared. Status lacking
    // it was the inconsistency, and it left one read state addressable only by a
    // role that info-toned Alerts also carry. contractVersion moves because the
    // public vocabulary grew; interaction.revision does not, because nothing
    // about the behaviour changed and no AT evidence is invalidated.
    contractVersion: 2,
    exposure: 'metadata',
    interaction: { profile: 'live-region', revision: 1 },
    kind: 'feedback',
    props: { testId: { type: 'string' } },
    slots: { children: { text: true } },
  },

  /**
   * PASSIVE tabular content, and the distinction from a grid is the design.
   *
   * A table is READ, not operated: ordinary Tab reaches whatever controls happen
   * to sit inside it and nothing manages focus. The APG grid pattern -- one tab
   * stop, arrows moving between cells, focus landing differently depending on
   * cell content -- is a DIFFERENT contract with a different profile. Applying
   * `role="grid"` because a table looks sophisticated is how a component
   * acquires a keyboard model nobody implemented.
   *
   * THE HEADER IS REQUIRED. A table whose columns are unnamed is close to
   * unreadable with a screen reader, and a grammar that permits one produces it
   * eventually. `caption` names the table natively, so no `aria-labelledby`
   * is wired and the contract stays inert under 4C.6's clause.
   */
  Table: {
    composition: 'container',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'collection',
    props: { testId: { type: 'string' } },
    slots: {
      caption: { text: true },
      children: { accepts: ['TableRow'], max: null, min: 1 },
      header: { accepts: ['TableHeaderCell'], max: null, min: 1 },
    },
  },

  TableCell: {
    composition: 'container',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'collection',
    slots: { children: { acceptsKinds: ['content'], max: null, min: 1 } },
  },

  /**
   * A column name, and a SEPARATE contract from `TableCell` on purpose.
   *
   * One cell contract that rendered `<th>` or `<td>` from context is not
   * available here: `index.tsx` is imported by server components, so it has no
   * React context to read. One that took a `header` boolean would leave a
   * `<th>` in the body representable, and a grammar that can express a broken
   * table eventually contains one. Two contracts make the illegal arrangement
   * unsayable instead of merely discouraged.
   */
  TableHeaderCell: {
    composition: 'container',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'collection',
    slots: { children: { text: true } },
  },

  TableRow: {
    composition: 'container',
    contractVersion: 1,
    exposure: 'metadata',
    interaction: { profile: 'none', revision: 0 },
    kind: 'collection',
    slots: { children: { accepts: ['TableCell'], max: null, min: 1 } },
  },

  Text: {
    composition: 'container',
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

/**
 * The contracts owing recorded screen-reader evidence.
 *
 * ADR-025's load-bearing rule -- "the set is derived from the profile a contract
 * declares, never from a list of component names" -- as something callable.
 * It was written out byte for byte at two call sites in `ui-contracts.test.ts`
 * and existed nowhere as an authority, which is the shape where two copies agree
 * until one of them is edited.
 *
 * TAKES A REGISTRY, and that parameter is the point. The profile-mutation table
 * asks this exact question of a deliberately dishonest registry. A mutation test
 * carrying its own copy of the rule would prove only that the copy works.
 */
export function contractsOwingAtEvidence(
  registry: Readonly<Record<string, Contract>> = contracts,
): string[] {
  return Object.entries(registry)
    .filter(([, c]) =>
      (PROFILES_REQUIRING_AT_EVIDENCE as readonly string[]).includes(c.interaction.profile),
    )
    .map(([id]) => id)
    .sort()
}

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
 * A slot is REQUIRED unless it says otherwise, which is `min: 0`.
 *
 * Required is the right default. A Button with no label has no accessible name;
 * a Dialog with no title is an unnamed region. The slots that are genuinely
 * optional -- a list that may be empty, a dialog's description -- say so with
 * `min: 0`, and saying it is cheaper than the alternative, which is every
 * component quietly permitting its own most important content to be absent.
 */
type OptionalSlotNames<S> = {
  [K in keyof S]: S[K] extends { min: 0 } ? K : never
}[keyof S]

/**
 * What one slot holds.
 *
 * A slot capped at ONE component holds a single ELEMENT, not a node list, and
 * the difference is load-bearing rather than pedantic: Dialog's trigger is
 * composed by Base UI's `render`, which needs an element to clone props onto.
 * Typed as a general node, a caller could pass a string and the composition
 * would fail at run time -- which is exactly the class of thing the contracts
 * exist to make a compile error.
 */
type SlotValue<Spec, Children, Element> = Spec extends { text: true }
  ? Children
  : Spec extends { max: 1 }
    ? Element
    : Children

/**
 * The props a component MUST accept for its contract to be honest.
 *
 * EVERY SLOT IS A PROP, one for one, and a slot named `children` is React's
 * `children`. This was `children` alone regardless of how many slots a contract
 * declared, which held for as long as every component had exactly one. Dialog
 * has five -- trigger, title, description, content, actions -- and a component
 * cannot render five distinct regions from a single `children`. The contract
 * would have gone on describing slots the component had no way to receive.
 *
 * `Children` is a PARAMETER rather than React's `ReactNode`, because this file
 * is imported by the JSON Schema generator, architecture guards and eventually
 * AI tooling -- none of which should resolve React to find out what a Button
 * is. That is law 5's dependency direction applied to the type layer. The
 * concrete React binding is made once, where the components live.
 */
export type DeclaredProps<Id extends ContractId, Children = unknown, Element = Children> = {
  [K in RequiredNames<PropsOf<Id>>]: PropValue<PropsOf<Id>[K]>
} & {
  [K in Exclude<keyof PropsOf<Id>, RequiredNames<PropsOf<Id>>>]?: PropValue<PropsOf<Id>[K]>
} & {
  [K in Exclude<keyof SlotsOf<Id>, OptionalSlotNames<SlotsOf<Id>>>]: SlotValue<
    SlotsOf<Id>[K],
    Children,
    Element
  >
} & {
  [K in OptionalSlotNames<SlotsOf<Id>>]?: SlotValue<SlotsOf<Id>[K], Children, Element>
}
