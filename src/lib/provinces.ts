import rawGeoJSON from '@/data/provinces.json'

type Ring = number[][]
type PolygonCoordinates = Ring[]
type MultiPolygonCoordinates = PolygonCoordinates[]

export interface ProvinceProperties {
  id: string
  KODE_PROV: string
  PROVINSI: string
}

export interface ProvinceFeature {
  type: 'Feature'
  properties: ProvinceProperties
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: PolygonCoordinates | MultiPolygonCoordinates
  }
}

export interface ProvinceCollection {
  type: 'FeatureCollection'
  features: ProvinceFeature[]
}

export const PROVINCE_GEOJSON = rawGeoJSON as unknown as ProvinceCollection

type BBox = [number, number, number, number]

interface PreparedPolygon {
  bbox: BBox
  outer: Ring
  holes: Ring[]
}

interface PreparedProvince {
  name: string
  bbox: BBox
  polygons: PreparedPolygon[]
}

function updateBBox(bbox: BBox, ring: Ring) {
  for (const coordinate of ring) {
    const [x, y] = coordinate
    if (x < bbox[0]) bbox[0] = x
    if (y < bbox[1]) bbox[1] = y
    if (x > bbox[2]) bbox[2] = x
    if (y > bbox[3]) bbox[3] = y
  }
}

function createBBox(): BBox {
  return [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
}

function preparePolygon(rings: PolygonCoordinates): PreparedPolygon {
  const outer = rings[0] ?? []
  const holes = rings.slice(1)
  const bbox = createBBox()
  updateBBox(bbox, outer)
  return { bbox, outer, holes }
}

const prepared: PreparedProvince[] = PROVINCE_GEOJSON.features.map((feature) => {
  const polygons =
    feature.geometry.type === 'Polygon'
      ? [preparePolygon(feature.geometry.coordinates as PolygonCoordinates)]
      : (feature.geometry.coordinates as MultiPolygonCoordinates).map(preparePolygon)
  const bbox = createBBox()
  for (const polygon of polygons) {
    bbox[0] = Math.min(bbox[0], polygon.bbox[0])
    bbox[1] = Math.min(bbox[1], polygon.bbox[1])
    bbox[2] = Math.max(bbox[2], polygon.bbox[2])
    bbox[3] = Math.max(bbox[3], polygon.bbox[3])
  }
  return { name: feature.properties.PROVINSI, bbox, polygons }
})

const byName = new Map(prepared.map((province) => [province.name, province]))

function ringContains(ring: Ring, lon: number, lat: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersects =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function polygonContains(polygon: PreparedPolygon, lon: number, lat: number): boolean {
  if (lon < polygon.bbox[0] || lon > polygon.bbox[2] || lat < polygon.bbox[1] || lat > polygon.bbox[3]) {
    return false
  }
  if (!ringContains(polygon.outer, lon, lat)) return false
  return !polygon.holes.some((hole) => ringContains(hole, lon, lat))
}

export function findProvince(lon: number, lat: number): string | null {
  for (const province of prepared) {
    const [minLon, minLat, maxLon, maxLat] = province.bbox
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue
    if (province.polygons.some((polygon) => polygonContains(polygon, lon, lat))) {
      return province.name
    }
  }
  return null
}

export function getProvinceBBox(name: string): BBox | null {
  return byName.get(name)?.bbox ?? null
}

function bboxArea(bbox: BBox): number {
  return Math.max(0, bbox[2] - bbox[0]) * Math.max(0, bbox[3] - bbox[1])
}

export const PROVINCE_LABEL_POINTS = prepared.map((province) => {
  const largest = province.polygons.reduce((best, polygon) =>
    bboxArea(polygon.bbox) > bboxArea(best.bbox) ? polygon : best,
  )
  return {
    name: province.name,
    lon: (largest.bbox[0] + largest.bbox[2]) / 2,
    lat: (largest.bbox[1] + largest.bbox[3]) / 2,
  }
})

export const PROVINCE_NAMES = prepared.map((province) => province.name).sort((a, b) => a.localeCompare(b, 'id'))
