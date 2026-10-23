import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfidenceMark } from '@/components/confidence-mark'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { downloadCsv } from '@/lib/csv'
import {
  formatCoordinates,
  formatDecimal,
  formatNumber,
  formatWibDayKeyShort,
  formatWIBDate,
  formatWIBTime,
  satelliteShort,
} from '@/lib/format'
import type { Hotspot, HotspotFilters } from '@/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 100

type SortKey = 'acqTime' | 'frp' | 'province' | 'confidence'
type SortDirection = 'asc' | 'desc'

interface LogSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hotspots: Hotspot[]
  filters: HotspotFilters
  selectedDay: string | null
  windowLabel: string
  provinceScope: string | null
  truncated: boolean
  loading: boolean
  onSelect: (hotspot: Hotspot) => void
  onClearProvince: () => void
}

const confidenceRank = { high: 3, nominal: 2, low: 1 } as const

function SortHeader({
  label,
  active,
  direction,
  numeric,
  onClick,
}: {
  label: string
  active: boolean
  direction: SortDirection
  numeric?: boolean
  onClick: () => void
}) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-rule px-2 py-2 text-left font-mono text-[7.5px] font-medium uppercase tracking-[0.08em]',
        active ? 'text-ink' : 'text-muted-foreground',
        numeric && 'text-right',
      )}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-[0.08em] transition-colors hover:text-ember',
          numeric && 'flex-row-reverse',
        )}
      >
        {label}
        {active ? (
          direction === 'asc' ? (
            <ArrowUp className="h-2.5 w-2.5" />
          ) : (
            <ArrowDown className="h-2.5 w-2.5" />
          )
        ) : (
          <span className="h-2.5 w-2.5" />
        )}
      </button>
    </th>
  )
}

export function LogSheet({
  open,
  onOpenChange,
  hotspots,
  filters,
  selectedDay,
  windowLabel,
  provinceScope,
  truncated,
  loading,
  onSelect,
  onClearProvince,
}: LogSheetProps) {
  const [sortKey, setSortKey] = useState<SortKey>('acqTime')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [hotspots, search, sortKey, sortDirection, provinceScope])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setPage(0)
    }
  }, [open])

  const sorted = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const list = needle
      ? hotspots.filter((hotspot) => hotspot.province.toLowerCase().includes(needle))
      : hotspots

    return [...list].sort((a, b) => {
      let result = 0
      if (sortKey === 'acqTime') result = a.acqTime - b.acqTime
      else if (sortKey === 'frp') result = a.frp - b.frp
      else if (sortKey === 'confidence')
        result = confidenceRank[a.confidence] - confidenceRank[b.confidence]
      else result = a.province.localeCompare(b.province, 'id')

      if (result === 0) result = a.acqTime - b.acqTime
      return sortDirection === 'asc' ? result : -result
    })
  }, [hotspots, search, sortKey, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const rows = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const rangeStart = sorted.length === 0 ? 0 : safePage * PAGE_SIZE + 1
  const rangeEnd = Math.min(sorted.length, (safePage + 1) * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection(key === 'province' ? 'asc' : 'desc')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[880px]">
        <div className="shrink-0 border-b-2 border-ink px-4 pb-3 pr-14 pt-4">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-ember" />
            <span className="micro-label text-ember">Arsip terbuka</span>
            <span className="ml-auto flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
              {loading ? <LoaderCircle className="h-2.5 w-2.5 animate-spin" /> : null}
              {loading ? 'Menyinkronkan' : `${formatNumber(hotspots.length)} baris`}
            </span>
          </div>
          <SheetTitle className="mt-1 font-display text-[32px] font-normal leading-none tracking-[-0.01em] text-ink">
            Log deteksi
          </SheetTitle>
          <SheetDescription className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
            {windowLabel} · {provinceScope ?? 'Indonesia'} · diurutkan dari subset titik terkuat.
            {truncated ? ' Volume melebihi kapasitas muat; baris di bawah adalah subset.' : ''}
          </SheetDescription>
        </div>

        <div className="shrink-0 border-b border-rule bg-paper-raised px-4 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center border border-rule bg-paper px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.06em] text-ink-soft">
              {selectedDay
                ? `${formatWibDayKeyShort(selectedDay)} · WIB`
                : filters.windowHours === 168
                  ? '7 hari'
                  : `${filters.windowHours} jam`}
            </span>
            <span className="inline-flex items-center border border-rule bg-paper px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.06em] text-ink-soft">
              FRP ≥ {filters.minFrp} MW
            </span>
            <span className="hidden items-center border border-rule bg-paper px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.06em] text-ink-soft sm:inline-flex">
              {filters.confidences.length === 3
                ? 'Semua keyakinan'
                : filters.confidences.length === 0
                  ? 'Tanpa keyakinan'
                  : filters.confidences
                      .map((value) => (value === 'high' ? 'Tinggi' : value === 'nominal' ? 'Nominal' : 'Rendah'))
                      .join(' + ')}
            </span>
            <span className="hidden items-center border border-rule bg-paper px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.06em] text-ink-soft md:inline-flex">
              {filters.satellites.length === 3 ? '3 satelit' : filters.satellites.join(' · ')}
            </span>
            {provinceScope ? (
              <button
                type="button"
                onClick={onClearProvince}
                className="inline-flex items-center gap-1 border border-ink bg-sand px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.06em] text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                {provinceScope}
                <X className="h-2.5 w-2.5" />
              </button>
            ) : null}

            <div className="ml-auto flex w-full items-center gap-1.5 sm:w-auto">
              <div className="relative flex-1 sm:w-40 sm:flex-none">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari provinsi…"
                  aria-label="Cari provinsi pada log"
                  className="h-7 border-rule bg-paper pl-7 text-[11px]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 font-mono text-[8px] uppercase tracking-[0.08em]"
                onClick={() => downloadCsv(hotspots)}
                disabled={hotspots.length === 0}
              >
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <p className="font-display text-[26px] italic leading-tight text-ink">
                {loading ? 'Menarik baris deteksi.' : 'Tidak ada baris.'}
              </p>
              <p className="mt-1.5 max-w-[280px] text-[11px] leading-relaxed text-muted-foreground">
                {search.trim()
                  ? 'Pencarian provinsi tidak cocok dengan filter aktif.'
                  : selectedDay
                    ? 'Coba tanggal lain, longgarkan filter, atau kembali ke periode aktif.'
                    : 'Longgarkan filter atau periode untuk melihat lebih banyak deteksi.'}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[740px] border-collapse text-left">
              <thead className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-paper-raised">
                <tr>
                  <th className="w-10 border-b border-rule px-2 py-2 text-left font-mono text-[7.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    No
                  </th>
                  <SortHeader
                    label="Waktu WIB"
                    active={sortKey === 'acqTime'}
                    direction={sortDirection}
                    onClick={() => toggleSort('acqTime')}
                  />
                  <SortHeader
                    label="Provinsi"
                    active={sortKey === 'province'}
                    direction={sortDirection}
                    onClick={() => toggleSort('province')}
                  />
                  <th className="border-b border-rule px-2 py-2 text-left font-mono text-[7.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Posisi
                  </th>
                  <SortHeader
                    label="Keyakinan"
                    active={sortKey === 'confidence'}
                    direction={sortDirection}
                    onClick={() => toggleSort('confidence')}
                  />
                  <th className="border-b border-rule px-2 py-2 text-left font-mono text-[7.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Satelit
                  </th>
                  <SortHeader
                    label="FRP"
                    active={sortKey === 'frp'}
                    direction={sortDirection}
                    numeric
                    onClick={() => toggleSort('frp')}
                  />
                </tr>
              </thead>
              <tbody>
                {rows.map((hotspot, index) => (
                  <tr
                    key={hotspot.id}
                    tabIndex={0}
                    onClick={() => {
                      onSelect(hotspot)
                      onOpenChange(false)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelect(hotspot)
                        onOpenChange(false)
                      }
                    }}
                    className="cursor-pointer border-b border-rule/60 align-middle transition-colors hover:bg-sand/60 focus:bg-sand focus:outline-none"
                  >
                    <td className="px-2 py-2 font-mono text-[8px] tabular-nums text-muted-foreground/70">
                      {String(rangeStart + index).padStart(3, '0')}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <span className="block text-[10.5px] font-medium leading-tight text-ink">
                        {formatWIBDate(hotspot.acqTime)}
                      </span>
                      <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.04em] text-muted-foreground">
                        {formatWIBTime(hotspot.acqTime)}
                      </span>
                    </td>
                    <td className="max-w-[160px] truncate px-2 py-2 text-[10.5px] leading-tight text-ink-soft">
                      {hotspot.province}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-[8.5px] tabular-nums text-muted-foreground">
                      {formatCoordinates(hotspot.lat, hotspot.lon)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <ConfidenceMark confidence={hotspot.confidence} className="text-[8px]" />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-[8.5px] uppercase tracking-[0.04em] text-ink-soft">
                      {satelliteShort[hotspot.satellite]}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      <span className="font-mono text-[11px] font-medium tabular-nums text-ink">
                        {formatDecimal(hotspot.frp)}
                      </span>
                      <span className="ml-1 font-mono text-[7px] uppercase text-muted-foreground">MW</span>
                      <span className="ml-3 hidden font-mono text-[7.5px] uppercase tracking-[0.04em] text-muted-foreground sm:inline">
                        {hotspot.daynight === 'D' ? 'Siang' : 'Malam'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-rule bg-paper-raised px-4 py-2">
          <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground">
            {formatNumber(rangeStart)}–{formatNumber(rangeEnd)} dari {formatNumber(sorted.length)}
            {search.trim() ? ' hasil' : ''}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage <= 0}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="min-w-[72px] text-center font-mono text-[8px] uppercase tracking-[0.06em] text-ink-soft">
              Hal. {safePage + 1}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage >= totalPages - 1}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
