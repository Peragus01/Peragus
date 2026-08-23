import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  elevation?: 'base' | 'raised'
}

const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, elevation = 'base', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[10px] border border-line',
        elevation === 'raised' ? 'bg-surface-raised shadow-panel' : 'bg-surface',
        className,
      )}
      {...props}
    />
  ),
)
Surface.displayName = 'Surface'

export { Surface }
