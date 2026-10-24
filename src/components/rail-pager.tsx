import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RailPagerProps {
  page: number
  total: number
  label: string
  onPrev: () => void
  onNext: () => void
  className?: string
}

const buttonClass =
  'flex h-10 w-10 shrink-0 items-center justify-center border border-transparent text-ink-soft transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-25 lg:h-8 lg:w-8'

export function RailPager({ page, total, label, onPrev, onNext, className }: RailPagerProps) {
  const atStart = page <= 0
  const atEnd = page >= total - 1

  return (
    <div
      className={cn(
        'flex h-12 shrink-0 items-center gap-1.5 border-t border-rule bg-paper-raised px-2 lg:h-10',
        className,
      )}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={atStart}
        aria-label="Lembar sebelumnya"
        className={buttonClass}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1 text-center" aria-live="polite">
        <div className="truncate font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-soft">
          {label}
        </div>
        <div className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-muted-foreground">
          Lembar {String(page + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={atEnd}
        aria-label="Lembar berikutnya"
        className={buttonClass}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
