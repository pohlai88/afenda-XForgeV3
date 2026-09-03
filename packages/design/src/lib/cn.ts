import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { TWMERGE_CLASS_GROUPS } from '../../generated/twmerge'

/**
 * Compose class names, resolving Tailwind conflicts by last-one-wins.
 *
 * INTERNAL TO THE DESIGN SYSTEM. It is not in the package's `exports` map, and
 * that absence is the decision: a screen that could import `cn` could compose
 * classes, and the capability would sit one import away from every `className`
 * a review would otherwise have to catch by eye. Components style; screens
 * compose components.
 *
 * WHY twMerge AND NOT JUST clsx. Tailwind utilities collide at equal
 * specificity, so `"p-normal p-loose"` is decided by which rule the stylesheet
 * emits later -- Tailwind's internal ordering, not the order they were written.
 * That is the same "source order masquerading as architecture" the token
 * generator refuses for mode blocks, arriving through class strings instead.
 * `twMerge` resolves it at the call site, where the intent is: the last utility
 * wins, which is what anyone reading it expects.
 *
 * WHY IT IS CONFIGURED, AND WHAT HAPPENED WHILE IT WAS NOT. To resolve a
 * conflict twMerge must first decide which group a class is in, and it does that
 * by recognising Tailwind's own names. It recognises none of this system's. In
 * Tailwind `text-` is ambiguous -- `text-sm` is a size, `text-white` is a colour
 * -- so an unrecognised `text-body-compact` was filed as a COLOUR, put in the same
 * group as `text-on-primary-container`, and DELETED from the string as the loser.
 *
 * The nav rail is where it surfaced: items at 16px beneath a 14px group heading,
 * with `text-body-compact` written in the source and absent from the rendered
 * `className`. Typecheck, lint and the class-compile test all passed, because
 * the class is real and compiles -- it simply never arrived. Nothing in this
 * repository could have reported it; a person looking at the rendered rail did.
 *
 * The groups are GENERATED from the token projection rather than listed here,
 * because a list would be a second home for "which roles are sizes" (law 7),
 * and the failure mode of that disagreement is this same silent deletion.
 *
 * `override` RATHER THAN `extend`, because the bridge clears `--text-*`,
 * `--font-weight-*`, `--leading-*` and `--color-*`: Tailwind's own names in
 * those namespaces do not resolve to anything, so treating this as the complete
 * vocabulary is a statement of fact rather than a narrowing.
 *
 * A LIMIT THAT REMAINS. A utility defined with `@utility` -- `border-stroke`,
 * `focus-ring` -- is in no group twMerge knows, so two of them would both
 * survive a merge rather than one winning. There are two and neither conflicts
 * with the other. The day a third arrives that does, it belongs in a group here.
 */
const merge = extendTailwindMerge({
  override: { classGroups: TWMERGE_CLASS_GROUPS as unknown as Record<string, unknown[]> },
})

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs))
}
