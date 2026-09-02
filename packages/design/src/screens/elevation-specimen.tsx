/**
 * The five planes, side by side, in whichever theme is on.
 *
 * WHY THIS ONE HAS TO BE LOOKED AT. Every other claim about this model is
 * arithmetic or structure: the surfaces are contrast-measured, the layers are
 * checked against roles that exist, the namespace is closed so an off-vocabulary
 * shadow cannot compile. None of that can answer the question the dark theme
 * actually raises.
 *
 * IN DARK, THE SHADOW INK IS REBOUND TO TRANSPARENT. A shadow on a near-black
 * ground does nothing, so depth there is carried entirely by surface separation
 * -- `background` to `card` to `popover`. Whether those three steps are actually
 * distinguishable is not a number anyone can check; it is a thing a person sees
 * or does not. Toggle the theme above and look at the right-hand column.
 */

interface Plane {
  readonly cls: string
  readonly name: string
  readonly use: string
}

const PLANES: readonly Plane[] = [
  { cls: 'shadow-flat bg-card', name: 'flat', use: 'page · card · table · form · rail · tabs' },
  {
    cls: 'shadow-raised bg-card',
    name: 'raised',
    use: 'a sticky surface, once content has scrolled beneath it',
  },
  {
    cls: 'shadow-floating bg-popover',
    name: 'floating',
    use: 'menu · select · popover · tooltip',
  },
  { cls: 'shadow-overlay bg-popover', name: 'overlay', use: 'sheet · drawer · command palette' },
  { cls: 'shadow-modal bg-popover', name: 'modal', use: 'dialog — with the scrim below' },
]

export function ElevationSpecimen() {
  return (
    <div className="flex flex-col gap-loose">
      <div className="flex flex-wrap items-start gap-loose">
        {PLANES.map((plane) => (
          <div className="flex w-56 flex-col gap-tight" key={plane.name}>
            <div
              className={`flex h-24 items-center justify-center rounded-control border border-border ${plane.cls}`}
            >
              <span className="font-label text-card-foreground text-label">{plane.name}</span>
            </div>
            <p className="m-0 font-caption text-caption text-muted-foreground">{plane.use}</p>
          </div>
        ))}
      </div>

      {/*
        THE SCRIM IS THE OTHER HALF OF `modal`, and it does most of the work.
        It is a COLOUR role rather than an effect, which is why a theme rebinds it
        and forced-colors still renders it -- a shadow would survive neither.
      */}
      <div className="relative h-32 overflow-hidden rounded-control border border-border bg-background">
        <div className="p-normal">
          <p className="m-0 text-body text-foreground">The page, behind a scrim.</p>
          <p className="m-0 text-body-compact text-muted-foreground">
            Statutory contributions for October 2026 · RM 5,200.00
          </p>
        </div>
        <div className="absolute inset-0 bg-scrim" />
        <div className="absolute top-related/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-control border border-border bg-popover px-row-x py-control-y shadow-modal">
          <span className="font-emphasis text-emphasis text-popover-foreground">
            Reverse payroll run?
          </span>
        </div>
      </div>
    </div>
  )
}
