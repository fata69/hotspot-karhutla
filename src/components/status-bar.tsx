import { useEffect, useState } from 'react'
import { formatWIBDateTime } from '@/lib/format'

export function StatusBar() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <footer className="hidden h-7 shrink-0 items-center gap-4 border-t border-rule bg-paper-raised px-4 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground md:flex">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 bg-ember" />
        Sumber: NASA FIRMS · VIIRS 375 m · NASA GIBS
      </span>
      <span className="mx-auto hidden text-ink-soft/80 sm:block">
        Titik panas adalah anomali termal, bukan konfirmasi kebakaran.
      </span>
      <span className="ml-auto whitespace-nowrap">
        {formatWIBDateTime(now)} · WIB (UTC+7)
      </span>
    </footer>
  )
}
