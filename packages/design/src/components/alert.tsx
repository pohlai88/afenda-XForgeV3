import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * Alert — a message about the state of the thing on screen, not about the application.
 *
 * Adaptee   native `div`, with lucide-react icons
 * Intent    ADOPT
 * Owns      tone (danger | info | success | warning)
 * Contract  tone -> role: which tones interrupt a screen reader (`ALERT_TONE`)
 *
 * TONE IS A ROLE, AND IT NEVER CARRIES THE MEANING ALONE. Every tone is a pale
 * backdrop with dark text — a surface a person reads, not a control they press,
 * which is why `destructive` is not in this list: that is an ACTION fill, and a
 * button painted with it is a different thing from a region painted with it.
 * The words inside carry the message; the colour only groups it.
 *
 * THE REDUNDANT CUE IS SHAPE. Measured, the pale tints collapse under simulated
 * colour-vision deficiency (success against error: 18.9 CIEDE2000 for a typical
 * observer, 0.5 for a deuteranope), and raising chroma would destroy the backdrop
 * this component exists to be. So the icon is a table entry rather than a rule: a
 * tone cannot be selected without its icon, because they are the same value.
 *
 * `aria-hidden` ON THE ICON, DELIBERATELY. The redundancy needed here is VISUAL.
 * A screen reader gets the role and the words; naming the icon as well would
 * announce the tone twice. Passed explicitly rather than left to lucide's default,
 * which is the kind of implicit accessibility behaviour a minor upgrade changes.
 *
 * THE ROLE IS DECIDED BY THE TABLE, NOT BY THE COMPONENT (ADR-031 Decision 11).
 * This file used to hard-code `role="status"` for every tone, "deliberately", while
 * five end-to-end specs asserted `role="alert"` on danger and warning; neither read
 * the other. Now `ALERT_TONE` is the one owner. `danger` and `warning` interrupt —
 * a failed write, a refused write — and `info` and `success` wait for the reader.
 * That is the owner's answer for today's screen (2026-09-03), revisable when a
 * screen produces a static danger advisory that should not interrupt; urgency is
 * not made its own axis until one does (Decision 4).
 *
 * NO `aria-live`, BY DESIGN. `role="alert"` already implies `aria-live="assertive"`
 * and an explicit duplicate double-speaks in VoiceOver on iOS; `role="status"`
 * implies polite. The role is the whole declaration.
 */
export const ALERT_TONE = {
  // FOUR TONES, AND `danger` IS NOT `warning`. These two were the same class
  // string once: a failed write and a refused write rendered as the same pixels,
  // and only the copy told them apart. There was no error TINT, because
  // `destructive` is a saturated action fill, not a backdrop somebody reads.
  danger: {
    className: 'bg-error text-error-foreground border-border',
    Icon: CircleX,
    role: 'alert',
  },
  info: {
    className: 'bg-info text-info-foreground border-border',
    Icon: Info,
    role: 'status',
  },
  // `success` existed as a role with no consumer anywhere in the system: nothing
  // could express an outcome that went well.
  success: {
    className: 'bg-success text-success-foreground border-border',
    Icon: CircleCheck,
    role: 'status',
  },
  warning: {
    className: 'bg-warning text-warning-foreground border-border',
    Icon: TriangleAlert,
    role: 'alert',
  },
} as const satisfies Record<
  string,
  { className: string; Icon: typeof Info; role: 'alert' | 'status' }
>

/**
 * `role` IS NOT A PROP. The table decides it (Decision 11), and the spread below comes
 * after `role={role}`, so a caller's `role` would have won silently -- rendered to check:
 * `<Alert tone="danger" role="status">` came out as `status`. Omitting it from the Target
 * makes the override a compile error instead of a runtime surprise nothing asserts.
 */
export interface AlertProps extends Omit<ComponentProps<'div'>, 'role'> {
  readonly tone?: keyof typeof ALERT_TONE
}

export function Alert({ children, className, tone = 'info', ...props }: AlertProps) {
  const { Icon, className: toneClassName, role } = ALERT_TONE[tone]
  return (
    <div
      className={cn(
        'flex items-start gap-tight rounded-control border px-row-x py-control-y',
        toneClassName,
        className,
      )}
      data-slot="alert"
      data-tone={tone}
      role={role}
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
