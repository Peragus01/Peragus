import { cn } from '@/lib/utils'

export type SectionHeadingProps = {
  eyebrow?: string
  title: string
  description?: string
  as?: 'h1' | 'h2' | 'h3'
  align?: 'left' | 'center'
  className?: string
}

function SectionHeading({
  eyebrow,
  title,
  description,
  as: Heading = 'h2',
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('space-y-3', align === 'center' && 'mx-auto max-w-3xl text-center', className)}>
      {eyebrow && (
        <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-mint">{eyebrow}</p>
      )}
      <Heading className="text-3xl font-semibold tracking-[-0.03em] text-primary sm:text-4xl">{title}</Heading>
      {description && <p className="text-base leading-7 text-secondary">{description}</p>}
    </div>
  )
}

export { SectionHeading }
