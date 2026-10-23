import { CONFIDENCE_META, type Confidence } from '@/types'
import { cn } from '@/lib/utils'

interface ConfidenceMarkProps {
  confidence: Confidence
  className?: string
  showLabel?: boolean
}

export function ConfidenceMark({ confidence, className, showLabel = true }: ConfidenceMarkProps) {
  const meta = CONFIDENCE_META[confidence]
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: meta.color }} aria-hidden="true" />
      {showLabel ? (
        <span className="font-mono text-[8px] uppercase tracking-[0.08em]">{meta.label}</span>
      ) : null}
    </span>
  )
}
