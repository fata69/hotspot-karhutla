export type TimeWindow = 24 | 48 | 72 | 168
export type Confidence = 'high' | 'nominal' | 'low'
export type SatelliteCode = 'N' | 'N20' | 'N21'
export type DayNight = 'D' | 'N'

export interface Hotspot {
  id: number
  lat: number
  lon: number
  frp: number
  confidence: Confidence
  satellite: SatelliteCode
  acqTime: number
  brightTi4: number | null
  brightTi5: number | null
  scan: number | null
  track: number | null
  daynight: DayNight
  version: string
  hoursOld: number | null
  province: string
}

export interface HotspotFilters {
  windowHours: TimeWindow
  confidences: Confidence[]
  satellites: SatelliteCode[]
  minFrp: number
}

export interface HotspotResult {
  hotspots: Hotspot[]
  fetchedAt: number
  latestAcq: number | null
  truncated: boolean
  matchedCount: number
}

export interface SatelliteMeta {
  code: SatelliteCode
  name: string
  short: string
}

export const SATELLITES: SatelliteMeta[] = [
  { code: 'N20', name: 'NOAA-20', short: 'N20' },
  { code: 'N21', name: 'NOAA-21', short: 'N21' },
  { code: 'N', name: 'Suomi NPP', short: 'NPP' },
]

export const CONFIDENCE_META: Record<
  Confidence,
  { label: string; short: string; color: string }
> = {
  high: { label: 'Tinggi', short: 'Tinggi', color: '#b93a12' },
  nominal: { label: 'Nominal', short: 'Nominal', color: '#d97732' },
  low: { label: 'Rendah', short: 'Rendah', color: '#a98b48' },
}

export const TIME_WINDOWS: { value: TimeWindow; amount: string; unit: string; label: string }[] = [
  { value: 24, amount: '24', unit: 'jam', label: '24 jam terakhir' },
  { value: 48, amount: '48', unit: 'jam', label: '48 jam terakhir' },
  { value: 72, amount: '72', unit: 'jam', label: '72 jam terakhir' },
  { value: 168, amount: '7', unit: 'hari', label: '7 hari terakhir' },
]
