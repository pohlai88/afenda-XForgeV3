import { Input as InputPrimitive } from '@base-ui/react/input'
import * as React from 'react'

import { cn } from '@/lib/cn'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      className={cn(
        'focus-visible:focus-ring h-control w-full min-w-0 rounded-control border border-input bg-transparent px-snug py-related medium:text-body-compact text-body outline-none transition-colors file:inline-flex file:h-control file:border-0 file:bg-transparent file:font-label file:text-body-compact file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive aria-invalid:ring-3 dark:bg-field dark:aria-invalid:border-destructive dark:disabled:bg-disabled',
        className,
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  )
}

export { Input }
