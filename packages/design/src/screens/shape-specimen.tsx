import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * The shape roles, and the one relationship between them that matters.
 *
 * WHAT ARITHMETIC CANNOT ANSWER. That each role resolves to the right number is
 * checkable; that a 12px container holding an 8px control reads as harmonious is
 * not. Concentric corners are a perceptual claim -- Apple's whole argument for
 * them is that the eye reads the curves as related or as accidental -- and the
 * only way to settle it is to put the two together and look.
 *
 * THE CARD BELOW IS THE ACTUAL DEFECT THIS FIXED. Before this pass, the card and
 * the input inside it both rendered 12px: a container and the thing it contained
 * at identical radii. It looked acceptable only because a Tailwind default and
 * one of our tokens happened to collide at that value, and nothing kept them
 * agreeing.
 */

const ROLES = [
  { cls: 'rounded-none', name: 'square', px: '0', use: 'tables, connected structure, grid cells' },
  { cls: 'rounded-precise', name: 'precise', px: '4', use: 'tags, checkboxes, tiny elements' },
  { cls: 'rounded-control', name: 'control', px: '8', use: 'buttons, inputs, selects' },
  { cls: 'rounded-container', name: 'container', px: '12', use: 'cards, panels, menus, popovers' },
  { cls: 'rounded-overlay', name: 'overlay', px: '16', use: 'dialogs, drawers, command palette' },
  { cls: 'rounded-full', name: 'full', px: '∞', use: 'pills, avatars, circular controls' },
] as const

export function ShapeSpecimen() {
  return (
    <div className="flex flex-col gap-loose">
      <div className="flex flex-wrap items-start gap-normal">
        {ROLES.map((role) => (
          <div className="flex w-40 flex-col gap-related" key={role.name}>
            <div
              className={`flex h-20 items-center justify-center border border-border bg-card ${role.cls}`}
            >
              <span className="font-mono text-caption text-muted-foreground tabular-nums">
                {role.px}
              </span>
            </div>
            <span className="font-label text-foreground text-label">{role.name}</span>
            <span className="font-caption text-caption text-muted-foreground">{role.use}</span>
          </div>
        ))}
      </div>

      {/*
        CONCENTRIC, AND DELIBERATELY SHOWN AT SIZE. A container one step above the
        controls it holds -- 12 outside, 8 inside -- is the relationship Apple's
        corner configuration exists to express and the one this system got wrong.
      */}
      <div className="flex flex-col gap-tight rounded-container border border-border bg-card p-normal">
        <span className="font-caption text-caption text-muted-foreground">
          container 12 · control 8
        </span>
        <Label htmlFor="shape-specimen-field">Employee number</Label>
        <Input id="shape-specimen-field" placeholder="EMP-0001" />
        <div className="flex gap-tight">
          <Button size="sm">Save</Button>
          <Button size="sm" variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
