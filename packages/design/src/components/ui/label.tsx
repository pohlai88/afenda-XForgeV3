'use client'

import * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * `htmlFor` IS REQUIRED, and that is the fix rather than the suppression below.
 *
 * A <label> with no control is the accessibility defect the lint rule exists to
 * catch: it reads as text, announces nothing, and clicking it focuses nothing.
 * Upstream leaves the association to the caller and hopes. Requiring it in the
 * type makes the omission a compile error instead, which is the same rule
 * enforced one layer earlier and by something that cannot be forgotten.
 *
 * The rule still fires here because it reads this file, where no control is in
 * scope -- it cannot see the call sites the type now constrains. So the
 * suppression rests on the signature rather than on a promise.
 */
function Label({ className, ...props }: React.ComponentProps<'label'> & { htmlFor: string }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is required by the signature above, so every instance names its control
    <label
      className={cn(
        'flex select-none items-center gap-tight font-label text-label peer-disabled:cursor-not-allowed peer-disabled:text-disabled-foreground group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-disabled-foreground',
        className,
      )}
      data-slot="label"
      {...props}
    />
  )
}

export { Label }
