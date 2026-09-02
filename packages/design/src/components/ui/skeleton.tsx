import { cn } from '@/lib/cn'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-shimmer rounded-control bg-muted', className)}
      data-slot="skeleton"
      {...props}
    />
  )
}

export { Skeleton }
