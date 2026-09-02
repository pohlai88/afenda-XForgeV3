'use client'

import { useEffect } from 'react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

/**
 * The command palette, and it is the PRIMARY navigator rather than a shortcut.
 *
 * `architecture-final.medium:915` states it as a UX priority: "Command/search
 * palette as a first-class navigator -- ERP menu trees are where usability
 * dies." The navigation rail beside it is the discoverable path; this is the
 * fast one, and a bureau operator lives in it.
 *
 * IT RESOLVES NOTHING AND KNOWS NOBODY. Commands arrive as props, already
 * filtered by whoever holds the policy -- the palette never asks who you are.
 * A palette that queried permissions itself would be a second authorisation
 * path, and the answer it got could differ from the one the API enforces.
 *
 * THE CALLER OWNS THE STATE; THIS OWNS THE BINDING. The shell shows a Search
 * control -- ⌘K is the fast path and it is invisible, so a person who was never
 * told cannot find it -- and that control must open the same palette the
 * shortcut does. Splitting it this way keeps one owner for each: the state has
 * a single home, and the keyboard binding is not reimplemented at every call
 * site, which is how a palette ends up openable by mouse and not by keyboard.
 */

export interface PaletteCommand {
  readonly group: string
  readonly id: string
  readonly label: string
  /** What running it does. A URL for navigation, a callback for an action. */
  readonly onRun: () => void
}

export function CommandPalette({
  commands,
  emptyMessage = 'Nothing matches that.',
  onOpenChange,
  open,
  placeholder = 'Search commands and records',
}: {
  readonly commands: readonly PaletteCommand[]
  readonly emptyMessage?: string
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly placeholder?: string
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // BOTH MODIFIERS, because the product ships to one team on mixed machines
      // and a shortcut that works on the designer's laptop only is a shortcut
      // half the users never find.
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) {
        return
      }
      // The browser's own Ctrl+K focuses the address bar. Taking the event is
      // the point of the binding, so the default is prevented rather than raced.
      event.preventDefault()
      onOpenChange(!open)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onOpenChange, open])

  const groups = [...new Set(commands.map((command) => command.group))]

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      {/* `CommandDialog` supplies the Dialog, NOT the cmdk root -- it renders
          `children` straight into `DialogContent`. Without this wrapper every
          Command part looks for a store that is not there, and the page throws
          "Cannot read properties of undefined (reading 'subscribe')". A crash
          rather than a wrong colour, and nothing but rendering it would have
          found it. */}
      <Command>
        <CommandInput placeholder={placeholder} />
        <CommandList>
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup heading={group} key={group}>
              {commands
                .filter((command) => command.group === group)
                .map((command) => (
                  <CommandItem
                    key={command.id}
                    onSelect={() => {
                      // Closed BEFORE running, so a command that navigates does
                      // not leave a dialog open over the destination -- and so
                      // focus returns to the trigger rather than to a popup that
                      // is on its way out.
                      onOpenChange(false)
                      command.onRun()
                    }}
                    value={`${command.group} ${command.label}`}
                  >
                    {command.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
