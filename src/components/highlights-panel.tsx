import { ArrowUpRight, BookOpen, LoaderCircle, Table2 } from 'lucide-react'
import { ConfidenceMark } from '@/components/confidence-mark'
import { Button } from '@/components/ui/button'
import {
  formatCoordinatesCompact,
  formatDecimal,
  formatNumber,
  formatRelative,
  formatWIBDate,
  formatWIBTime,
  satelliteShort,
} from '@/lib/format'
import type { Hotspot } from '@/types'

interface HighlightsPanelProps {
  hotspots: Hotspot[]
  total: number
  onSelect: (hotspot: Hotspot) => void
  onOpenLog: () => void
  loading: boolean
  truncated: boolean
  provinceScope: string | null
  windowLabel: string
}

export function HighlightsPanel({
  hotspots,
  total,
  onSelect,
  onOpenLog,
  loading,
  truncated,
  provinceScope,
  windowLabel,
}: HighlightsPanelProps) {
  const maxFrp = hotspots.reduce((max, hotspot) => Math.max(max, hotspot.frp), 0) || 1
  const provinceFrequency = new Map<string, number>()
  for (const hotspot of hotspots) {
    provinceFrequency.set(hotspot.province, (provinceFrequency.get(hotspot.province) ?? 0) + 1)
  }
  const repeatedProvinces = new Set(
    [...provinceFrequency.entries()]
      .filter(([, count]) => count > 1)
      .map(([name]) => name),
  )

  return (
    <div className="pb-5">
      <div className="border-b border-rule px-4 py-4">
        <div className="flex items-end justify-between gap-2">
          <div className="shrink-0">
            <div className="micro-label text-ember">Sorotan</div>
            <h2 className="mt-1 whitespace-nowrap font-display text-[27px] leading-none tracking-[-0.01em] text-ink">
              Titik terkuat
            </h2>
          </div>
          <span className="pb-0.5 text-right font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
            {windowLabel} · {provinceScope ?? 'Indonesia'}
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Deteksi dengan FRP tertinggi pada filter aktif. Pilih satu titik untuk membaca lembar
          deteksi.
        </p>
      </div>

      <div className="px-4">
        {loading && hotspots.length === 0 ? (
          <div className="flex items-center gap-2 border-b border-rule py-5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
            <LoaderCircle className="h-3 w-3 animate-spin" />
            Menyusun sorotan
          </div>
        ) : hotspots.length === 0 ? (
          <div className="border-b border-rule py-6">
            <p className="font-display text-[20px] italic leading-tight text-ink-soft">Tidak ada titik.</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
              Filter saat ini tidak mengembalikan deteksi. Longgarkan periode atau ambang intensitas.
            </p>
          </div>
        ) : (
          <div>
            {hotspots.map((hotspot, index) => (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => onSelect(hotspot)}
                className="group flex w-full items-start gap-2.5 border-b border-dashed border-rule/80 py-3 text-left transition-colors hover:bg-sand/40"
              >
                <span className="w-5 shrink-0 font-display text-[20px] italic leading-none text-muted-foreground/60">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[11.5px] font-semibold leading-tight text-ink">
                      {hotspot.province}
                    </span>
                    <ConfidenceMark
                      confidence={hotspot.confidence}
                      showLabel={false}
                      className="shrink-0"
                    />
                  </span>
                  <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.05em] text-muted-foreground">
                    {satelliteShort[hotspot.satellite]} · {formatWIBDate(hotspot.acqTime).replace('.', '')} ·{' '}
                    {formatWIBTime(hotspot.acqTime)}
                  </span>
                  {repeatedProvinces.has(hotspot.province) ? (
                    <span className="mt-0.5 block font-mono text-[8px] tabular-nums tracking-[0.02em] text-muted-foreground/80">
                      {formatCoordinatesCompact(hotspot.lat, hotspot.lon)}
                    </span>
                  ) : null}
                  <span className="mt-1.5 block h-[2px] w-full bg-rule/40">
                    <span
                      className="block h-full bg-ember/65 transition-all group-hover:bg-ember"
                      style={{ width: `${Math.max(3, (hotspot.frp / maxFrp) * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="flex shrink-0 items-start gap-0.5 text-right">
                  <span className="font-mono text-[11.5px] font-medium tabular-nums leading-none text-ink">
                    {formatDecimal(hotspot.frp)}
                  </span>
                  <span className="font-mono text-[7px] uppercase leading-none text-muted-foreground">MW</span>
                  <ArrowUpRight className="ml-0.5 h-3 w-3 text-muted-foreground/40 transition-colors group-hover:text-ember" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-3">
        <Button
          variant="outline"
          className="w-full justify-between font-mono text-[8.5px] uppercase tracking-[0.1em]"
          onClick={onOpenLog}
        >
          <span className="flex items-center gap-2">
            <Table2 className="h-3 w-3" />
            Buka log deteksi
          </span>
          <span className="font-mono text-[8px] text-muted-foreground">
            {loading ? '…' : formatNumber(total)}
          </span>
        </Button>
        {truncated ? (
          <p className="mt-2 text-[9px] leading-relaxed text-ochre">
            Menampilkan subset titik terkuat karena volume melebihi kapasitas muat.
          </p>
        ) : null}
      </div>
    </div>
  )
}

interface FieldNotesPanelProps {
  fetchedAt: number | null
  latestAcq: number | null
  onOpenMethodology: () => void
}

export function FieldNotesPanel({
  fetchedAt,
  latestAcq,
  onOpenMethodology,
}: FieldNotesPanelProps) {
  return (
    <div className="pb-5">
      <div className="border-b border-rule px-4 py-4">
        <div className="micro-label text-ember">Catatan</div>
        <h2 className="mt-1 whitespace-nowrap font-display text-[27px] leading-none tracking-[-0.01em] text-ink">
          Batas data
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Konteks sumber dan cara membaca anomali termal sebelum menarik kesimpulan lapangan.
        </p>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 bg-ember" />
          <span className="micro-label text-ink-soft">Catatan lapangan</span>
        </div>
        <p className="mt-2 font-display text-[23px] italic leading-[1.08] text-ink">
          Satu titik bukan satu kebakaran.
        </p>
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
          VIIRS mendeteksi anomali termal pada piksel 375 meter. Sumber panas industri, pembakaran
          lahan, atau pantulan panas permukaan dapat ikut terekam. Verifikasi lapangan tetap
          diperlukan.
        </p>
        <button
          type="button"
          onClick={onOpenMethodology}
          className="mt-2 inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-ember transition-colors hover:text-ink"
        >
          <BookOpen className="h-2.5 w-2.5" />
          Baca metodologi
        </button>
      </div>

      <div className="mx-4 mt-4 border border-rule bg-paper-raised">
        <div className="border-b border-rule px-3 py-2">
          <span className="micro-label text-muted-foreground">Sumber & status</span>
        </div>
        <dl className="divide-y divide-rule/60 px-3">
          <div className="flex items-center justify-between gap-3 py-1.5">
            <dt className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground">Data</dt>
            <dd className="text-right font-mono text-[8px] uppercase tracking-[0.04em] text-ink-soft">
              NASA FIRMS · VIIRS 375 m
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-1.5">
            <dt className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground">Citra dasar</dt>
            <dd className="text-right font-mono text-[8px] uppercase tracking-[0.04em] text-ink-soft">
              NASA GIBS · NOAA-20 · harian
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-1.5">
            <dt className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground">Sinkron</dt>
            <dd className="text-right font-mono text-[8px] uppercase tracking-[0.04em] text-ink-soft">
              {fetchedAt ? formatWIBTime(fetchedAt) : '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-1.5">
            <dt className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground">Deteksi terbaru</dt>
            <dd className="text-right font-mono text-[8px] uppercase tracking-[0.04em] text-ink-soft">
              {latestAcq ? `${formatWIBTime(latestAcq)} · ${formatRelative(latestAcq)}` : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
