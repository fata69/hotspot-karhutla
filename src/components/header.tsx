import { BookOpen, Flame, RefreshCw, Table2 } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatNumber, formatRelative, formatWIBDate, formatWIBTime } from '@/lib/format'
import { cn } from '@/lib/utils'

interface HeaderProps {
  count: number
  latestAcq: number | null
  fetchedAt: number | null
  loading: boolean
  historical: boolean
  onRefresh: () => void
  onOpenLog: () => void
  onOpenMethodology: () => void
  onOpenHighlights: () => void
}

export function Header({
  count,
  latestAcq,
  fetchedAt,
  loading,
  historical,
  onRefresh,
  onOpenLog,
  onOpenMethodology,
  onOpenHighlights,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b-2 border-ember bg-ink px-4 text-paper sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <BrandMark className="h-8 w-8 shrink-0 text-paper" />
        <div className="hidden min-w-0 min-[340px]:block">
          <div className="flex items-baseline gap-2.5">
            <span className="truncate font-display text-[clamp(21px,6.1vw,25px)] leading-none tracking-[0.005em] text-paper">
              Posko Bara
            </span>
            <span className="hidden font-mono text-[8px] uppercase tracking-[0.18em] text-paper/40 sm:inline">
              Edisi pemantauan
            </span>
          </div>
          <div className="mt-0.5 hidden font-mono text-[8.5px] uppercase tracking-[0.16em] text-paper/50 sm:block">
            Titik panas karhutla · Indonesia
          </div>
        </div>
      </div>

      <div className="mx-auto hidden min-w-0 items-center gap-3 border-x border-paper/15 px-5 lg:flex">
        <span className={cn('h-2 w-2 shrink-0 bg-ember', loading && 'animate-pulse')} />
        <div className="min-w-0">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/85">
            {historical ? 'Arsip harian · NASA FIRMS' : 'Data terkini · NASA FIRMS'}
          </div>
          <div className="mt-0.5 whitespace-nowrap font-mono text-[8.5px] uppercase tracking-[0.09em] text-paper/40">
            {fetchedAt ? `Dimuat ${formatWIBTime(fetchedAt)}` : 'Menghubungkan arsip satelit'}
            {latestAcq ? ` · Akuisisi ${formatWIBTime(latestAcq)} · ${formatRelative(latestAcq)}` : ''}
          </div>
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <span className="mr-1 hidden text-right font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-paper/35 xl:block">
          {formatWIBDate(Date.now())}
          <br />
          Waktu Indonesia Barat
        </span>
        <Button
          variant="inverseGhost"
          size="sm"
          className="hidden font-mono text-[9px] uppercase tracking-[0.1em] md:inline-flex"
          onClick={onOpenMethodology}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Metodologi
        </Button>
        <Button
          variant="inverseGhost"
          size="sm"
          className="px-2 font-mono text-[9px] uppercase tracking-[0.1em] min-[1280px]:hidden sm:px-3"
          onClick={onOpenHighlights}
          aria-label="Buka sorotan titik panas"
        >
          <Flame className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sorotan</span>
        </Button>
        <Button
          variant="inverse"
          size="sm"
          className="font-mono text-[9px] uppercase tracking-[0.1em]"
          onClick={onOpenLog}
        >
          <Table2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Log</span>
          {count > 0 ? (
            <span className="hidden border border-paper/25 px-1 font-mono text-[8px] text-paper/70 min-[380px]:inline">
              {formatNumber(count)}
            </span>
          ) : null}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="inverseGhost"
              size="icon"
              className="h-8 w-8"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Muat ulang data"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {loading ? 'Memuat data satelit' : latestAcq ? `Akuisisi terakhir ${formatRelative(latestAcq)}` : 'Muat ulang data'}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
