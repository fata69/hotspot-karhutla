import type { Confidence, DayNight, SatelliteCode } from '@/types'

const numberFormatter = new Intl.NumberFormat('id-ID')
const compactFormatter = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatDecimal(value: number, digits = 1): string {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatCompact(value: number): string {
  if (Math.abs(value) < 10_000) return formatNumber(Math.round(value))
  return compactFormatter.format(value)
}

const wibDateTime = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const wibTime = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
})

const wibDate = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const wibDateShort = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
})

const wibDayLong = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const utcTime = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatWIBDateTime(time: number): string {
  return `${wibDateTime.format(time)} WIB`
}

export function formatWIBTime(time: number): string {
  return `${wibTime.format(time)} WIB`
}

export function formatWIBDate(time: number): string {
  return wibDate.format(time)
}

export function formatWIBDateShort(time: number): string {
  return wibDateShort.format(time)
}

export function formatWIBDayLong(time: number): string {
  return wibDayLong.format(time)
}

export function formatUTCTime(time: number): string {
  return `${utcTime.format(time)} UTC`
}

export function formatRelative(time: number, now = Date.now()): string {
  const diffMinutes = Math.max(0, Math.round((now - time) / 60_000))
  if (diffMinutes < 1) return 'baru saja'
  if (diffMinutes < 60) return `${diffMinutes} mnt lalu`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} jam lalu`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} hari lalu`
}

export function formatCoordinates(lat: number, lon: number): string {
  const latHemisphere = lat >= 0 ? 'LU' : 'LS'
  const lonHemisphere = lon >= 0 ? 'BT' : 'BB'
  return `${formatDecimal(Math.abs(lat), 4)}° ${latHemisphere} · ${formatDecimal(Math.abs(lon), 4)}° ${lonHemisphere}`
}

export function formatCoordinatesCompact(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
}

export function getWibHour(time: number): number {
  const shifted = new Date(time + 7 * 60 * 60 * 1000)
  return shifted.getUTCHours()
}

export function getWibDayKey(time: number): string {
  const shifted = new Date(time + 7 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

export function getWibDayKeyFromNow(offsetDays = 0, now = Date.now()): string {
  return getWibDayKey(now - offsetDays * 86_400_000)
}

export function formatUtcDateKey(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

export function formatImageryDate(dateKey: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00Z`))
}

export function formatImageryDateShort(dateKey: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${dateKey}T12:00:00Z`))
}

export const confidenceLabels: Record<Confidence, string> = {
  high: 'Tinggi',
  nominal: 'Nominal',
  low: 'Rendah',
}

export const satelliteLabels: Record<SatelliteCode, string> = {
  N20: 'NOAA-20',
  N21: 'NOAA-21',
  N: 'Suomi NPP',
}

export const satelliteShort: Record<SatelliteCode, string> = {
  N20: 'N20',
  N21: 'N21',
  N: 'NPP',
}

export function dayNightLabel(daynight: DayNight): string {
  return daynight === 'D' ? 'Siang' : 'Malam'
}

export type IntensityBand = {
  label: string
  description: string
  tone: 'low' | 'medium' | 'high' | 'extreme'
}

export function frpBand(frp: number): IntensityBand {
  if (frp >= 100) {
    return {
      label: 'Sangat tinggi',
      description: 'Pelepasan energi sangat besar pada piksel ini. Prioritaskan verifikasi lapangan.',
      tone: 'extreme',
    }
  }
  if (frp >= 50) {
    return {
      label: 'Tinggi',
      description: 'Intensitas radiasi tinggi. Perlu perhatian dan verifikasi citra resolusi tinggi.',
      tone: 'high',
    }
  }
  if (frp >= 10) {
    return {
      label: 'Sedang',
      description: 'Anomali termal terukur. Bandingkan dengan tutupan lahan dan arah angin setempat.',
      tone: 'medium',
    }
  }
  return {
    label: 'Rendah',
    description: 'Intensitas kecil. Bisa berasal dari sumber panas non-kebakaran atau api permukaan.',
    tone: 'low',
  }
}
