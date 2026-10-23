import { useState } from 'react'
import { FieldNotesPanel, HighlightsPanel } from '@/components/highlights-panel'
import { HotspotDetail } from '@/components/hotspot-detail'
import { RailPager } from '@/components/rail-pager'
import type { Hotspot } from '@/types'
import { cn } from '@/lib/utils'

interface RightRailProps {
  selected: Hotspot | null
  strongest: Hotspot[]
  total: number
  nearbyCount: number
  loading: boolean
  latestAcq: number | null
  fetchedAt: number | null
  truncated: boolean
  provinceScope: string | null
  windowLabel: string
  onSelect: (hotspot: Hotspot) => void
  onClearSelection: () => void
  onOpenLog: () => void
  onOpenMethodology: () => void
  onFocusMap: () => void
}

export function RightRail({
  selected,
  strongest,
  total,
  nearbyCount,
  loading,
  latestAcq,
  fetchedAt,
  truncated,
  provinceScope,
  windowLabel,
  onSelect,
  onClearSelection,
  onOpenLog,
  onOpenMethodology,
  onFocusMap,
}: RightRailProps) {
  const [page, setPage] = useState(0)
  const [direction, setDirection] = useState(1)

  function goTo(target: number) {
    if (target === page) return
    setDirection(target > page ? 1 : -1)
    setPage(target)
  }

  return (
    <aside className="hidden min-h-0 flex-col overflow-hidden border-l border-rule bg-paper min-[1280px]:flex">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-rule bg-paper-raised px-4">
        <span className="micro-label text-ink-soft">
          {selected ? 'Lembar deteksi' : page === 0 ? 'Lembar sorotan' : 'Lembar catatan'}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="h-1.5 w-1.5 bg-ember" />
          {selected ? `Objek ${selected.id}` : page === 0 ? 'Editorial' : 'Batas data'}
        </span>
      </div>

      {selected ? (
        <div className="rail-body min-h-0 flex-1">
          <HotspotDetail
            hotspot={selected}
            nearbyCount={nearbyCount}
            onClose={onClearSelection}
            onShowOnMap={onFocusMap}
          />
        </div>
      ) : (
        <>
          <div
            key={`${page}-${direction}`}
            className={cn(
              'rail-body min-h-0 flex-1',
              direction > 0 ? 'rail-sheet-next' : 'rail-sheet-prev',
            )}
          >
            {page === 0 ? (
              <HighlightsPanel
                hotspots={strongest}
                total={total}
                loading={loading}
                truncated={truncated}
                provinceScope={provinceScope}
                windowLabel={windowLabel}
                onSelect={onSelect}
                onOpenLog={onOpenLog}
              />
            ) : (
              <FieldNotesPanel
                fetchedAt={fetchedAt}
                latestAcq={latestAcq}
                onOpenMethodology={onOpenMethodology}
              />
            )}
          </div>
          <RailPager
            page={page}
            total={2}
            label={page === 0 ? 'Sorotan' : 'Catatan & sumber'}
            onPrev={() => goTo(page - 1)}
            onNext={() => goTo(page + 1)}
          />
        </>
      )}
    </aside>
  )
}
