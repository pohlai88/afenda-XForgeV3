'use client'

/**
 * A keyboard-first surface for finding and running a command.
 *
 * WHY ITS OWN ENTRY POINT, and it is `boundary.tsx`'s reason rather than a new
 * one: this holds interactive state, so it is `'use client'`, and the
 * `@xforge/ui` barrel is imported by server components. Re-exporting from there
 * marks the ENTIRE design system client-only. The cost is paid by the one thing
 * that needs it, behind `@xforge/ui/command-palette`.
 *
 * WHAT IS DELEGATED, which is nearly all of the behaviour this contract is
 * gated on. Base UI's Dialog owns the focus trap, the initial focus target, the
 * return of focus to the trigger, Escape, `aria-modal` and inert-ing the page.
 * Base UI's Autocomplete owns `role="listbox"` and `role="option"`, the
 * `aria-activedescendant` that moves the highlight WITHOUT moving DOM focus off
 * the input, arrow-key traversal, Enter activating the highlighted item, and
 * the result-count status. Every one of those is a thing this repository would
 * get subtly wrong and not find out about, because a palette with a broken
 * activedescendant looks completely normal to anyone using a mouse.
 *
 * That delegation is also what makes `composite` honest here. The profile means
 * one tab stop with arrow navigation inside, and there is exactly one: the
 * input. Nothing in this file moves focus.
 *
 * WHAT IS NOT DELEGATED: the vocabulary, the match rule, and two names.
 *
 * NO GLOBAL SHORTCUT, deliberately. A command palette is the component people
 * expect to bind Cmd+K, and it is the wrong owner for it: two mounted palettes
 * would both claim the key, and a component cannot know whether THIS screen is
 * the one that should answer. So the palette is opened by its caller -- through
 * `open`/`onOpenChange`, or through the optional `trigger`, which is also the
 * half that matters for accessibility. A surface reachable only by a shortcut
 * nobody can see is not discoverable, and a visible trigger is the fix that
 * does not depend on documentation.
 */

import { Autocomplete } from '@base-ui/react/autocomplete'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import type { ReactElement } from 'react'

/**
 * One runnable command.
 *
 * NOT CONTRACT VOCABULARY, and the reason is the one `contracts.ts` states in
 * its header: a command is an ACTION, and actions are exactly what the metadata
 * language cannot carry -- `onSelect` is a function, as `Button.onClick` is.
 * Metadata can place a palette; populating one waits for the command layer to
 * reference actions by identifier. Recorded rather than worked around, because
 * the alternative is a prop shape that pretends to be configuration.
 */
export interface Command {
  disabled?: boolean
  /** A shortcut, a section, a disambiguator. Searched as well as shown. */
  hint?: string
  /** What `onSelect` receives. Never shown. */
  id: string
  label: string
}

/**
 * The match rule, owned here rather than taken as a default.
 *
 * EVERY TERM MUST MATCH, in any order and anywhere in the label or the hint, so
 * "run pay" finds "Run payroll" and "pay run" finds it too. Prefix-only
 * matching fails the second, and a fuzzy subsequence match finds "Run payroll"
 * for "rp" along with a dozen things nobody meant -- in a surface whose first
 * result is activated by Enter, a confident wrong match is worse than none.
 *
 * Written out because it is a PRODUCT decision. Taking the library's default
 * would have made the behaviour of the most keyboard-driven surface in the
 * system a property of a dependency's minor version.
 */
export function matchesQuery(command: Command, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) {
    return true
  }
  const haystack = `${command.label} ${command.hint ?? ''}`.toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

export function CommandPalette({
  label,
  searchLabel,
  emptyMessage,
  placeholder,
  commands = [],
  onSelect,
  open,
  onOpenChange,
  trigger,
  testId,
}: {
  /**
   * Names the modal surface. Required for the reason `Dialog.title` is: a
   * dialog without a name is an unnamed region and the whole labelling chain
   * degrades silently.
   */
  label: string
  /**
   * Names the search field, and is a SECOND required name rather than a default
   * derived from the first. A combobox inside a named dialog that has no name
   * of its own is the same unnamed-region defect one level down; reusing
   * `label` would make a reader hear the same word twice on entry. Deriving it
   * from `placeholder` is the other tempting answer and is the placeholder-as-
   * label anti-pattern, which disappears the moment anything is typed.
   */
  searchLabel: string
  /**
   * What is shown when nothing matches. Required: a palette that renders an
   * empty list for an unmatched query has told the user nothing, and the state
   * it leaves them in is indistinguishable from a broken filter.
   */
  emptyMessage: string
  placeholder?: string
  commands?: readonly Command[]
  onSelect?: (id: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** A Button ELEMENT, composed by Base UI rather than wrapped. */
  trigger?: ReactElement
  testId?: string
}) {
  return (
    <BaseDialog.Root onOpenChange={onOpenChange} open={open}>
      {trigger ? <BaseDialog.Trigger render={trigger as never} /> : null}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="xf-dialog-backdrop" />
        <BaseDialog.Popup className="xf-dialog xf-command-palette" data-testid={testId}>
          {/*
           * The surface's name, carried but not drawn. A palette with a visible
           * heading above its search field is a dialog wearing a title bar, and
           * the thing every implementation of this pattern gets right is that
           * the input IS the interface. The name still has to exist.
           */}
          <BaseDialog.Title className="xf-visually-hidden">{label}</BaseDialog.Title>
          <Autocomplete.Root filter={matchesQuery} inline items={commands} open>
            <Autocomplete.Input
              aria-label={searchLabel}
              className="xf-input xf-focusable"
              placeholder={placeholder}
            />
            {/*
             * NO RESULT-COUNT ANNOUNCEMENT, and it is a gap rather than a
             * decision that filtering is silent.
             *
             * `Autocomplete.Status` is the region for it and renders only the
             * children it is given -- so an empty one, which is what stood here
             * first, is a live region that announces nothing while reading like
             * a component that does. The count itself is easy; the SENTENCE is
             * not. "3 results" is content, it pluralises differently per
             * language, and this vocabulary cannot carry a formatter any more
             * than it can carry the commands -- both are the command layer's to
             * supply. Recorded in `project-state.md` rather than filled with an
             * English string a design system has no business choosing.
             */}
            <Autocomplete.Empty className="xf-command-empty">{emptyMessage}</Autocomplete.Empty>
            <Autocomplete.List className="xf-command-list">
              {(command: Command) => (
                <Autocomplete.Item
                  className="xf-command-item"
                  disabled={command.disabled}
                  key={command.id}
                  onClick={() => onSelect?.(command.id)}
                  value={command}
                >
                  <span className="xf-command-item-label">{command.label}</span>
                  {command.hint ? (
                    <span className="xf-command-item-hint">{command.hint}</span>
                  ) : null}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Root>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}
