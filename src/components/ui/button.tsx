import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-mint text-[#08211e] hover:bg-[#67e7c8]',
        secondary: 'border border-line bg-surface text-primary hover:bg-surface-raised',
        ghost: 'text-secondary hover:bg-surface hover:text-primary',
        destructive: 'bg-error text-midnight hover:bg-[#ff9c9c]',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-11 px-3 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

// The variant helper is part of the public button API.
// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
