import { formatCompact, formatDecimal, formatNumber, formatRelative, formatWIBTime } from '@/lib/format'
import type { SummaryStats } from '@/lib/stats'
import { cn } from '@/lib/utils'

interface SummaryGridProps {
  summary: SummaryStats
  loading: boolean
  latestAcq: number | null
  provinceScope: string | null
}

function ValueSkeleton({ wide = false }: { wide?: boolean }) {
  return <span className={cn('mt-1 block h-[22px] animate-pulse bg-rule/60', wide ? 'w-full' : 'w-14')} />
}

export function SummaryGrid({ summary, loading, latestAcq, provinceScope }: SummaryGridProps) {
  const empty = !loading && summary.total === 0

  return (
    <div aria-live="polite">
      <div className="grid grid-cols-2 border-l border-t border-rule">
        <div className="min-h-[82px] border-b border-r border-rule p-2.5">
          <div className="micro-label text-muted-foreground">Titik panas</div>
          {loading ? (
            <ValueSkeleton />
          ) : (
            <div className="mt-1.5 font-sans text-[29px] font-semibold leading-none tracking-[-0.03em] text-ink">
              {formatNumber(summary.total)}
            </div>
          )}
          <div className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.05em] text-muted-foreground">
            {empty ? 'Tidak ada deteksi' : `${formatNumber(summary.strong)} titik ≥ 50 MW`}
          </div>
        </div>

        <div className="min-h-[82px] border-b border-r border-rule p-2.5">
          <div className="micro-label text-muted-foreground">Total FRP</div>
          {loading ? (
            <ValueSkeleton />
          ) : (
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="font-sans text-[29px] font-semibold leading-none tracking-[-0.03em] text-ink">
                {formatCompact(summary.frpTotal)}
              </span>
              <span className="font-mono text-[8px] uppercase text-muted-foreground">MW</span>
            </div>
          )}
          <div className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.05em] text-muted-foreground">
            {empty
              ? 'Tidak ada deteksi'
              : `${formatDecimal(summary.frpTotal / summary.total)} MW per titik`}
          </div>
        </div>

        <div className="min-h-[82px] border-b border-r border-rule p-2.5">
          <div className="micro-label text-muted-foreground">Keyakinan tinggi</div>
          {loading ? (
            <ValueSkeleton />
          ) : (
            <div className="mt-1.5 font-sans text-[29px] font-semibold leading-none tracking-[-0.03em] text-ink">
              {formatNumber(summary.high)}
            </div>
          )}
          <div className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.05em] text-muted-foreground">
            {summary.total > 0
              ? `${Math.round((summary.high / summary.total) * 100)}% dari total`
              : 'Kategori piksel panas'}
          </div>
        </div>

        <div className="min-h-[82px] border-b border-r border-rule p-2.5">
          <div className="micro-label text-muted-foreground">Provinsi utama</div>
          {loading ? (
            <ValueSkeleton wide />
          ) : summary.topProvince ? (
            <div className="mt-1 line-clamp-2 font-sans text-[13px] font-semibold leading-[1.15] tracking-[-0.01em] text-ink">
              {summary.topProvince.name}
            </div>
          ) : (
            <div className="mt-1 text-[13px] text-muted-foreground">—</div>
          )}
          <div className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.05em] text-muted-foreground">
            {summary.topProvince ? `${formatNumber(summary.topProvince.count)} titik terdeteksi` : 'Belum teridentifikasi'}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
        <span>{provinceScope ? `Wilayah · ${provinceScope}` : 'Seluruh Indonesia'}</span>
        <span className="text-right">
          {latestAcq ? `Terbaru ${formatWIBTime(latestAcq)} · ${formatRelative(latestAcq)}` : 'Menunggu data'}
        </span>
      </div>
    </div>
  )
}
