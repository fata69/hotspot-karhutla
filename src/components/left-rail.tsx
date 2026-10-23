import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { FilterPanel } from '@/components/filter-panel'
import { PeriodPicker } from '@/components/period-picker'
import { ProvinceList } from '@/components/province-list'
import { RailPager } from '@/components/rail-pager'
import { Section } from '@/components/section'
import { SummaryGrid } from '@/components/summary-grid'
import { TrendChart } from '@/components/trend-chart'
import { formatNumber } from '@/lib/format'
import type { ProvinceStats, SummaryStats, TrendData } from '@/lib/stats'
import type { Confidence, HotspotFilters, SatelliteCode, TimeWindow } from '@/types'
import { cn } from '@/lib/utils'

const PROVINCE_PAGE_SIZE = 12
const LEADING_PAGES = 2

interface LeftRailProps {
  filters: HotspotFilters
  summary: SummaryStats
  trend: TrendData
  provinceStats: ProvinceStats[]
  activeProvince: string | null
  loading: boolean
  latestAcq: number | null
  truncated: boolean
  isDefaultFilters: boolean
  error?: string | null
  onRetry?: () => void
  className?: string
  onWindowChange: (value: TimeWindow) => void
  onMinFrpChange: (value: number) => void
  onToggleConfidence: (value: Confidence) => void
  onToggleSatellite: (value: SatelliteCode) => void
  onResetFilters: () => void
  onProvinceSelect: (province: string | null) => void
}

export function LeftRail({
  filters,
  summary,
  trend,
  provinceStats,
  activeProvince,
  loading,
  latestAcq,
  truncated,
  isDefaultFilters,
  error,
  onRetry,
  className,
  onWindowChange,
  onMinFrpChange,
  onToggleConfidence,
  onToggleSatellite,
  onResetFilters,
  onProvinceSelect,
}: LeftRailProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  const provincePages = Math.max(1, Math.ceil(provinceStats.length / PROVINCE_PAGE_SIZE))
  const totalPages = LEADING_PAGES + provincePages
  const page = Math.min(pageIndex, totalPages - 1)
  const provincePage = Math.max(0, page - LEADING_PAGES)
  const isProvincePage = page >= LEADING_PAGES

  useEffect(() => {
    setPageIndex((current) => Math.min(current, totalPages - 1))
  }, [totalPages])

  function goTo(target: number) {
    if (target === page || target < 0 || target >= totalPages) return
    setDirection(target > page ? 1 : -1)
    setPageIndex(target)
  }

  const pageLabel = isProvincePage
    ? `Wilayah · ${provincePage + 1}/${provincePages}`
    : page === 0
      ? 'Pantau'
      : 'Saring'

  return (
    <aside
      className={cn(
        'flex min-h-0 flex-col overflow-hidden border-r border-rule bg-paper',
        className,
      )}
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-rule bg-paper-raised px-4">
        <span className="micro-label text-ink-soft">Lembar pantau</span>
        <span className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="h-1.5 w-1.5 bg-ember" />
          NRT · VIIRS
        </span>
      </div>

      {error ? (
        <div className="flex shrink-0 gap-2 border-b border-ember/40 bg-ember/[0.07] px-4 py-2.5">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-ember" />
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] leading-relaxed text-ink-soft">{error}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em] text-ember transition-colors hover:text-ink"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Coba lagi
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        key={`${page}-${direction}`}
        className={cn(
          'rail-body min-h-0 flex-1',
          direction > 0 ? 'rail-sheet-next' : 'rail-sheet-prev',
        )}
      >
        {page === 0 ? (
          <>
            <Section
              index="01"
              title="Periode"
              aside={filters.windowHours === 168 ? '7 hari' : `${filters.windowHours} jam`}
            >
              <PeriodPicker value={filters.windowHours} onChange={onWindowChange} />
              <p className="mt-2 font-mono text-[8px] uppercase leading-relaxed tracking-[0.05em] text-muted-foreground">
                Jendela deteksi berdasarkan jam sejak akuisisi satelit.
              </p>
            </Section>

            <Section index="02" title="Ringkasan" aside={activeProvince ?? 'Indonesia'} className="border-b-0">
              <SummaryGrid
                summary={summary}
                loading={loading}
                latestAcq={latestAcq}
                provinceScope={activeProvince}
              />
              {truncated ? (
                <div className="mt-3 flex gap-2 border border-ochre/60 bg-ochre/[0.06] px-2.5 py-2">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-ochre" />
                  <p className="text-[9.5px] leading-relaxed text-ink-soft">
                    Volume tinggi: peta dan tabel memuat 32.000 titik terkuat saja. Persempit periode
                    atau naikkan ambang FRP untuk cakupan penuh.
                  </p>
                </div>
              ) : null}
            </Section>
          </>
        ) : null}

        {page === 1 ? (
          <>
            <Section
              index="03"
              title="Filter"
              aside={loading ? 'memuat' : `${formatNumber(summary.total)} tampil`}
            >
              <FilterPanel
                minFrp={filters.minFrp}
                confidences={filters.confidences}
                satellites={filters.satellites}
                onMinFrpChange={onMinFrpChange}
                onToggleConfidence={onToggleConfidence}
                onToggleSatellite={onToggleSatellite}
                onReset={onResetFilters}
                isDefault={isDefaultFilters}
              />
            </Section>

            <Section index="04" title="Pola deteksi" aside="WIB" className="border-b-0">
              <TrendChart trend={trend} loading={loading} />
            </Section>
          </>
        ) : null}

        {isProvincePage ? (
          <Section
            index="05"
            title="Provinsi"
            aside={`${provinceStats.length} terdampak`}
            className="border-b-0"
          >
            <ProvinceList
              stats={provinceStats}
              activeProvince={activeProvince}
              onSelect={onProvinceSelect}
              loading={loading}
              page={provincePage}
              pageSize={PROVINCE_PAGE_SIZE}
            />
          </Section>
        ) : null}
      </div>

      <RailPager
        page={page}
        total={totalPages}
        label={pageLabel}
        onPrev={() => goTo(page - 1)}
        onNext={() => goTo(page + 1)}
      />
    </aside>
  )
}
