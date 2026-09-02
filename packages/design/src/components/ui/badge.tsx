import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'group/badge focus-visible:focus-ring inline-flex h-5 w-fit shrink-0 items-center justify-center gap-related overflow-hidden whitespace-nowrap rounded-full border border-transparent px-tight py-related font-label text-body-compact transition has-data-[icon=inline-end]:pr-tight has-data-[icon=inline-start]:pl-tight aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-icon!',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary-hover',
        destructive:
          'bg-destructive text-destructive-foreground dark:bg-destructive [a]:hover:bg-destructive-hover',
        ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-accent',
        link: 'text-primary underline-offset-4 hover:underline',
        outline: 'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary-hover',
      },
    },
  },
)

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  })
}

export { Badge, badgeVariants }
