import { formatUtcDateKey, getWibDayKey } from '@/lib/format'
import type { Hotspot } from '@/types'

function escapeCell(value: string | number | null): string {
  if (value === null) return ''
  const text = String(value)
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function buildCsv(hotspots: Hotspot[]): string {
  const header = [
    'object_id',
    'latitude',
    'longitude',
    'provinsi',
    'acq_time_utc',
    'satelit',
    'keyakinan',
    'frp_mw',
    'bright_ti4_kelvin',
    'bright_ti5_kelvin',
    'waktu_siang_malam',
    'scan',
    'track',
    'versi_produk',
  ]

  const rows = hotspots.map((hotspot) =>
    [
      hotspot.id,
      hotspot.lat.toFixed(5),
      hotspot.lon.toFixed(5),
      escapeCell(hotspot.province),
      new Date(hotspot.acqTime).toISOString(),
      hotspot.satellite,
      hotspot.confidence,
      hotspot.frp.toFixed(2),
      hotspot.brightTi4?.toFixed(2) ?? '',
      hotspot.brightTi5?.toFixed(2) ?? '',
      hotspot.daynight,
      hotspot.scan?.toFixed(2) ?? '',
      hotspot.track?.toFixed(2) ?? '',
      escapeCell(hotspot.version),
    ].join(','),
  )

  return `\uFEFF${header.join(',')}\n${rows.join('\n')}\n`
}

export function downloadCsv(hotspots: Hotspot[]) {
  const csv = buildCsv(hotspots)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = getWibDayKey(Date.now()).replaceAll('-', '')
  const utc = formatUtcDateKey(Date.now()).replaceAll('-', '')
  link.href = url
  link.download = `posko-bara_${stamp}_${utc}_wib.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
