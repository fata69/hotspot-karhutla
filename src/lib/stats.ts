import {
  getWibDayKey,
  getWibHour,
  formatWIBDateShort,
  formatWIBDayLong,
} from '@/lib/format'
import type { Confidence, Hotspot, TimeWindow } from '@/types'

export interface SummaryStats {
  total: number
  high: number
  nominal: number
  low: number
  strong: number
  frpTotal: number
  topProvince: { name: string; count: number } | null
}

export interface ProvinceStats {
  name: string
  count: number
  high: number
  share: number
  maxFrp: number
}

export interface TrendBin {
  key: string
  label: string
  title: string
  count: number
  high: number
  partial: boolean
}

export interface TrendData {
  bins: TrendBin[]
  mode: 'hour' | 'day'
  peak: number
  max: number
}

function countConfidence(hotspots: Hotspot[], confidence: Confidence): number {
  let count = 0
  for (const hotspot of hotspots) {
    if (hotspot.confidence === confidence) count += 1
  }
  return count
}

export function computeSummary(hotspots: Hotspot[]): SummaryStats {
  let frpTotal = 0
  let strong = 0
  const byProvince = new Map<string, number>()

  for (const hotspot of hotspots) {
    frpTotal += hotspot.frp
    if (hotspot.frp >= 50) strong += 1
    byProvince.set(hotspot.province, (byProvince.get(hotspot.province) ?? 0) + 1)
  }

  let topProvince: SummaryStats['topProvince'] = null
  for (const [name, count] of byProvince) {
    if (!topProvince || count > topProvince.count) topProvince = { name, count }
  }

  return {
    total: hotspots.length,
    high: countConfidence(hotspots, 'high'),
    nominal: countConfidence(hotspots, 'nominal'),
    low: countConfidence(hotspots, 'low'),
    strong,
    frpTotal,
    topProvince,
  }
}

export function computeProvinceStats(hotspots: Hotspot[]): ProvinceStats[] {
  const map = new Map<string, { count: number; high: number; maxFrp: number }>()
  for (const hotspot of hotspots) {
    const entry = map.get(hotspot.province) ?? { count: 0, high: 0, maxFrp: 0 }
    entry.count += 1
    if (hotspot.confidence === 'high') entry.high += 1
    if (hotspot.frp > entry.maxFrp) entry.maxFrp = hotspot.frp
    map.set(hotspot.province, entry)
  }
  const total = hotspots.length || 1
  return [...map.entries()]
    .map(([name, entry]) => ({
      name,
      count: entry.count,
      high: entry.high,
      maxFrp: entry.maxFrp,
      share: entry.count / total,
    }))
    .sort((a, b) => b.count - a.count || b.high - a.high || a.name.localeCompare(b.name, 'id'))
}

export function computeTrend(hotspots: Hotspot[], windowHours: TimeWindow, now = Date.now()): TrendData {
  if (windowHours === 24) {
    const bins: TrendBin[] = Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour),
      label: String(hour).padStart(2, '0'),
      title: `Pukul ${String(hour).padStart(2, '0')}.00–${String(hour).padStart(2, '0')}.59 WIB`,
      count: 0,
      high: 0,
      partial: false,
    }))

    const currentHour = getWibHour(now)
    for (const hotspot of hotspots) {
      const bin = bins[getWibHour(hotspot.acqTime)]
      bin.count += 1
      if (hotspot.confidence === 'high') bin.high += 1
    }
    bins[currentHour].partial = true

    const peak = bins.reduce((best, bin) => (bin.count > best.count ? bin : best), bins[0])
    return { bins, mode: 'hour', peak: peak.count, max: Math.max(...bins.map((bin) => bin.count)) }
  }

  const dayCount = windowHours === 48 ? 3 : windowHours === 72 ? 4 : 8
  const bins: TrendBin[] = []
  const todayKey = getWibDayKey(now)
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const time = now - offset * 86_400_000
    const key = getWibDayKey(time)
    bins.push({
      key,
      label: formatWIBDateShort(time).replace('.', ''),
      title: formatWIBDayLong(time),
      count: 0,
      high: 0,
      partial: key === todayKey,
    })
  }

  const byKey = new Map(bins.map((bin) => [bin.key, bin]))
  for (const hotspot of hotspots) {
    const bin = byKey.get(getWibDayKey(hotspot.acqTime))
    if (!bin) continue
    bin.count += 1
    if (hotspot.confidence === 'high') bin.high += 1
  }

  const peak = bins.reduce((best, bin) => (bin.count > best.count ? bin : best), bins[0])
  return { bins, mode: 'day', peak: peak.count, max: Math.max(...bins.map((bin) => bin.count)) }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadius = 6371
  const toRadians = (value: number) => (value * Math.PI) / 180
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function countNearby(hotspots: Hotspot[], target: Hotspot, radiusKm = 5): number {
  let count = 0
  for (const hotspot of hotspots) {
    if (hotspot.id === target.id) continue
    if (haversineKm(target.lat, target.lon, hotspot.lat, hotspot.lon) <= radiusKm) count += 1
  }
  return count
}

export function pickStrongest(hotspots: Hotspot[], limit = 5): Hotspot[] {
  return [...hotspots].sort((a, b) => b.frp - a.frp || b.acqTime - a.acqTime).slice(0, limit)
}
