'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@/lib/cn'

function TooltipProvider({ delay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = 'top',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        className="layer-overlay isolate"
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          className={cn(
            'data-[side=bottom]:slide-in-from-top-tight data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 layer-overlay **:data-[slot=kbd]:layer-overlay inline-flex w-fit max-w-tip origin-(--transform-origin) items-center gap-tight rounded-control bg-foreground px-snug py-tight text-background text-body-compact shadow-floating has-data-[slot=kbd]:pr-tight data-[state=delayed-open]:animate-in data-closed:animate-out data-open:animate-in **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:rounded-precise',
            className,
          )}
          data-slot="tooltip-content"
          /**
           * `role="tooltip"`, WHICH BASE UI DOES NOT SUPPLY.
           *
           * Measured: on hover the popup mounts with `data-open`, `tabindex=-1`
           * and `data-base-ui-focusable` -- and NO role, while the trigger gets
           * no `aria-describedby`. That is deliberate on their side. Base UI's
           * own guidance: "Tooltips are visual-only and do not replace proper
           * labeling of the trigger element... They are not accessible to touch
           * or screen reader users."
           *
           * SO THIS ROLE IS HONESTY, NOT A FIX. A `role="tooltip"` nothing
           * references is still not announced, and adding `aria-describedby`
           * ourselves would be re-implementing what the library declined to do
           * -- against law 34, and against the grain of the primitive.
           *
           * THE RULE THAT ACTUALLY PROTECTS A READER is therefore a rule about
           * USE, and it lives in POLICY.md 3i: a tooltip may never be the only
           * carrier of its information, and the trigger's accessible name must
           * already say it. Base UI requires exactly that, and this component
           * cannot enforce it -- which is why Tooltip keeps `disclosure` and
           * still owes an A11y-3 session.
           */
          role="tooltip"
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="layer-overlay size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-precise bg-foreground fill-foreground data-[side=bottom]:top-related data-[side=inline-end]:top-related/2! data-[side=inline-start]:top-related/2! data-[side=left]:top-related/2! data-[side=right]:top-related/2! data-[side=inline-start]:-right-1 data-[side=left]:-right-1 data-[side=top]:-bottom-2.5 data-[side=inline-end]:-left-1 data-[side=right]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:-translate-y-1/2 data-[side=right]:-translate-y-1/2" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
