import { findProvince } from '@/lib/provinces'
import type {
  Confidence,
  DayNight,
  Hotspot,
  HotspotFilters,
  HotspotResult,
  SatelliteCode,
} from '@/types'

const SERVICE_URL =
  'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Satellite_VIIRS_Thermal_Hotspots_and_Fire_Activity/FeatureServer/0/query'

const INDONESIA_BBOX = '94,-11.5,142,6.5'
const PAGE_SIZE = 16_000
const MAX_POINTS = 32_000

const OUT_FIELDS = [
  'OBJECTID',
  'latitude',
  'longitude',
  'bright_ti4',
  'bright_ti5',
  'scan',
  'track',
  'acq_time',
  'satellite',
  'confidence',
  'version',
  'frp',
  'daynight',
  'hours_old',
].join(',')

interface FirmsAttributes {
  OBJECTID?: number
  latitude?: number | null
  longitude?: number | null
  bright_ti4?: number | null
  bright_ti5?: number | null
  scan?: number | null
  track?: number | null
  acq_time?: number | null
  satellite?: string | null
  confidence?: string | null
  version?: string | null
  frp?: number | null
  daynight?: string | null
  hours_old?: number | null
}

interface FirmsFeature {
  attributes: FirmsAttributes
}

interface FirmsResponse {
  features?: FirmsFeature[]
  exceededTransferLimit?: boolean
  error?: { message?: string }
}

function buildWhere(filters: HotspotFilters): string {
  const parts = [`hours_old <= ${filters.windowHours}`, `frp >= ${filters.minFrp}`]
  if (filters.confidences.length > 0) {
    parts.push(`confidence IN (${filters.confidences.map((value) => `'${value}'`).join(',')})`)
  } else {
    parts.push('1=0')
  }
  if (filters.satellites.length > 0) {
    parts.push(`satellite IN (${filters.satellites.map((value) => `'${value}'`).join(',')})`)
  } else {
    parts.push('1=0')
  }
  return parts.join(' AND ')
}

function buildUrl(filters: HotspotFilters, offset: number): string {
  const params = new URLSearchParams({
    f: 'json',
    where: buildWhere(filters),
    geometry: INDONESIA_BBOX,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: OUT_FIELDS,
    returnGeometry: 'false',
    orderByFields: 'frp DESC',
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
    outSR: '4326',
  })
  return `${SERVICE_URL}?${params.toString()}`
}

function normalizeConfidence(value: string | null | undefined): Confidence {
  if (value === 'high') return 'high'
  if (value === 'low') return 'low'
  return 'nominal'
}

function normalizeSatellite(value: string | null | undefined): SatelliteCode | null {
  if (value === 'N') return 'N'
  if (value === 'N20') return 'N20'
  if (value === 'N21') return 'N21'
  return null
}

async function fetchPage(
  filters: HotspotFilters,
  offset: number,
  signal?: AbortSignal,
): Promise<FirmsResponse> {
  const response = await fetch(buildUrl(filters, offset), {
    signal,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Layanan NASA FIRMS menolak permintaan (${response.status}).`)
  }
  const payload = (await response.json()) as FirmsResponse
  if (payload.error) {
    throw new Error(payload.error.message ?? 'Layanan NASA FIRMS mengembalikan galat.')
  }
  return payload
}

export async function fetchHotspots(
  filters: HotspotFilters,
  signal?: AbortSignal,
): Promise<HotspotResult> {
  const hotspots: Hotspot[] = []
  let offset = 0
  let truncated = false
  let page = 0

  while (offset < MAX_POINTS) {
    const payload = await fetchPage(filters, offset, signal)
    const features = payload.features ?? []
    if (features.length === 0) break

    for (const feature of features) {
      const attributes = feature.attributes
      const lat = attributes.latitude
      const lon = attributes.longitude
      const acqTime = attributes.acq_time
      const satellite = normalizeSatellite(attributes.satellite)
      if (
        typeof lat !== 'number' ||
        typeof lon !== 'number' ||
        typeof acqTime !== 'number' ||
        !satellite
      ) {
        continue
      }

      const province = findProvince(lon, lat)
      if (!province) continue

      hotspots.push({
        id: attributes.OBJECTID ?? Math.round(acqTime + lat * 1000 + lon * 1000),
        lat,
        lon,
        frp: Math.max(0, attributes.frp ?? 0),
        confidence: normalizeConfidence(attributes.confidence),
        satellite,
        acqTime,
        brightTi4: attributes.bright_ti4 ?? null,
        brightTi5: attributes.bright_ti5 ?? null,
        scan: attributes.scan ?? null,
        track: attributes.track ?? null,
        daynight: (attributes.daynight === 'N' ? 'N' : 'D') as DayNight,
        version: attributes.version ?? 'VIIRS 2.0 NRT',
        hoursOld: attributes.hours_old ?? null,
        province,
      })
    }

    offset += features.length
    page += 1

    if (!payload.exceededTransferLimit) break
    if (page >= 2) {
      truncated = true
      break
    }
  }

  let latestAcq: number | null = null
  for (const hotspot of hotspots) {
    if (latestAcq === null || hotspot.acqTime > latestAcq) latestAcq = hotspot.acqTime
  }

  return {
    hotspots,
    fetchedAt: Date.now(),
    latestAcq,
    truncated,
    matchedCount: offset,
  }
}

export const FIRMS_SERVICE_URL =
  'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Satellite_VIIRS_Thermal_Hotspots_and_Fire_Activity/FeatureServer/0'
