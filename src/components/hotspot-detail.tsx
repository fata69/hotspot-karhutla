import { useEffect, useState } from 'react'
import { Check, Copy, Crosshair, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfidenceMark } from '@/components/confidence-mark'
import {
  dayNightLabel,
  formatCoordinates,
  formatCoordinatesCompact,
  formatDecimal,
  formatWIBDate,
  formatWIBTime,
  frpBand,
  satelliteLabels,
} from '@/lib/format'
import type { Hotspot } from '@/types'
import { cn } from '@/lib/utils'

interface HotspotDetailProps {
  hotspot: Hotspot
  nearbyCount: number
  onClose?: () => void
  onShowOnMap?: () => void
}

const toneClass: Record<string, string> = {
  extreme: 'bg-ember text-paper',
  high: 'bg-ember-soft text-ink',
  medium: 'bg-ochre text-paper',
  low: 'bg-olive text-paper',
}

export function HotspotDetail({ hotspot, nearbyCount, onClose, onShowOnMap }: HotspotDetailProps) {
  const [copied, setCopied] = useState(false)
  const band = frpBand(hotspot.frp)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyCoordinates() {
    try {
      await navigator.clipboard.writeText(formatCoordinatesCompact(hotspot.lat, hotspot.lon))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="pb-8">
      <div className="border-b border-rule px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="micro-label text-ember">Lembar deteksi</div>
            <h2 className="mt-1 truncate font-display text-[27px] leading-none tracking-[-0.01em] text-ink">
              {hotspot.province}
            </h2>
            <p className="mt-1.5 font-mono text-[8.5px] uppercase tracking-[0.05em] text-muted-foreground">
              {formatCoordinates(hotspot.lat, hotspot.lon)}
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup lembar deteksi"
              className="-mr-1 shrink-0 border border-rule p-1.5 text-ink-soft transition-colors hover:border-ink hover:bg-ink hover:text-paper"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-rule pt-3">
          <div>
            <div className="micro-label text-muted-foreground">Fire radiative power</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-[46px] leading-[0.85] tracking-[-0.02em] text-ink">
                {formatDecimal(hotspot.frp)}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">MW</span>
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em]',
              toneClass[band.tone],
            )}
          >
            {band.label}
          </span>
        </div>
      </div>

      <div className="border-b border-rule px-4 py-3">
        <p className="text-[11px] leading-relaxed text-ink-soft">{band.description}</p>
      </div>

      <dl className="grid grid-cols-2 border-b border-rule">
        <div className="border-b border-r border-rule px-4 py-2.5">
          <dt className="micro-label text-muted-foreground">Akuisisi</dt>
          <dd className="mt-1 text-[11px] font-medium leading-tight text-ink">{formatWIBDate(hotspot.acqTime)}</dd>
          <dd className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.04em] text-muted-foreground">
            {formatWIBTime(hotspot.acqTime)}
          </dd>
        </div>
        <div className="border-b border-rule px-4 py-2.5">
          <dt className="micro-label text-muted-foreground">Satelit</dt>
          <dd className="mt-1 text-[11px] font-medium leading-tight text-ink">
            {satelliteLabels[hotspot.satellite]}
          </dd>
          <dd className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.04em] text-muted-foreground">
            VIIRS 375 m
          </dd>
        </div>
        <div className="border-r border-rule px-4 py-2.5">
          <dt className="micro-label text-muted-foreground">Keyakinan</dt>
          <dd className="mt-1 text-[11px] font-medium leading-tight text-ink">
            <ConfidenceMark confidence={hotspot.confidence} />
          </dd>
          <dd className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.04em] text-muted-foreground">
            {dayNightLabel(hotspot.daynight)} · {hotspot.version}
          </dd>
        </div>
        <div className="px-4 py-2.5">
          <dt className="micro-label text-muted-foreground">Sekitar 5 km</dt>
          <dd className="mt-1 text-[11px] font-medium leading-tight text-ink">
            {nearbyCount > 0 ? `${nearbyCount + 1} titik` : 'Titik tunggal'}
          </dd>
          <dd className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.04em] text-muted-foreground">
            Pada filter aktif
          </dd>
        </div>
      </dl>

      <div className="border-b border-rule px-4 py-3">
        <div className="micro-label mb-1.5 text-muted-foreground">Pembacaan piksel</div>
        <dl className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[10.5px] text-muted-foreground">Kecerahan T4 (4 µm)</dt>
            <dd className="font-mono text-[10px] tabular-nums text-ink">
              {hotspot.brightTi4 !== null ? `${formatDecimal(hotspot.brightTi4, 1)} K` : '—'}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[10.5px] text-muted-foreground">Kecerahan T5 (11 µm)</dt>
            <dd className="font-mono text-[10px] tabular-nums text-ink">
              {hotspot.brightTi5 !== null ? `${formatDecimal(hotspot.brightTi5, 1)} K` : '—'}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[10.5px] text-muted-foreground">Ukuran scan × track</dt>
            <dd className="font-mono text-[10px] tabular-nums text-ink">
              {hotspot.scan !== null && hotspot.track !== null
                ? `${formatDecimal(hotspot.scan, 2)} × ${formatDecimal(hotspot.track, 2)} km`
                : '—'}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[10.5px] text-muted-foreground">Usia data</dt>
            <dd className="font-mono text-[10px] tabular-nums text-ink">
              {hotspot.hoursOld !== null ? `${formatDecimal(hotspot.hoursOld, 1)} jam` : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pt-4">
        {onShowOnMap ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-center font-mono text-[8.5px] uppercase tracking-[0.08em]"
            onClick={onShowOnMap}
          >
            <Crosshair className="h-3 w-3" />
            Lihat di peta
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 justify-center font-mono text-[8.5px] uppercase tracking-[0.08em]"
          onClick={copyCoordinates}
        >
          {copied ? <Check className="h-3 w-3 text-olive" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Koordinat tersalin' : 'Salin koordinat'}
        </Button>
      </div>

      <div className="mx-4 mt-4 border-l-2 border-ember pl-2.5">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Satu piksel panas dapat berasal dari kebakaran lahan, sumber industri, atau anomali
          permukaan. Gunakan citra resolusi tinggi dan laporan lapangan sebelum mengambil tindakan.
        </p>
      </div>
    </div>
  )
}
