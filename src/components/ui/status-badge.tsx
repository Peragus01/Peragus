import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone: 'active' | 'data' | 'sandbox'
}

const statusTone = {
  active: 'border-mint/30 bg-mint/10 text-mint',
  data: 'border-data/30 bg-data/10 text-data',
  sandbox: 'border-sandbox/30 bg-sandbox/10 text-sandbox',
}

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, tone, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-xs font-medium',
        statusTone[tone],
        className,
      )}
      {...props}
    />
  ),
)
StatusBadge.displayName = 'StatusBadge'

export { StatusBadge }
