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
            aria-label={window.label}
            className={cn(
              'relative flex h-[58px] flex-col items-start justify-center border px-2 text-left transition-colors',
              active
                ? 'border-ink bg-ink text-paper'
                : 'border-rule bg-transparent text-ink-soft hover:border-rule-strong hover:bg-sand/60',
            )}
          >
            <span className="flex items-baseline gap-1">
              <span className="font-display text-[26px] leading-none">{window.amount}</span>
              <span
                className={cn(
                  'font-mono text-[9px] uppercase leading-none tracking-[0.06em]',
                  active ? 'text-paper/70' : 'text-muted-foreground',
                )}
              >
                {window.unit}
              </span>
            </span>
            <span
              className={cn(
                'mt-1 font-mono text-[7.5px] uppercase leading-none tracking-[0.1em]',
                active ? 'text-paper/45' : 'text-muted-foreground/80',
              )}
            >
              terakhir
            </span>
            {active ? (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-ember" aria-hidden="true" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
