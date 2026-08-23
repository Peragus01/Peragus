import peragusLogo from '@/assets/peragus-logo.png'
import { cn } from '@/lib/utils'

interface PeragusMarkProps {
  className?: string
}

interface PeragusLogoProps extends PeragusMarkProps {
  textClassName?: string
}

export function PeragusMark({ className }: PeragusMarkProps) {
  return (
    <img
      src={peragusLogo}
      alt=""
      aria-hidden="true"
      className={cn('h-9 w-auto shrink-0 object-contain', className)}
    />
  )
}

export function PeragusLogo({ className, textClassName }: PeragusLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <PeragusMark />
      <span
        aria-hidden="true"
        className={cn(
          'text-xl font-bold leading-none tracking-tight text-primary',
          textClassName,
        )}
      >
        eragus
      </span>
      <span className="sr-only">Peragus</span>
    </div>
  )
}
