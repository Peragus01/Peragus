import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type NoticeProps = HTMLAttributes<HTMLDivElement> & {
  tone: 'info' | 'sandbox' | 'error'
}

const noticeTone = {
  info: 'border-data bg-data/10 text-secondary',
  sandbox: 'border-sandbox bg-sandbox/10 text-secondary',
  error: 'border-error bg-error/10 text-secondary',
}

const Notice = forwardRef<HTMLDivElement, NoticeProps>(
  ({ className, tone, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      role="note"
      className={cn('rounded-r-[7px] border-l-2 px-4 py-3 text-sm', noticeTone[tone], className)}
    />
  ),
)
Notice.displayName = 'Notice'

export { Notice }
