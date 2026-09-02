'use client'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/cn'

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      className={cn('scroll-my-1 p-related', className)}
      data-slot="select-group"
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      className={cn('flex flex-1 text-left', className)}
      data-slot="select-value"
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: 'sm' | 'default'
}) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "focus-visible:focus-ring flex w-fit select-none items-center justify-between gap-tight whitespace-nowrap rounded-container border border-input bg-transparent py-tight pr-tight pl-snug text-body-compact outline-none transition-colors disabled:cursor-not-allowed disabled:text-disabled-foreground aria-invalid:border-destructive aria-invalid:ring-3 data-[size=default]:h-control data-[size=sm]:h-control data-[size=sm]:rounded-control data-placeholder:text-muted-foreground *:data-[slot=select-value]:line-clamp-related *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-tight dark:bg-field dark:aria-invalid:border-destructive dark:hover:bg-muted [&_svg:not([class*='size-'])]:size-icon [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-size={size}
      data-slot="select-trigger"
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={<ChevronDownIcon className="pointer-events-none size-icon text-muted-foreground" />}
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = 'bottom',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset' | 'alignItemWithTrigger'
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        alignItemWithTrigger={alignItemWithTrigger}
        alignOffset={alignOffset}
        className="layer-overlay isolate"
        side={side}
        sideOffset={sideOffset}
      >
        <SelectPrimitive.Popup
          className={cn(
            'data-[side=bottom]:slide-in-from-top-tight data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 layer-overlay relative isolate max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-container border border-border bg-popover text-popover-foreground shadow-floating duration-state data-[align-trigger=true]:animate-none data-closed:animate-out data-open:animate-in',
            className,
          )}
          data-align-trigger={alignItemWithTrigger}
          data-slot="select-content"
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn('px-tight py-related text-body-compact text-muted-foreground', className)}
      data-slot="select-label"
      {...props}
    />
  )
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-tight rounded-control py-related pr-section pl-tight text-body-compact outline-hidden focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:text-disabled-foreground [&_svg:not([class*='size-'])]:size-icon [&_svg]:pointer-events-none [&_svg]:shrink-0 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-tight",
        className,
      )}
      data-slot="select-item"
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-tight whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-icon items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
      data-slot="select-separator"
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      className={cn(
        "layer-local top-0 flex w-full cursor-default items-center justify-center bg-popover py-related [&_svg:not([class*='size-'])]:size-icon",
        className,
      )}
      data-slot="select-scroll-up-button"
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      className={cn(
        "layer-local bottom-0 flex w-full cursor-default items-center justify-center bg-popover py-related [&_svg:not([class*='size-'])]:size-icon",
        className,
      )}
      data-slot="select-scroll-down-button"
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
