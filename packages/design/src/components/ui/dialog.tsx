'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        'data-open:fade-in-0 data-closed:fade-out-0 layer-overlay fixed inset-0 isolate bg-scrim duration-state data-closed:animate-out data-open:animate-in supports-backdrop-filter:backdrop-blur-xs',
        className,
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        className={cn(
          'data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 layer-overlay fixed top-related/2 left-1/2 grid w-full max-w-[calc(100%-2rem)] medium:max-w-dialog -translate-x-1/2 -translate-y-1/2 gap-normal rounded-overlay border border-border bg-popover p-normal text-body-compact text-popover-foreground shadow-modal outline-none duration-state data-closed:animate-out data-open:animate-in',
          className,
        )}
        data-slot="dialog-content"
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button className="absolute top-tight right-2" size="icon-sm" variant="ghost" />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-tight', className)}
      data-slot="dialog-header"
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      className={cn(
        '-mx-4 -mb-4 flex medium:flex-row flex-col-reverse medium:justify-end gap-tight rounded-b-container border-t bg-muted p-normal',
        className,
      )}
      data-slot="dialog-footer"
      {...props}
    >
      {children}
      {showCloseButton ? (
        <DialogPrimitive.Close render={<Button variant="outline" />}>Close</DialogPrimitive.Close>
      ) : null}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn('font-emphasis text-emphasis', className)}
      data-slot="dialog-title"
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn(
        'text-body-compact text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className,
      )}
      data-slot="dialog-description"
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
