import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/cn'

const buttonVariants = cva(
  "group/button focus-visible:focus-ring inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-container border border-transparent bg-clip-padding font-label text-body-compact outline-none transition duration-press disabled:pointer-events-none disabled:border-transparent disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive aria-invalid:ring-3 dark:aria-invalid:border-destructive [&_svg:not([class*='size-'])]:size-icon [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default:
          'h-control gap-tight px-snug has-data-[icon=inline-end]:pr-tight has-data-[icon=inline-start]:pl-tight',
        icon: 'size-8',
        'icon-lg': 'size-9',
        'icon-sm': 'size-7 in-data-[slot=button-group]:rounded-container rounded-control',
        'icon-xs':
          "size-6 in-data-[slot=button-group]:rounded-container rounded-control [&_svg:not([class*='size-'])]:size-icon",
        lg: 'h-control gap-tight px-snug has-data-[icon=inline-end]:pr-tight has-data-[icon=inline-start]:pl-tight',
        sm: "h-control gap-related in-data-[slot=button-group]:rounded-container rounded-control px-snug text-body-compact has-data-[icon=inline-end]:pr-tight has-data-[icon=inline-start]:pl-tight [&_svg:not([class*='size-'])]:size-icon",
        xs: "h-control gap-related in-data-[slot=button-group]:rounded-container rounded-control px-tight text-body-compact has-data-[icon=inline-end]:pr-tight has-data-[icon=inline-start]:pl-tight [&_svg:not([class*='size-'])]:size-icon",
      },
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed',
        // REWRITTEN FROM `bg-destructive text-destructive-foreground`. Opacity
        // composites: the pair the token graph can measure is not the pair a
        // reader sees, which is the defect that once rendered a disabled label
        // at 2.56:1 while every check reported 5.17:1. Real roles instead, so
        // the contrast invariant measures what the eye receives.
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-hover',
        ghost:
          'hover:bg-muted hover:text-foreground active:bg-accent aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-accent',
        link: 'text-primary underline-offset-4 hover:underline',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground active:bg-accent aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-field dark:hover:bg-muted',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-muted active:bg-secondary-pressed aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
      },
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ className, size, variant }))}
      data-slot="button"
      {...props}
    />
  )
}

export { Button, buttonVariants }
