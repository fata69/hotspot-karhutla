import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionProps {
  index: string
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function Section({ index, title, aside, children, className, contentClassName }: SectionProps) {
  return (
    <section className={cn('border-b border-rule px-4 py-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="micro-label text-ember">{index}</span>
        <span className="micro-label text-muted-foreground">{title}</span>
        <span className="h-px flex-1 bg-rule" />
        {aside ? <span className="micro-label text-muted-foreground">{aside}</span> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  )
}
