import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * Swatch — one colour role shown as itself.
 *
 * Adaptee   native `div`
 * Intent    ADOPT
 * Owns      colour: a fill or a stroke from the STYLE tree, at rest
 * Contract  inherited from the element; a swatch is a picture, and the caller captions it
 *
 * THE DICTIONARY WORD. A component wears a colour role; a swatch IS the role, so the role
 * can be judged before anything wears it, and so the eight roles nothing wears yet can be
 * seen at all. A fill carries its companion ink on a sample glyph, because the pair is
 * what has to be readable; a fill with no companion wears the page ink, which is what text
 * on it will wear. A stroke is drawn round the page ground in its own colour.
 *
 * THE ROLES ARE DERIVED, NOT LISTED. Every root in the STYLE tree whose `background` is a
 * class at rest -- no variant prefix -- is a fill; every root with a `border` and no
 * `background` is a stroke. Fills that exist only under a state (`data-checked:`,
 * `disabled:`) are not swatch roles: a swatch has no state, and the components that own
 * those fills show them. The type is derived from the tree the same way, so a role that
 * leaves the tree stops compiling here.
 */

type AtRest<T> = T extends `${string}:${string}` ? never : T
type FillRoots<G> = {
  [R in keyof G]: G[R] extends { readonly background: infer B extends string }
    ? AtRest<B> extends never
      ? never
      : R
    : never
}[keyof G]
type StrokeRoots<G> = {
  [R in keyof G]: G[R] extends { readonly background: string }
    ? never
    : G[R] extends { readonly border: infer S extends string }
      ? AtRest<S> extends never
        ? never
        : R
      : never
}[keyof G]

/** Section 3 — the Target. */
export type SwatchRole = {
  [G in keyof typeof STYLE]: `${G & string}.${(FillRoots<(typeof STYLE)[G]> | StrokeRoots<(typeof STYLE)[G]>) & string}`
}[keyof typeof STYLE]

/**
 * `colour`, not `role`: `role` is the ARIA attribute, and a prop that shadows it would take the
 * accessibility tree's word for a paint. Text renamed its own axis for the same reason.
 */
export interface SwatchProps extends NativeProps<'div'> {
  readonly colour: SwatchRole
}

interface RoleRecipe {
  readonly fill: string
  readonly ink: string
  readonly kind: 'fill' | 'stroke'
  readonly stroke: string | undefined
}

const atRest = (cls: unknown): cls is string => typeof cls === 'string' && !cls.includes(':')

/** The same derivation at runtime, walking the tree once. */
export const SWATCH_ROLES: Readonly<Record<SwatchRole, RoleRecipe>> = (() => {
  const roles: Record<string, RoleRecipe> = {}
  for (const [group, roots] of Object.entries(STYLE)) {
    for (const [root, leaves] of Object.entries(roots as Record<string, unknown>)) {
      if (typeof leaves !== 'object' || leaves === null) {
        continue
      }
      const { background, border, foreground } = leaves as Record<string, unknown>
      if (atRest(background)) {
        roles[`${group}.${root}`] = {
          fill: background,
          ink: atRest(foreground) ? foreground : STYLE.ink.onSurface.text,
          kind: 'fill',
          stroke: undefined,
        }
      } else if (background === undefined && atRest(border)) {
        roles[`${group}.${root}`] = {
          fill: STYLE.surface.default.background,
          ink: STYLE.ink.onSurface.text,
          kind: 'stroke',
          stroke: border,
        }
      }
    }
  }
  return roles as Record<SwatchRole, RoleRecipe>
})()

/** Section 4 — the Adapter. */
export function Swatch({ colour, ...props }: SwatchProps) {
  const recipe = SWATCH_ROLES[colour]
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        STYLE.size.control,
        STYLE.space.controlX.paddingX,
        STYLE.shape.control,
        STYLE.stroke.width,
        recipe.stroke ?? STYLE.outline.variant.border,
        recipe.fill,
        recipe.ink,
        STYLE.typography.emphasis,
      )}
      data-colour={colour}
      data-slot="swatch"
      {...props}
    >
      Aa
    </div>
  )
}
