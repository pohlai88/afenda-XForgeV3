import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * A paragraph, at one of the roles the scale actually has.
 *
 * `emphasis` IS THE SECOND AXIS. Same 16px as `body`, at 500 rather than 400 --
 * the term against its value. Apple sets Headline against Body this way at an
 * identical 17pt, and Material 3 ships an Emphasized variant of every role;
 * neither reaches for another size, and a dense grid loses more to a fifth step
 * than it gains.
 *
 * `tone` is SEMANTIC AND SEPARATE from prominence. Muted is "still true, less
 * urgent" -- a hint under a field, a secondary line in a row. It is never used
 * to make something look less important that a reader still has to act on.
 *
 * THE PROP IS `variant`, AND IT USED TO BE `role`. The type policy calls these
 * ROLES and that word is right in the policy -- but on a component it shadowed
 * the global ARIA attribute of the same name, and the three values it takes are
 * not valid ARIA roles. So `<Text role="label">` read to a linter, and to anyone
 * skimming the JSX, as an invalid `role` on a paragraph. It needed a four-line
 * comment in the gallery to explain that it was not.
 *
 * `variant` is what `Button` and `Badge` already expose for the same question --
 * which of a fixed set of appearances -- so the rename removes the collision and
 * closes a naming inconsistency at once. Nothing is lost: `role` was never
 * carrying the policy's meaning to the DOM, only to a lookup table.
 */
const textVariants = cva('m-0', {
  defaultVariants: {
    tone: 'default',
    variant: 'body',
  },
  variants: {
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
    },
    variant: {
      body: 'font-body text-body',
      emphasis: 'font-emphasis text-emphasis',
      label: 'font-label text-body-compact',
    },
  },
})

export function Text({
  children,
  className,
  tone,
  variant,
  ...props
}: ComponentProps<'p'> & VariantProps<typeof textVariants>) {
  return (
    <p className={cn(textVariants({ tone, variant }), className)} data-slot="text" {...props}>
      {children}
    </p>
  )
}

export { textVariants }
