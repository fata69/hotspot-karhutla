import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/header'
import { FieldNotesPanel, HighlightsPanel } from '@/components/highlights-panel'
import { HotspotDetail } from '@/components/hotspot-detail'
import { LeftRail } from '@/components/left-rail'
import { LogSheet } from '@/components/log-sheet'
import { MapPane } from '@/components/map-pane'
import { MethodologyDialog } from '@/components/methodology-dialog'
import { RightRail } from '@/components/right-rail'
import { StatusBar } from '@/components/status-bar'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { fetchHotspots } from '@/lib/firms'
import {
  computeProvinceStats,
  computeSummary,
  computeTrend,
  countNearby,
  pickStrongest,
} from '@/lib/stats'
import { useMediaQuery } from '@/lib/use-media-query'
import {
  TIME_WINDOWS,
  type Confidence,
  type Hotspot,
  type HotspotFilters,
  type SatelliteCode,
  type TimeWindow,
} from '@/types'

const DEFAULT_FILTERS: HotspotFilters = {
  windowHours: 24,
  confidences: ['high', 'nominal'],
  satellites: ['N20', 'N21', 'N'],
  minFrp: 10,
}

const EMPTY_HOTSPOTS: Hotspot[] = []

function sameMembers<T>(left: T[], right: T[]): boolean {
  if (left.length !== right.length) return false
  return left.every((value) => right.includes(value))
}

function toggleMember<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function readError(error: unknown): string | null {
  if (!error) return null
  if (error instanceof Error && /FIRMS/i.test(error.message)) return error.message
  return 'Tidak dapat menghubungi layanan data NASA. Periksa koneksi lalu coba lagi.'
}

export default function App() {
  const [filters, setFilters] = useState<HotspotFilters>(DEFAULT_FILTERS)
  const [activeProvince, setActiveProvince] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const [highlightsOpen, setHighlightsOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [focusSignal, setFocusSignal] = useState(0)
  const isWide = useMediaQuery('(min-width: 1280px)')

  const query = useQuery({
    queryKey: [
      'hotspots',
      filters.windowHours,
      filters.minFrp,
      [...filters.confidences].sort().join(','),
      [...filters.satellites].sort().join(','),
    ],
    queryFn: ({ signal }) => fetchHotspots(filters, signal),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchInterval: 15 * 60_000,
    placeholderData: (previousData) => previousData,
  })

  // Do not present a previous filter's data as if it belongs to a failed new query.
  const data = query.isError && query.isPlaceholderData ? undefined : query.data
  const hotspots = data?.hotspots ?? EMPTY_HOTSPOTS
  const errorMessage = readError(query.error)

  const scopedHotspots = useMemo(
    () =>
      activeProvince
        ? hotspots.filter((hotspot) => hotspot.province === activeProvince)
        : hotspots,
    [hotspots, activeProvince],
  )

  const summary = useMemo(() => computeSummary(scopedHotspots), [scopedHotspots])
  const provinceStats = useMemo(() => computeProvinceStats(hotspots), [hotspots])
  const trend = useMemo(
    () => computeTrend(scopedHotspots, filters.windowHours, data?.fetchedAt ?? Date.now()),
    [scopedHotspots, filters.windowHours, data?.fetchedAt],
  )
  const strongest = useMemo(() => pickStrongest(scopedHotspots, 5), [scopedHotspots])
  const selected = useMemo(
    () => (selectedId === null ? null : scopedHotspots.find((hotspot) => hotspot.id === selectedId) ?? null),
    [scopedHotspots, selectedId],
  )
  const nearbyCount = useMemo(
    () => (selected ? countNearby(scopedHotspots, selected) : 0),
    [scopedHotspots, selected],
  )

  const windowLabel =
    TIME_WINDOWS.find((item) => item.value === filters.windowHours)?.label ??
    `${filters.windowHours} jam terakhir`

  const isDefaultFilters =
    filters.windowHours === DEFAULT_FILTERS.windowHours &&
    filters.minFrp === DEFAULT_FILTERS.minFrp &&
    sameMembers(filters.confidences, DEFAULT_FILTERS.confidences) &&
    sameMembers(filters.satellites, DEFAULT_FILTERS.satellites)

  useEffect(() => {
    if (!isWide) return
    setHighlightsOpen(false)
    setDetailOpen(false)
  }, [isWide])

  useEffect(() => {
    if (selected || !detailOpen) return
    setDetailOpen(false)
  }, [selected, detailOpen])

  useEffect(() => {
    if (selectedId === null || query.isFetching) return
    if (!scopedHotspots.some((hotspot) => hotspot.id === selectedId)) {
      setSelectedId(null)
    }
  }, [scopedHotspots, selectedId, query.isFetching])

  function handleSelect(hotspot: Hotspot) {
    setSelectedId(hotspot.id)
    setHighlightsOpen(false)
    setLogOpen(false)
    if (!isWide) setDetailOpen(true)
  }

  function setProvinceScope(province: string | null) {
    setActiveProvince(province)
    setSelectedId(null)
  }

  function toggleProvince(province: string) {
    setProvinceScope(activeProvince === province ? null : province)
  }

  function handleShowOnMap() {
    setFocusSignal((value) => value + 1)
    setDetailOpen(false)
  }

  function handleClearSelection() {
    setSelectedId(null)
    setDetailOpen(false)
  }

  function handleWindowChange(value: TimeWindow) {
    setFilters((previous) => ({ ...previous, windowHours: value }))
  }

  function handleMinFrpChange(value: number) {
    setFilters((previous) => ({ ...previous, minFrp: value }))
  }

  function handleToggleConfidence(value: Confidence) {
    setFilters((previous) => ({
      ...previous,
      confidences: toggleMember(previous.confidences, value),
    }))
  }

  function handleToggleSatellite(value: SatelliteCode) {
    setFilters((previous) => ({
      ...previous,
      satellites: toggleMember(previous.satellites, value),
    }))
  }

  function handleResetFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <TooltipProvider delayDuration={220}>
      <div className="flex min-h-svh flex-col bg-paper lg:h-svh lg:overflow-hidden">
        <Header
          count={scopedHotspots.length}
          latestAcq={data?.latestAcq ?? null}
          fetchedAt={data?.fetchedAt ?? null}
          loading={query.isFetching}
          onRefresh={() => {
            void query.refetch()
          }}
          onOpenLog={() => setLogOpen(true)}
          onOpenMethodology={() => setMethodologyOpen(true)}
          onOpenHighlights={() => setHighlightsOpen(true)}
        />

        <div className="flex flex-1 flex-col lg:min-h-0 lg:grid min-[1024px]:grid-cols-[264px_minmax(0,1fr)] min-[1280px]:grid-cols-[264px_minmax(0,1fr)_288px] min-[1440px]:grid-cols-[280px_minmax(0,1fr)_300px]">
          <LeftRail
            filters={filters}
            summary={summary}
            trend={trend}
            provinceStats={provinceStats}
            activeProvince={activeProvince}
            loading={query.isPending}
            latestAcq={data?.latestAcq ?? null}
            truncated={data?.truncated ?? false}
            isDefaultFilters={isDefaultFilters}
            error={errorMessage}
            onRetry={() => {
              void query.refetch()
            }}
            className="order-2 border-r-0 lg:order-none lg:border-r"
            onWindowChange={handleWindowChange}
            onMinFrpChange={handleMinFrpChange}
            onToggleConfidence={handleToggleConfidence}
            onToggleSatellite={handleToggleSatellite}
            onResetFilters={handleResetFilters}
            onProvinceSelect={setProvinceScope}
          />

          <main className="relative order-1 h-[calc(100svh-4rem)] min-h-[420px] lg:order-none lg:h-auto lg:min-h-0">
            <MapPane
              hotspots={scopedHotspots}
              selected={selected}
              activeProvince={activeProvince}
              loading={query.isFetching}
              error={errorMessage}
              focusSignal={focusSignal}
              onSelect={handleSelect}
              onProvinceClick={toggleProvince}
              onClearSelection={handleClearSelection}
              onRetry={() => {
                void query.refetch()
              }}
            />
          </main>

          <RightRail
            selected={selected}
            strongest={strongest}
            total={scopedHotspots.length}
            nearbyCount={nearbyCount}
            loading={query.isPending}
            latestAcq={data?.latestAcq ?? null}
            fetchedAt={data?.fetchedAt ?? null}
            truncated={data?.truncated ?? false}
            provinceScope={activeProvince}
            windowLabel={windowLabel}
            onSelect={handleSelect}
            onClearSelection={handleClearSelection}
            onOpenLog={() => setLogOpen(true)}
            onOpenMethodology={() => setMethodologyOpen(true)}
            onFocusMap={handleShowOnMap}
          />
        </div>

        <StatusBar />

        <LogSheet
          open={logOpen}
          onOpenChange={setLogOpen}
          hotspots={scopedHotspots}
          filters={filters}
          provinceScope={activeProvince}
          truncated={data?.truncated ?? false}
          loading={query.isFetching}
          onSelect={handleSelect}
          onClearProvince={() => setProvinceScope(null)}
        />

        <MethodologyDialog open={methodologyOpen} onOpenChange={setMethodologyOpen} />

        <Sheet open={highlightsOpen} onOpenChange={setHighlightsOpen}>
          <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[430px]">
            <div className="flex h-12 shrink-0 items-center border-b border-rule bg-paper-raised px-4">
              <SheetTitle className="micro-label text-muted-foreground">
                Sorotan & sumber
              </SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              Titik panas dengan FRP tertinggi, catatan lapangan, dan status sumber data.
            </SheetDescription>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <HighlightsPanel
                hotspots={strongest}
                total={scopedHotspots.length}
                loading={query.isPending}
                truncated={data?.truncated ?? false}
                provinceScope={activeProvince}
                windowLabel={windowLabel}
                onSelect={handleSelect}
                onOpenLog={() => {
                  setHighlightsOpen(false)
                  setLogOpen(true)
                }}
              />
              <FieldNotesPanel
                fetchedAt={data?.fetchedAt ?? null}
                latestAcq={data?.latestAcq ?? null}
                onOpenMethodology={() => {
                  setHighlightsOpen(false)
                  setMethodologyOpen(true)
                }}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
          <SheetContent
            side="bottom"
            hideClose
            className="max-h-[90svh] overflow-y-auto border-t-2 border-ember p-0"
          >
            <SheetTitle className="sr-only">
              {selected ? `Lembar deteksi ${selected.province}` : 'Lembar deteksi'}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Rincian titik panas terpilih, termasuk intensitas FRP, waktu akuisisi, dan posisi.
            </SheetDescription>
            <div className="mx-auto w-full max-w-xl">
              {selected ? (
                <HotspotDetail
                  hotspot={selected}
                  nearbyCount={nearbyCount}
                  onClose={() => setDetailOpen(false)}
                  onShowOnMap={handleShowOnMap}
                />
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
