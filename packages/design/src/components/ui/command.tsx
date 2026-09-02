'use client'

import { Command as CommandPrimitive } from 'cmdk'
import { CheckIcon, SearchIcon } from 'lucide-react'
import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { cn } from '@/lib/cn'

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn(
        'flex size-full flex-col overflow-hidden rounded-container! bg-popover p-related text-popover-foreground',
        className,
      )}
      data-slot="command"
      {...props}
    />
  )
}

function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, 'children'> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          'top-related/3 translate-y-0 overflow-hidden rounded-container! p-0',
          className,
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="p-related pb-0" data-slot="command-input-wrapper">
      <InputGroup className="h-control! rounded-container! border-input bg-field shadow-none! *:data-[slot=input-group-addon]:pl-tight!">
        <CommandPrimitive.Input
          className={cn(
            'w-full text-body-compact outline-hidden disabled:cursor-not-allowed disabled:text-disabled-foreground',
            className,
          )}
          data-slot="command-input"
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className="size-icon shrink-0 text-muted-foreground" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn(
        'no-scrollbar max-h-72 scroll-py-1 overflow-y-auto overflow-x-hidden outline-none',
        className,
      )}
      data-slot="command-list"
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className={cn('py-loose text-center text-body-compact', className)}
      data-slot="command-empty"
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        'overflow-hidden p-related text-foreground **:[[cmdk-group-heading]]:px-tight **:[[cmdk-group-heading]]:py-tight **:[[cmdk-group-heading]]:font-emphasis **:[[cmdk-group-heading]]:text-body-compact **:[[cmdk-group-heading]]:text-muted-foreground',
        className,
      )}
      data-slot="command-group"
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      className={cn('-mx-1 h-px bg-border', className)}
      data-slot="command-separator"
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "group/command-item relative flex cursor-default select-none items-center gap-tight in-data-[slot=dialog-content]:rounded-container! rounded-precise px-tight py-tight text-body-compact outline-hidden data-[disabled=true]:pointer-events-none data-selected:bg-muted data-[disabled=true]:text-disabled-foreground data-selected:text-foreground [&_svg:not([class*='size-'])]:size-icon [&_svg]:pointer-events-none [&_svg]:shrink-0 data-selected:*:[svg]:text-foreground",
        className,
      )}
      data-slot="command-item"
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'ml-auto text-body-compact text-muted-foreground tracking-shortcut group-data-selected/command-item:text-foreground',
        className,
      )}
      data-slot="command-shortcut"
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
