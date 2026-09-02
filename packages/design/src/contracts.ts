/**
 * The component registry — what each primitive IS, as data.
 *
 * WHAT THIS BUYS, and it is not bookkeeping: `interaction.profile` decides which
 * conformance suites claim a component and whether it owes a recorded
 * screen-reader session. A component joins the accessibility gate by declaring
 * what it is, so nobody edits a list of who is covered — which is ADR-025's
 * whole mechanism, and the reason the obligation cannot be forgotten.
 *
 * PURE SERIALIZABLE DATA. No functions, no React, no imported runtime objects.
 * A registry that executes JavaScript to say what a Button is cannot be read by
 * a schema generator, a guard, or anything that is not this program.
 *
 * NO SLOT GRAMMAR YET, and that is a decision. The system this replaces carries
 * `slots` and `props` per contract because a metadata renderer was planned to
 * read them. No renderer exists. Building the grammar before its only consumer
 * would be infrastructure ahead of a measured pain (law 30), and a grammar
 * nobody validates against drifts from the components silently. It arrives with
 * the renderer, from the components as they then are.
 */

/**
 * What a component does to a keyboard, to focus, and to a screen reader.
 *
 * A CLOSED SET, because the profile is what the conformance suites dispatch on.
 * An unrecognised profile would be a component no suite claims, reported as
 * covered.
 */
export type InteractionProfile =
  /** Takes no focus, declares no interactive or live-region role, wires no relationship. */
  | 'none'
  /** Wraps a platform control; the platform supplies role, keyboard and disabled semantics. */
  | 'native-control'
  /** A control that gets its accessible name from a Field, and reports validity. */
  | 'form-control'
  /** Traps focus, returns it on close, and is dismissible. */
  | 'modal'
  /** Managed focus across many children: one tab stop, arrows traverse. */
  | 'composite'
  /** A composite laid out in two dimensions, with an editor. */
  | 'composite-grid'
  /** Announces through `aria-live`, with a politeness its tone decides. */
  | 'live-region'
  /**
   * Appears beside its trigger, describes it, and dismisses — without trapping
   * focus or stealing it. Tooltip today; Popover and HoverCard when they land.
   *
   * NEW IN THIS SYSTEM, and it is added rather than approximated. The nearest
   * existing profiles are both false of a tooltip: `none` asserts it announces
   * nothing, which the inertness suite would then prove wrong, and `composite`
   * asserts managed focus it does not have. A profile that is untrue is worse
   * than one that is missing, because a suite reports it as checked.
   */
  | 'disclosure'

/**
 * Profiles whose behaviour a machine cannot observe, so a person must (ADR-025).
 *
 * axe and the browser suites agree the accessible tree is correct; what they
 * cannot see is announcement ORDER, verbosity, and how a virtual cursor
 * traverses. A contract joins this set by declaring its profile, and the gate
 * reads the set — nobody maintains a list of who owes one.
 *
 * `disclosure` is included because a tooltip's whole risk is what gets said and
 * when: announced twice, announced never, or announced detached from the control
 * it describes. That is exactly the question no automated check can answer.
 *
 * AND `live-region`, WHICH THAT SENTENCE DESCRIBES BETTER THAN IT DESCRIBES A
 * TOOLTIP. ADR-025's Decision reads: "A11y-3 is required where a component
 * MANAGES FOCUS ITSELF or ANNOUNCES STATE THE DOM DOES NOT ALREADY CARRY." A
 * live region is the second clause verbatim -- and the same section then lists
 * `live-region` as not gated. The criterion and the set contradicted each other
 * inside one paragraph, and the set was what the code read.
 *
 * The concrete exposure: `Status` says of itself that `aria-live="polite"` IS
 * the component, and `Alert` puts `role="status"` on the element that is
 * inserted when the message appears. Whether a reader announces a live region
 * that did not exist a moment earlier varies by reader and is the classic way
 * this fails. Nothing here can answer it; axe reads the tree and finds the
 * attribute present, which is not the question.
 *
 * ADR-030 records the widening, and the schedulability cost it carries.
 */
export const PROFILES_REQUIRING_AT_EVIDENCE = [
  'composite',
  'composite-grid',
  'disclosure',
  'live-region',
  'modal',
] as const satisfies readonly InteractionProfile[]

/** What a component is FOR, which is how a screen decides where it may sit. */
export type Kind = 'action' | 'collection' | 'content' | 'feedback' | 'field' | 'layout'

export interface Contract {
  readonly interaction: {
    readonly profile: InteractionProfile
    /**
     * Moves when keyboard, focus or ARIA behaviour changes — never when a prop
     * or a colour does. It is what invalidates a recorded screen-reader session,
     * so bumping it for a restyle would discard evidence that is still true.
     */
    readonly revision: number
  }
  readonly kind: Kind
}

/**
 * REVISION 0 MEANS "no behaviour of its own to version".
 *
 * Every profile other than `none` starts at 1: it carries obligations this
 * project defined, so there is something a session could have been recorded
 * against.
 */
export const contracts = {
  // `role="status"`, which is a live region: it announces when it appears. NOT
  // `alert` -- that is assertive and interrupts, and these appear in response to
  // something the reader just did, where interrupting is rude.
  Alert: { interaction: { profile: 'live-region', revision: 1 }, kind: 'content' },
  Avatar: { interaction: { profile: 'none', revision: 0 }, kind: 'content' },
  Badge: { interaction: { profile: 'none', revision: 0 }, kind: 'content' },
  // A native <button> underneath: the platform supplies the role, Enter AND
  // Space, and disabled semantics. Wrapping that in managed focus would be
  // re-implementing what the platform already guarantees.
  Button: { interaction: { profile: 'native-control', revision: 1 }, kind: 'action' },
  Card: { interaction: { profile: 'none', revision: 0 }, kind: 'layout' },
  Code: { interaction: { profile: 'none', revision: 0 }, kind: 'content' },
  // Input, list and empty state, driven from the keyboard. `composite` because
  // focus stays on the input while `aria-activedescendant` moves through options.
  Command: { interaction: { profile: 'composite', revision: 1 }, kind: 'collection' },
  Dialog: { interaction: { profile: 'modal', revision: 1 }, kind: 'layout' },
  DropdownMenu: { interaction: { profile: 'composite', revision: 1 }, kind: 'action' },
  // Two lines that do different jobs -- the fact, then what to do about it.
  EmptyState: { interaction: { profile: 'none', revision: 0 }, kind: 'content' },
  // `level` picks the element a screen reader walks; the role picks the size.
  // They are separate on purpose, and the registry records the element as the
  // load-bearing half.
  Heading: { interaction: { profile: 'none', revision: 0 }, kind: 'content' },
  Input: { interaction: { profile: 'form-control', revision: 1 }, kind: 'field' },
  // A container that groups a control with its adornments. It takes no focus of
  // its own; the control inside it does.
  InputGroup: { interaction: { profile: 'none', revision: 0 }, kind: 'layout' },
  // Not a control. It names one -- `htmlFor` is required by its signature, which
  // is why it can assert inertness truthfully.
  Label: { interaction: { profile: 'none', revision: 0 }, kind: 'content' },
  // A real `<ul>`: "list, four items" and item-to-item navigation come from the
  // element, not from anything this component adds.
  List: { interaction: { profile: 'none', revision: 0 }, kind: 'collection' },
  ListItem: { interaction: { profile: 'none', revision: 0 }, kind: 'content' },
  // The document surface. It declares the type and colour roles once so a screen
  // rendering plain text inherits the system's text without asking for it.
  Page: { interaction: { profile: 'none', revision: 0 }, kind: 'layout' },
  // Catches a stale bundle meeting a newer server and costs the reader one
  // surface rather than the product. It renders an Alert; the live region is
  // that component's, not this one's.
  ResourceBoundary: { interaction: { profile: 'none', revision: 0 }, kind: 'layout' },
  Select: { interaction: { profile: 'composite', revision: 1 }, kind: 'field' },
  Separator: { interaction: { profile: 'none', revision: 0 }, kind: 'layout' },
  // A modal that enters from an edge. The entrance is decoration; the focus trap,
  // the return, and Escape are the contract, and they are a dialog's.
  Sheet: { interaction: { profile: 'modal', revision: 1 }, kind: 'layout' },
  Skeleton: { interaction: { profile: 'none', revision: 0 }, kind: 'feedback' },
  Stack: { interaction: { profile: 'none', revision: 0 }, kind: 'layout' },
  // `aria-live="polite"` IS the component: a spinner is invisible to a screen
  // reader, so loading and empty are the same page without it.
  Status: { interaction: { profile: 'live-region', revision: 1 }, kind: 'content' },
  // Passive tabular content: a native <table>, ordinary Tab, no managed focus.
  // A grid with roving focus and inline edit is a DIFFERENT contract, and it
  // will declare `composite-grid` rather than widening this one.
  Table: { interaction: { profile: 'none', revision: 0 }, kind: 'collection' },
  Text: { interaction: { profile: 'none', revision: 0 }, kind: 'content' },
  Textarea: { interaction: { profile: 'form-control', revision: 1 }, kind: 'field' },
  /**
   * `disclosure`, AND THE PROFILE IS CURRENTLY A CLAIM THE PRIMITIVE DOES NOT
   * MEET. Measured on hover: the popup mounts with no `role` and the trigger
   * gets no `aria-describedby`, so it describes its trigger to a sighted user
   * and to nobody else. That is Base UI's stated design -- "Tooltips are
   * visual-only... not accessible to touch or screen reader users" -- not a
   * defect in this wrapper.
   *
   * IT KEEPS `disclosure` DELIBERATELY. Downgrading to `none` would be truthful
   * about the markup and would remove the A11y-3 obligation from the one
   * component where a person most needs to check what is actually announced.
   * The obligation is the point; POLICY.md 3g carries the rule that protects a
   * reader in the meantime, and it is a rule about USE, not about this file.
   */
  Tooltip: { interaction: { profile: 'disclosure', revision: 1 }, kind: 'content' },
} as const satisfies Readonly<Record<string, Contract>>

export type ContractId = keyof typeof contracts

export const contractIds = Object.keys(contracts) as ContractId[]

/**
 * Who owes a recorded screen-reader session, DERIVED from the profiles.
 *
 * Takes the registry as a parameter so a test can show it a dishonest one --
 * a function that only ever reads the module beside it has never been shown a
 * case it should refuse.
 */
export function contractsOwingAtEvidence(
  registry: Readonly<Record<string, Contract>> = contracts,
): string[] {
  const gated = PROFILES_REQUIRING_AT_EVIDENCE as readonly string[]
  return Object.entries(registry)
    .filter(([, contract]) => gated.includes(contract.interaction.profile))
    .map(([id]) => id)
    .sort((a, b) => a.localeCompare(b))
}
