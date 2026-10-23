import { TIME_WINDOWS, type TimeWindow } from '@/types'
import { cn } from '@/lib/utils'

interface PeriodPickerProps {
  value: TimeWindow
  onChange: (value: TimeWindow) => void
}

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Rentang waktu deteksi">
      {TIME_WINDOWS.map((window) => {
        const active = value === window.value
        return (
          <button
            key={window.value}
            type="button"
            onClick={() => onChange(window.value)}
            aria-pressed={active}
            className={cn(
              'relative flex h-[62px] flex-col items-start justify-between border px-2 py-1.5 text-left transition-colors',
              active
                ? 'border-ink bg-ink text-paper'
                : 'border-rule bg-transparent text-ink-soft hover:border-rule-strong hover:bg-sand/60',
            )}
          >
            <span
              className={cn(
                'font-mono text-[7.5px] uppercase leading-none tracking-[0.12em]',
                active ? 'text-paper/55' : 'text-muted-foreground',
              )}
            >
              {window.unit}
            </span>
            <span className="flex items-baseline gap-1">
              <span className="font-display text-[27px] leading-none">{window.amount}</span>
              {active ? <span className="h-1.5 w-1.5 bg-ember" aria-hidden="true" /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
