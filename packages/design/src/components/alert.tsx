import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * A message about the state of the thing on screen, not about the application.
 *
 * TONE IS A ROLE, AND IT NEVER CARRIES THE MEANING ALONE. Every tone is a pale
 * backdrop with dark text — a surface a person reads, not a control they press,
 * which is why `destructive` is not in this list: that is an ACTION fill, and a
 * button painted with it is a different thing from a region painted with it.
 * The words inside carry the message; the colour only groups it.
 *
 * THAT SENTENCE USED TO BE A CLAIM AND IS NOW A CONSTRUCTION, because measuring
 * it found it was neither enforced nor true for every reader. `DISTINCT_PAIRS`
 * proves `success` and `error` sit 18.9 apart in CIEDE2000 — six times the 3.0
 * floor. Under a simulated deuteranope (Viénot/Brettel/Mollon 1999) the same
 * pair measures **0.5**, and 1.2 in dark mode. Thirteen of the forty
 * pair-observer combinations collapse that way.
 *
 * THE PALETTE CANNOT FIX IT, and reaching for the obvious check is the trap: a
 * CVD-simulated ΔE gate would fail thirteen pairs on the day it was added, and
 * the only way to pass is to raise chroma — which destroys the pale backdrop
 * this component exists to be. Low-chroma tints collapse under CVD close to by
 * definition.
 *
 * SO THE REDUNDANT CUE IS SHAPE, which is the one channel colour-vision
 * deficiency does not touch, and it is a table entry rather than a rule: a tone
 * cannot be selected without its icon, because they are the same value. That is
 * stronger than a guard over call sites and needs no fixture to keep true.
 *
 * `aria-hidden` ON THE ICON, DELIBERATELY. The redundancy needed here is
 * VISUAL. A screen reader already gets `role="status"` and the words; naming the
 * icon as well would announce the tone twice. It is passed explicitly rather
 * than left to `lucide-react`, which adds it to a childless icon on its own —
 * an implicit accessibility default is exactly the kind of thing that changes on
 * a minor upgrade and takes nothing with it when it goes.
 *
 * THE CONTRACT REVISION DOES NOT MOVE. `revision` is what invalidates a recorded
 * screen-reader session, and a hidden icon changes no announcement — the session
 * evidence for this component is still true. Bumping it would discard evidence to
 * describe a change that evidence cannot see.
 *
 * `role="status"` rather than `alert`, deliberately. `alert` is assertive and
 * interrupts whatever a screen reader is saying. These appear as the result of
 * something the reader just did — a read finished, a write conflicted — so
 * polite is correct and interrupting is rude.
 */
const TONE = {
  // FOUR TONES, AND `danger` IS NOT `warning`. These two were the same class
  // string: a failed write and a refused write rendered as the same pixels, and
  // only the copy told them apart. The cause was structural -- there was no error
  // TINT, because `destructive` is a saturated action fill for a button somebody
  // presses, not a backdrop somebody reads.
  danger: { className: 'bg-error text-error-foreground border-border', Icon: CircleX },
  info: { className: 'bg-info text-info-foreground border-border', Icon: Info },
  // `success` existed as a role with no consumer anywhere in the system: nothing
  // could express an outcome that went well.
  success: { className: 'bg-success text-success-foreground border-border', Icon: CircleCheck },
  warning: { className: 'bg-warning text-warning-foreground border-border', Icon: TriangleAlert },
} as const

export function Alert({
  children,
  className,
  tone = 'info',
  ...props
}: ComponentProps<'div'> & {
  readonly tone?: keyof typeof TONE
}) {
  const { Icon, className: toneClassName } = TONE[tone]
  return (
    <div
      className={cn(
        'flex items-start gap-tight rounded-control border px-row-x py-control-y',
        toneClassName,
        className,
      )}
      data-slot="alert"
      role="status"
      {...props}
    >
      {/* `items-start` rather than a nudge: the icon is one token tall and the
          first line box is taller, so it sits marginally high of optical centre.
          Closing that gap would mean writing a length this system has no role
          for, and a two-pixel literal is a worse trade than two pixels. */}
      <Icon aria-hidden="true" className="size-icon shrink-0" />
      <div className="flex flex-col gap-tight">{children}</div>
    </div>
  )
}
