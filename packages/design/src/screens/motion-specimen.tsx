import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Motion and interaction, which are the two foundations nothing else can show.
 *
 * A STATE IS ONLY REAL IF YOU CAN SEE IT. Focus, hover and pressed are the three
 * states a screenshot never contains and a test cannot judge: whether the focus
 * ring is findable, whether the pressed surface reads as a response rather than
 * as a flicker. They exist here so a person can put a cursor and a Tab key on
 * them.
 *
 * BEFORE THIS PASS: `active:` appeared once in the whole system — a 1px nudge on
 * the Button, which moves the element, and moving the element is the one thing
 * press feedback must not do. Both `primary-pressed` and `secondary-pressed` had
 * existed as tokens since the palette landed, with no consumer.
 *
 * AND TWO FOCUS INDICATORS WERE LIVE. Four uses of the outline utility, nineteen
 * of a box-shadow ring, so a keyboard user saw a different indicator depending on
 * which component they reached. `FRAGILE_MEANS` in this repo's own elevation
 * policy already recorded which of the two is wrong: box-shadow is discarded in
 * forced-colors mode, for the people most likely to depend on a focus ring.
 */

const DURATIONS = [
  { ms: '70ms', name: 'instant', use: 'a press, a toggle — response, not animation' },
  { ms: '110ms', name: 'fast', use: 'a fade; a small element entering or leaving' },
  { ms: '150ms', name: 'normal', use: 'the default transition speed' },
  { ms: '240ms', name: 'deliberate', use: 'an overlay or drawer, which has weight' },
] as const

export function MotionSpecimen() {
  return (
    <div className="flex flex-col gap-loose">
      <div className="flex flex-col gap-tight">
        <span className="font-label text-foreground text-label">
          Every state of a control — hover it, Tab to it, hold it down
        </span>
        <div className="flex flex-wrap items-center gap-tight">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </div>
        <span className="font-caption text-caption text-muted-foreground">
          One focus indicator everywhere: a 2px outline at 2px offset, which survives forced-colors
          where a box-shadow ring does not.
        </span>
      </div>

      <div className="flex flex-col gap-tight">
        <span className="font-label text-foreground text-label">Duration roles</span>
        {DURATIONS.map((d) => (
          <div className="flex items-baseline gap-tight" key={d.name}>
            <span className="w-24 font-mono text-caption text-muted-foreground tabular-nums">
              {d.ms}
            </span>
            <span className="w-24 font-label text-foreground text-label">{d.name}</span>
            <span className="font-caption text-caption text-muted-foreground">{d.use}</span>
          </div>
        ))}
      </div>

      {/*
        THE ONE LOOP IN THE SYSTEM, and the reason the motion policy has a `loops`
        field. WCAG 2.2.2 wants motion past five seconds to be stoppable and a loop
        never stops on its own, so the only honest reduced-motion answer is to
        remove it — which `MOTION_ROLES` declares and the stylesheet honours.
      */}
      <div className="flex flex-col gap-tight">
        <span className="font-label text-foreground text-label">
          The only looping animation, and the only one reduced motion removes
        </span>
        <div className="flex max-w-prose flex-col gap-related">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <span className="font-caption text-caption text-muted-foreground">
          Under prefers-reduced-motion the shimmer stops and the skeleton stays. Removing the
          animation must never remove the state.
        </span>
      </div>
    </div>
  )
}
