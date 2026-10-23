import { useState } from 'react'
import { formatNumber } from '@/lib/format'
import type { TrendData } from '@/lib/stats'
import { cn } from '@/lib/utils'

interface TrendChartProps {
  trend: TrendData
  loading?: boolean
}

export function TrendChart({ trend, loading }: TrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const { bins, mode, max } = trend
  const active = activeIndex === null ? null : bins[activeIndex]
  const peak = trend.peak

  if (loading && bins.every((bin) => bin.count === 0)) {
    return (
      <div className="space-y-3" aria-hidden="true">
        <div className="h-3 w-2/3 animate-pulse bg-rule/60" />
        <div className="flex h-[92px] items-end gap-[3px]">
          {Array.from({ length: 24 }, (_, index) => (
            <div
              key={index}
              className="flex-1 animate-pulse bg-rule/40"
              style={{ height: `${20 + ((index * 17) % 65)}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (bins.every((bin) => bin.count === 0)) {
    return (
      <div>
        <div className="flex h-[92px] items-center justify-center border-y border-dashed border-rule">
          <p className="text-[11px] text-muted-foreground">Belum ada deteksi pada filter ini.</p>
        </div>
        <div className="mt-2 flex justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
          <span>00 WIB</span>
          <span>12 WIB</span>
          <span>23 WIB</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <div className="micro-label text-muted-foreground">
            {mode === 'hour' ? 'Pola per jam · 24 jam' : 'Tren harian · WIB'}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-[24px] leading-none text-ink">
              {formatNumber(peak)}
            </span>
            <span className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
              puncak deteksi
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-ember" />
            Tinggi
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-ink/65" />
            Total
          </span>
        </div>
      </div>

      <div
        className="relative h-[96px] border-b border-ink/30"
        role="img"
        aria-label={`Grafik ${mode === 'hour' ? 'pola per jam' : 'tren harian'} deteksi titik panas. Puncak ${peak} deteksi.`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-rule/50" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-rule/35" />
        <div
          className={cn('flex h-full items-end', mode === 'hour' ? 'gap-[2px]' : 'gap-[6px]')}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {bins.map((bin, index) => {
            const height = max > 0 ? (bin.count / max) * 100 : 0
            const highShare = bin.count > 0 ? (bin.high / bin.count) * 100 : 0
            return (
              <div
                key={bin.key}
                className="group relative flex h-full flex-1 items-end"
                onMouseEnter={() => setActiveIndex(index)}
              >
                <div
                  className={cn(
                    'relative w-full min-h-[1px] bg-ink/60 transition-all duration-150',
                    bin.partial && 'bg-ink/35',
                    activeIndex === index && 'bg-ember',
                    bin.count === 0 && 'bg-rule/50',
                  )}
                  style={{ height: `${Math.max(bin.count > 0 ? 2 : 0.8, height)}%` }}
                >
                  {bin.high > 0 ? (
                    <span
                      className={cn(
                        'absolute inset-x-0 bottom-0 bg-ember transition-colors duration-150',
                        activeIndex === index && 'bg-ink',
                        bin.partial && 'opacity-80',
                      )}
                      style={{ height: `${highShare}%` }}
                    />
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-1 flex">
        {bins.map((bin, index) => {
          const showLabel =
            mode === 'day' ||
            index === 0 ||
            index === bins.length - 1 ||
            index % 3 === 0
          return (
            <span
              key={bin.key}
              className={cn(
                'flex-1 text-center font-mono text-[7.5px] leading-none tracking-[0.04em] text-muted-foreground',
                !showLabel && 'invisible',
              )}
            >
              {bin.label}
            </span>
          )
        })}
      </div>

      <div className="mt-2 min-h-[15px]">
        {active ? (
          <p className="font-mono text-[9px] uppercase tracking-[0.04em] text-ink-soft">
            {active.title} · <span className="font-semibold text-ink">{formatNumber(active.count)}</span> titik
            {active.high > 0 ? ` · ${formatNumber(active.high)} tinggi` : ''}
            {active.partial ? ' · periode berjalan' : ''}
          </p>
        ) : (
          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
            Arahkan kursor ke batang untuk rincian
          </p>
        )}
      </div>
    </div>
  )
}
