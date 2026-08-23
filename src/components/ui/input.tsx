import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex min-h-11 w-full rounded-[7px] border border-line bg-midnight px-3 py-2 text-sm text-primary transition-colors duration-150 placeholder:text-tertiary focus-visible:border-mint focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-error',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
