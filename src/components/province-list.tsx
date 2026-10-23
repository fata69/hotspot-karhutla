import { X } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import type { ProvinceStats } from '@/lib/stats'
import { cn } from '@/lib/utils'

interface ProvinceListProps {
  stats: ProvinceStats[]
  activeProvince: string | null
  onSelect: (province: string | null) => void
  loading?: boolean
  page?: number
  pageSize?: number
}

export function ProvinceList({
  stats,
  activeProvince,
  onSelect,
  loading,
  page = 0,
  pageSize = 12,
}: ProvinceListProps) {
  const start = page * pageSize
  const visible = stats.slice(start, start + pageSize)
  const topCount = stats[0]?.count ?? 1

  if (loading && stats.length === 0) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="space-y-1.5 py-1">
            <div className="flex justify-between">
              <span className="h-2.5 animate-pulse bg-rule/50" style={{ width: `${50 + ((index * 13) % 30)}%` }} />
              <span className="h-2.5 w-8 animate-pulse bg-rule/50" />
            </div>
            <div className="h-px w-full bg-rule/40" />
          </div>
        ))}
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <div className="border border-dashed border-rule px-3 py-5 text-center">
        <p className="text-[11px] text-muted-foreground">
          Tidak ada provinsi dengan deteksi pada filter ini.
        </p>
      </div>
    )
  }

  return (
    <div>
      {activeProvince ? (
        <div className="mb-2.5 flex items-center justify-between gap-2 border border-ink bg-sand px-2.5 py-1.5">
          <span className="truncate font-mono text-[9px] uppercase tracking-[0.06em] text-ink">
            {activeProvince}
          </span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 p-1 text-ink-soft transition-colors hover:bg-ink hover:text-paper"
            aria-label="Hapus filter provinsi"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      <div>
        {visible.map((stat, index) => {
          const isActive = stat.name === activeProvince
          const rank = start + index + 1
          return (
            <button
              key={stat.name}
              type="button"
              onClick={() => onSelect(isActive ? null : stat.name)}
              className={cn(
                'group relative w-full border-b border-rule/50 py-1.5 pl-2 pr-1 text-left transition-colors last:border-b-0 hover:bg-sand/60',
                isActive && 'bg-sand/80',
              )}
              aria-pressed={isActive}
            >
              <span
                className={cn(
                  'absolute inset-y-0 left-0 w-[2px] bg-transparent transition-colors',
                  isActive ? 'bg-ember' : 'group-hover:bg-ink/30',
                )}
              />
              <span className="flex items-baseline gap-2">
                <span className="w-3 shrink-0 font-mono text-[8px] tabular-nums text-muted-foreground/70">
                  {String(rank).padStart(2, '0')}
                </span>
                <span
                  className={cn(
                    'flex-1 truncate text-[11.5px] leading-tight',
                    isActive ? 'font-semibold text-ink' : 'text-ink-soft',
                  )}
                >
                  {stat.name}
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink">
                  {formatNumber(stat.count)}
                </span>
              </span>
              <span className="mt-1 ml-5 flex h-[2px] w-[calc(100%-1.25rem)] bg-rule/50">
                <span
                  className={cn('h-full transition-all', isActive ? 'bg-ember' : 'bg-ink/45')}
                  style={{ width: `${Math.max(3, (stat.count / topCount) * 100)}%` }}
                />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
