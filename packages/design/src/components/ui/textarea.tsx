import * as React from 'react'

import { cn } from '@/lib/cn'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'field-sizing-content focus-visible:focus-ring flex min-h-16 w-full rounded-container border border-input bg-transparent px-snug py-tight medium:text-body-compact text-body outline-none transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive aria-invalid:ring-3 dark:bg-field dark:aria-invalid:border-destructive dark:disabled:bg-disabled',
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  )
}

export { Textarea }
