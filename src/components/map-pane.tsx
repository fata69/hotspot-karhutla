import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Map as MapLibreMap,
  Popup,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapEventType,
  type RasterTileSource,
} from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { FeatureCollection, Point } from 'geojson'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Frame,
  Layers,
  LoaderCircle,
  Lock,
  Map as MapIcon,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Satellite,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  confidenceLabels,
  formatDecimal,
  formatImageryDateShort,
  formatNumber,
  formatUtcDateKey,
  formatWibDayKeyLong,
  formatWibDayKeyShort,
  formatWIBDateTime,
  getWibDayKeyFromNow,
  satelliteShort,
} from '@/lib/format'
import { getProvinceBBox, PROVINCE_GEOJSON, PROVINCE_LABEL_POINTS } from '@/lib/provinces'
import { CONFIDENCE_META, type Hotspot, type HotspotFilters } from '@/types'
import { cn } from '@/lib/utils'

setWorkerUrl(maplibreWorkerUrl)

const GLYPHS = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [94.5, -11.5],
  [141.5, 6.3],
]
// Center may drift slightly during zoom, but never away from Indonesian territory.
const CENTER_BOUNDS = { west: 95.6, east: 140.4, south: -10.6, north: 5.6 }
const IMAGERY_DAYS = 8

type Basemap = 'satellite' | 'light'
type MapClickEvent = MapEventType['click']

interface MapPaneProps {
  hotspots: Hotspot[]
  selected: Hotspot | null
  activeProvince: string | null
  selectedDay: string | null
  periodLabel: string
  filters: HotspotFilters
  isDefaultFilters: boolean
  loading: boolean
  error: string | null
  focusSignal: number
  dateSignal: number
  onSelect: (hotspot: Hotspot) => void
  onProvinceClick: (province: string) => void
  onClearSelection: () => void
  onDayChange: (day: string | null) => void
  onResetFilters: () => void
  onRetry: () => void
}

interface MapCallbacks {
  hotspotById: Map<number, Hotspot>
  onSelect: (hotspot: Hotspot) => void
  onProvinceClick: (province: string) => void
  onClearSelection: () => void
}

function imageryDateKey(offsetDays: number): string {
  return formatUtcDateKey(Date.now() - offsetDays * 86_400_000)
}

const GIBS_TILE_ROOT =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default'

function satelliteTiles(date: string): string {
  return `${GIBS_TILE_ROOT}/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg`
}

function imageryTileUrls(date: string): string[] {
  const zoom = 4
  const urls: string[] = []
  for (let x = 12; x <= 14; x += 1) {
    for (let y = 7; y <= 8; y += 1) {
      urls.push(`${GIBS_TILE_ROOT}/${date}/GoogleMapsCompatible_Level9/${zoom}/${y}/${x}.jpeg`)
    }
  }
  return urls
}

function preloadImage(url: string, timeoutMs = 4500): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image()
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve()
    }
    const timer = window.setTimeout(finish, timeoutMs)
    image.onload = finish
    image.onerror = finish
    image.src = url
  })
}

function clusterCountLabel(): ExpressionSpecification {
  const count: ExpressionSpecification = ['get', 'point_count']
  const thousands: ExpressionSpecification = ['floor', ['/', count, 1000]]
  const decimal: ExpressionSpecification = [
    'floor',
    ['*', 10, ['-', ['/', count, 1000], thousands]],
  ]
  return [
    'case',
    ['>=', count, 10000],
    ['concat', ['to-string', ['round', ['/', count, 1000]]], ' rb'],
    ['>=', count, 1000],
    [
      'concat',
      ['to-string', thousands],
      ['case', ['>', decimal, 0], ['concat', ',', ['to-string', decimal]], ''],
      ' rb',
    ],
    ['to-string', count],
  ]
}

function shortPeriod(hours: number): string {
  return hours === 168 ? '7 hari' : `${hours} jam`
}

function popupNode(label: string, main: string, sub?: string): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'map-tip'
  const labelNode = document.createElement('div')
  labelNode.className = 'tip-label'
  labelNode.textContent = label
  const mainNode = document.createElement('div')
  mainNode.className = 'tip-main'
  mainNode.textContent = main
  root.append(labelNode, mainNode)
  if (sub) {
    const subNode = document.createElement('div')
    subNode.className = 'tip-sub'
    subNode.textContent = sub
    root.append(subNode)
  }
  return root
}

function fitScope(
  map: MapLibreMap,
  province: string | null,
  duration: number,
) {
  if (province) {
    const bbox = getProvinceBBox(province)
    if (bbox) {
      map.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: 56, maxZoom: 7.6, duration },
      )
    }
    return
  }
  map.fitBounds(INDONESIA_BOUNDS, { padding: 28, duration })
}

function LegendContent() {
  const entries = [
    CONFIDENCE_META.high,
    CONFIDENCE_META.nominal,
    CONFIDENCE_META.low,
  ]
  return (
    <div className="space-y-2.5">
      <div>
        <div className="micro-label mb-1.5 text-muted-foreground">Keyakinan</div>
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: entry.color }} />
              <span className="text-[10px] leading-none text-ink-soft">{entry.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-rule pt-2">
        <div className="micro-label mb-1.5 text-muted-foreground">Intensitas FRP</div>
        <div className="flex items-end gap-3">
          {[
            ['10', 5],
            ['50', 7],
            ['100+', 10],
          ].map(([label, size]) => (
            <span key={label} className="flex items-center gap-1">
              <span
                className="rounded-full border border-ink/50 bg-ember/15"
                style={{ width: Number(size), height: Number(size) }}
              />
              <span className="font-mono text-[8px] text-muted-foreground">{label} MW</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-rule pt-2">
        <span className="flex h-5 min-w-5 items-center justify-center bg-ink px-1 font-mono text-[8px] text-paper">
          24
        </span>
        <span className="text-[9.5px] leading-tight text-muted-foreground">
          Angka dalam kotak adalah jumlah titik. Klik untuk memperbesar.
        </span>
      </div>
    </div>
  )
}

export function MapPane({
  hotspots,
  selected,
  activeProvince,
  selectedDay,
  periodLabel,
  filters,
  isDefaultFilters,
  loading,
  error,
  focusSignal,
  dateSignal,
  onSelect,
  onProvinceClick,
  onClearSelection,
  onDayChange,
  onResetFilters,
  onRetry,
}: MapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const hoverKeyRef = useRef<string | null>(null)
  const hoverProvinceIdRef = useRef<string | number | null>(null)
  const coordRef = useRef<HTMLSpanElement | null>(null)
  const firstFitRef = useRef(true)
  const appliedImageryDateRef = useRef<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [basemap, setBasemap] = useState<Basemap>('satellite')
  const [dateOpen, setDateOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [datePending, setDatePending] = useState(false)
  const [imageryLoading, setImageryLoading] = useState(false)

  const latestImageryDate = useMemo(() => imageryDateKey(1), [])
  const oldestImageryDate = useMemo(() => imageryDateKey(IMAGERY_DAYS), [])
  const imageryDate = useMemo(() => {
    if (!selectedDay) return latestImageryDate
    if (selectedDay > latestImageryDate) return latestImageryDate
    if (selectedDay < oldestImageryDate) return oldestImageryDate
    return selectedDay
  }, [selectedDay, latestImageryDate, oldestImageryDate])

  const callbacksRef = useRef<MapCallbacks>({
    hotspotById: new Map(),
    onSelect,
    onProvinceClick,
    onClearSelection,
  })
  const provinceCountsRef = useRef<Map<string, number>>(new Map())

  const filterContext = useMemo(() => {
    const confidences = (['high', 'nominal', 'low'] as const).filter((confidence) =>
      filters.confidences.includes(confidence),
    )
    const satellites = (['N20', 'N21', 'N'] as const).filter((satellite) =>
      filters.satellites.includes(satellite),
    )
    return {
      period: selectedDay
        ? `Harian ${formatWibDayKeyShort(selectedDay)}`
        : shortPeriod(filters.windowHours),
      confidence:
        confidences.length === 3
          ? 'Semua keyakinan'
          : confidences.map((confidence) => confidenceLabels[confidence]).join('+') ||
            'Tanpa keyakinan',
      satellite:
        satellites.length === 3
          ? 'Semua satelit'
          : satellites.map((satellite) => satelliteShort[satellite]).join('+') || 'Tanpa satelit',
    }
  }, [filters, selectedDay])

  const hotspotById = useMemo(() => new Map(hotspots.map((hotspot) => [hotspot.id, hotspot])), [hotspots])
  const provinceCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const hotspot of hotspots) {
      counts.set(hotspot.province, (counts.get(hotspot.province) ?? 0) + 1)
    }
    return counts
  }, [hotspots])

  useEffect(() => {
    callbacksRef.current = { hotspotById, onSelect, onProvinceClick, onClearSelection }
  }, [hotspotById, onSelect, onProvinceClick, onClearSelection])

  useEffect(() => {
    provinceCountsRef.current = provinceCounts
  }, [provinceCounts])

  const hotspotData = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: hotspots.map((hotspot) => ({
        type: 'Feature',
        id: hotspot.id,
        geometry: { type: 'Point', coordinates: [hotspot.lon, hotspot.lat] },
        properties: {
          id: hotspot.id,
          frp: hotspot.frp,
          confidence: hotspot.confidence,
          acqTime: hotspot.acqTime,
          satellite: hotspot.satellite,
          province: hotspot.province,
        },
      })),
    }),
    [hotspots],
  )

  const dayOptions = useMemo(
    () =>
      Array.from({ length: IMAGERY_DAYS - 1 }, (_, index) => {
        const key = getWibDayKeyFromNow(index + 1)
        return {
          key,
          full: formatWibDayKeyLong(key),
          relative: index === 0 ? 'Kemarin' : `${index + 1} hari lalu`,
        }
      }),
    [],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = new MapLibreMap({
      container,
      style: {
        version: 8,
        glyphs: GLYPHS,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#d8d3c5' },
          },
        ],
      },
      center: [118.3, -2.4],
      zoom: 3.6,
      minZoom: 3.2,
      maxZoom: 12,
      dragPan: false,
      dragRotate: false,
      keyboard: false,
      pitchWithRotate: false,
      attributionControl: false,
      fadeDuration: 120,
    })
    mapRef.current = map
    map.touchZoomRotate.disableRotation()

    const constrainToIndonesia = () => {
      const center = map.getCenter()
      const lng = Math.min(CENTER_BOUNDS.east, Math.max(CENTER_BOUNDS.west, center.lng))
      const lat = Math.min(CENTER_BOUNDS.north, Math.max(CENTER_BOUNDS.south, center.lat))
      if (Math.abs(lng - center.lng) > 0.001 || Math.abs(lat - center.lat) > 0.001) {
        map.easeTo({ center: [lng, lat], duration: 320, essential: true })
      }
    }
    map.on('moveend', constrainToIndonesia)

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(container)

    let cancelled = false
    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      maxWidth: '260px',
      className: 'posko-map-popup',
    })
    popupRef.current = popup

    const setProvinceHover = (id: string | number | null) => {
      if (hoverProvinceIdRef.current === id) return
      if (hoverProvinceIdRef.current !== null) {
        map.setFeatureState(
          { source: 'provinces', id: hoverProvinceIdRef.current },
          { hover: false },
        )
      }
      if (id !== null) {
        map.setFeatureState({ source: 'provinces', id }, { hover: true })
      }
      hoverProvinceIdRef.current = id
    }

    const clearHover = () => {
      hoverKeyRef.current = null
      setProvinceHover(null)
      popup.remove()
      map.getCanvas().style.cursor = ''
    }

    const handleMove = (event: MapClickEvent) => {
      if (coordRef.current) {
        coordRef.current.textContent = `${formatDecimal(event.lngLat.lat, 2)}°, ${formatDecimal(event.lngLat.lng, 2)}°`
      }

      const features = map.queryRenderedFeatures(event.point, {
        layers: ['clusters', 'hotspots', 'province-fill'],
      })
      if (features.length === 0) {
        clearHover()
        return
      }

      const cluster = features.find((feature) => feature.layer.id === 'clusters')
      const point = features.find((feature) => feature.layer.id === 'hotspots')
      const province = features.find((feature) => feature.layer.id === 'province-fill')
      const current = callbacksRef.current

      if (cluster) {
        setProvinceHover(null)
        const count = Number(cluster.properties?.point_count ?? 0)
        const key = `cluster-${cluster.properties?.cluster_id ?? count}`
        map.getCanvas().style.cursor = 'pointer'
        if (hoverKeyRef.current === key) return
        hoverKeyRef.current = key
        popup
          .setLngLat(event.lngLat)
          .setDOMContent(
            popupNode('Klaster deteksi', `${formatNumber(count)} titik`, 'Klik untuk memperbesar'),
          )
          .addTo(map)
        return
      }

      if (point) {
        setProvinceHover(null)
        const id = Number(point.properties?.id)
        const hotspot = current.hotspotById.get(id)
        if (!hotspot) {
          clearHover()
          return
        }
        const key = `point-${id}`
        map.getCanvas().style.cursor = 'pointer'
        if (hoverKeyRef.current === key) return
        hoverKeyRef.current = key
        popup
          .setLngLat(event.lngLat)
          .setDOMContent(
            popupNode(
              hotspot.province,
              `${formatDecimal(hotspot.frp)} MW · ${confidenceLabels[hotspot.confidence]}`,
              `${satelliteShort[hotspot.satellite]} · ${formatWIBDateTime(hotspot.acqTime)}`,
            ),
          )
          .addTo(map)
        return
      }

      if (province) {
        setProvinceHover(province.id ?? null)
        const name = String(province.properties?.PROVINSI ?? '')
        const count = provinceCountsRef.current.get(name) ?? 0
        const key = `province-${name}`
        map.getCanvas().style.cursor = 'pointer'
        if (hoverKeyRef.current === key) return
        hoverKeyRef.current = key
        popup
          .setLngLat(event.lngLat)
          .setDOMContent(
            popupNode(
              'Batas provinsi',
              name,
              `${formatNumber(count)} titik pada filter aktif · klik untuk fokus`,
            ),
          )
          .addTo(map)
        return
      }

      clearHover()
    }

    const handleClick = (event: MapClickEvent) => {
      clearHover()
      const pointFeatures = map.queryRenderedFeatures(event.point, {
        layers: ['clusters', 'hotspots'],
      })
      const cluster = pointFeatures.find((feature) => feature.layer.id === 'clusters')
      const point = pointFeatures.find((feature) => feature.layer.id === 'hotspots')
      const current = callbacksRef.current

      if (cluster) {
        const source = map.getSource('hotspots') as GeoJSONSource | undefined
        const clusterId = Number(cluster.properties?.cluster_id)
        const coordinates = (cluster.geometry as Point).coordinates as [number, number]
        if (source && Number.isFinite(clusterId)) {
          void source
            .getClusterExpansionZoom(clusterId)
            .then((zoom) => {
              map.easeTo({ center: coordinates, zoom: Math.min(zoom + 0.2, 11.5), duration: 700 })
            })
            .catch(() => undefined)
        }
        return
      }

      if (point) {
        const id = Number(point.properties?.id)
        const hotspot = current.hotspotById.get(id)
        if (hotspot) current.onSelect(hotspot)
        return
      }

      const provinceFeature = map.queryRenderedFeatures(event.point, {
        layers: ['province-fill'],
      })[0]
      if (provinceFeature) {
        const name = String(provinceFeature.properties?.PROVINSI ?? '')
        if (name) current.onProvinceClick(name)
        return
      }

      current.onClearSelection()
    }

    const handleLeave = () => {
      if (hoverKeyRef.current) clearHover()
    }

    map.on('load', () => {
      if (cancelled) return

      map.addSource('base-satellite', {
        type: 'raster',
        tiles: [satelliteTiles(imageryDate)],
        tileSize: 256,
        maxzoom: 9,
      })
      appliedImageryDateRef.current = imageryDate
      map.addLayer({
        id: 'base-satellite',
        type: 'raster',
        source: 'base-satellite',
        paint: { 'raster-opacity': 1, 'raster-fade-duration': 150 },
      })

      map.addSource('base-light', {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 16,
      })
      map.addLayer({
        id: 'base-light',
        type: 'raster',
        source: 'base-light',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 1, 'raster-fade-duration': 150 },
      })
      map.addSource('base-light-ref', {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 16,
      })
      map.addLayer({
        id: 'base-light-ref',
        type: 'raster',
        source: 'base-light-ref',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 150 },
      })

      map.addSource('provinces', {
        type: 'geojson',
        data: PROVINCE_GEOJSON as unknown as FeatureCollection,
        generateId: true,
      })
      map.addLayer({
        id: 'province-fill',
        type: 'fill',
        source: 'provinces',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#c24318',
            '#191811',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.085,
            0.045,
          ],
        },
      })
      map.addSource('province-active', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'province-active-fill',
        type: 'fill',
        source: 'province-active',
        paint: { 'fill-color': '#c24318', 'fill-opacity': 0.1 },
      })
      map.addLayer({
        id: 'province-line-casing',
        type: 'line',
        source: 'provinces',
        paint: { 'line-color': '#f5f0e4', 'line-width': 2.4, 'line-opacity': 0.32 },
      })
      map.addLayer({
        id: 'province-line',
        type: 'line',
        source: 'provinces',
        paint: { 'line-color': '#191811', 'line-width': 0.9, 'line-opacity': 0.58 },
      })
      map.addLayer({
        id: 'province-active-line',
        type: 'line',
        source: 'province-active',
        paint: { 'line-color': '#c24318', 'line-width': 2.2, 'line-opacity': 0.95 },
      })
      map.addSource('province-label-points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: PROVINCE_LABEL_POINTS.map((point) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [point.lon, point.lat] },
            properties: { PROVINSI: point.name },
          })),
        },
      })
      map.addLayer({
        id: 'province-labels',
        type: 'symbol',
        source: 'province-label-points',
        minzoom: 4.4,
        maxzoom: 8,
        layout: {
          'text-field': ['get', 'PROVINSI'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4.4, 8.5, 7, 10.5, 9, 12],
          'text-letter-spacing': 0.06,
          'text-max-width': 8,
          'text-padding': 12,
          'text-allow-overlap': false,
          'text-optional': true,
        },
        paint: {
          'text-color': '#f5f0e4',
          'text-halo-color': '#191811',
          'text-halo-width': 1.5,
          'text-opacity': 0.9,
        },
      })

      const clusterCanvas = document.createElement('canvas')
      const clusterSize = 48
      clusterCanvas.width = clusterSize
      clusterCanvas.height = clusterSize
      const clusterContext = clusterCanvas.getContext('2d')!
      clusterContext.fillStyle = '#f5f0e4'
      clusterContext.fillRect(0, 0, clusterSize, clusterSize)
      clusterContext.fillStyle = '#191811'
      clusterContext.fillRect(3, 3, clusterSize - 6, clusterSize - 6)
      clusterContext.fillStyle = '#c24318'
      clusterContext.fillRect(3, 3, 12, 5)
      map.addImage(
        'cluster-stamp',
        { width: clusterSize, height: clusterSize, data: clusterContext.getImageData(0, 0, clusterSize, clusterSize).data },
        { pixelRatio: 2 },
      )

      map.addSource('hotspots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 9,
      })
      map.addLayer({
        id: 'clusters',
        type: 'symbol',
        source: 'hotspots',
        filter: ['has', 'point_count'],
        layout: {
          'icon-image': 'cluster-stamp',
          'icon-size': ['step', ['get', 'point_count'], 1.2, 100, 1.4, 1000, 1.65],
          'icon-allow-overlap': true,
          'text-field': clusterCountLabel(),
          'text-font': ['Noto Sans Regular'],
          'text-size': ['step', ['get', 'point_count'], 9.5, 100, 10.5, 1000, 11.5],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#f5f0e4',
          'text-halo-color': '#191811',
          'text-halo-width': 0.8,
        },
      })
      map.addLayer({
        id: 'hotspots',
        type: 'circle',
        source: 'hotspots',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'confidence'],
            'high',
            CONFIDENCE_META.high.color,
            'nominal',
            CONFIDENCE_META.nominal.color,
            CONFIDENCE_META.low.color,
          ],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'frp'],
            0,
            3.6,
            25,
            4.8,
            50,
            6,
            100,
            7.6,
            250,
            9.5,
          ],
          'circle-stroke-color': '#f5f0e4',
          'circle-stroke-width': 0.9,
          'circle-opacity': 0.95,
        },
      })

      map.addSource('selected-point', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'selected-halo',
        type: 'circle',
        source: 'selected-point',
        paint: {
          'circle-radius': 18,
          'circle-color': 'rgba(194, 67, 24, 0.14)',
          'circle-stroke-width': 0,
        },
      })
      map.addLayer({
        id: 'selected-ring',
        type: 'circle',
        source: 'selected-point',
        paint: {
          'circle-radius': 12,
          'circle-color': 'rgba(0, 0, 0, 0)',
          'circle-stroke-color': '#c24318',
          'circle-stroke-width': 2,
        },
      })

      map.on('mousemove', handleMove)
      map.on('mouseout', handleLeave)
      map.on('click', handleClick)
      setMapReady(true)
    })

    return () => {
      cancelled = true
      resizeObserver.disconnect()
      map.off('mousemove', handleMove)
      map.off('mouseout', handleLeave)
      map.off('click', handleClick)
      map.off('moveend', constrainToIndonesia)
      popup.remove()
      map.remove()
      mapRef.current = null
      popupRef.current = null
      hoverKeyRef.current = null
      hoverProvinceIdRef.current = null
      appliedImageryDateRef.current = null
      setMapReady(false)
      setImageryLoading(false)
    }
    // The map instance is created once; live data flows through sources in effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapReady) return
    const source = mapRef.current?.getSource('hotspots') as GeoJSONSource | undefined
    source?.setData(hotspotData)
  }, [mapReady, hotspotData])

  useEffect(() => {
    if (!mapReady) return
    const source = mapRef.current?.getSource('selected-point') as GeoJSONSource | undefined
    const data: FeatureCollection<Point> = selected
      ? {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [selected.lon, selected.lat] },
              properties: { id: selected.id },
            },
          ],
        }
      : { type: 'FeatureCollection', features: [] }
    source?.setData(data)
  }, [mapReady, selected])

  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return
    const source = map.getSource('province-active') as GeoJSONSource | undefined
    const features = activeProvince
      ? PROVINCE_GEOJSON.features.filter(
          (feature) => feature.properties.PROVINSI === activeProvince,
        )
      : []
    source?.setData({
      type: 'FeatureCollection',
      features,
    } as unknown as FeatureCollection)

    fitScope(map, activeProvince, firstFitRef.current ? 0 : 850)
    firstFitRef.current = false
  }, [mapReady, activeProvince])

  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return
    const satellite = basemap === 'satellite'
    map.setLayoutProperty('base-satellite', 'visibility', satellite ? 'visible' : 'none')
    map.setLayoutProperty('base-light', 'visibility', satellite ? 'none' : 'visible')
    map.setLayoutProperty('base-light-ref', 'visibility', satellite ? 'none' : 'visible')
    map.setLayoutProperty('province-labels', 'visibility', satellite ? 'visible' : 'none')
    map.setPaintProperty('province-labels', 'text-color', satellite ? '#f5f0e4' : '#191811')
    map.setPaintProperty('province-labels', 'text-halo-color', satellite ? '#191811' : '#f5f0e4')
    map.setPaintProperty('province-line-casing', 'line-color', satellite ? '#f5f0e4' : '#191811')
    map.setPaintProperty('province-line-casing', 'line-opacity', satellite ? 0.28 : 0.18)
    map.setPaintProperty('province-line', 'line-color', '#191811')
    map.setPaintProperty('province-line', 'line-opacity', satellite ? 0.5 : 0.42)
  }, [mapReady, basemap])

  useEffect(() => {
    if (!mapReady) return
    if (appliedImageryDateRef.current === imageryDate) {
      setImageryLoading(false)
      return
    }
    const source = mapRef.current?.getSource('base-satellite') as RasterTileSource | undefined
    if (!source) return

    if (basemap !== 'satellite') {
      source.setTiles([satelliteTiles(imageryDate)])
      appliedImageryDateRef.current = imageryDate
      return
    }

    let cancelled = false
    setImageryLoading(true)
    void Promise.all(imageryTileUrls(imageryDate).map((url) => preloadImage(url))).then(() => {
      if (cancelled) return
      source.setTiles([satelliteTiles(imageryDate)])
      appliedImageryDateRef.current = imageryDate
      setImageryLoading(false)
    })
    return () => {
      cancelled = true
      setImageryLoading(false)
    }
  }, [mapReady, imageryDate, basemap])

  useEffect(() => {
    if (dateSignal === 0) return
    setDateOpen(true)
  }, [dateSignal])

  useEffect(() => {
    if (!datePending) return
    if (controlsOpen) {
      setDatePending(false)
      return
    }
    // Let the sheet close animation finish before opening the anchored popover.
    const timeout = window.setTimeout(() => {
      setDatePending(false)
      setDateOpen(true)
    }, 320)
    return () => window.clearTimeout(timeout)
  }, [datePending, controlsOpen])

  useEffect(() => {
    if (!mapReady || !selected) return
    const map = mapRef.current
    if (!map) return
    map.flyTo({
      center: [selected.lon, selected.lat],
      zoom: Math.max(map.getZoom(), 9.6),
      duration: 900,
      essential: true,
    })
    // Only refly when a different detection is selected, not on data refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, selected?.id])

  useEffect(() => {
    if (!mapReady || focusSignal === 0 || !selected) return
    const map = mapRef.current
    if (!map) return
    map.flyTo({
      center: [selected.lon, selected.lat],
      zoom: Math.max(map.getZoom(), 10.4),
      duration: 700,
      essential: true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal])

  function resetView() {
    const map = mapRef.current
    if (!map) return
    fitScope(map, activeProvince, 700)
  }

  function chooseDay(day: string | null) {
    onDayChange(day)
    if (day) setBasemap('satellite')
    setDateOpen(false)
  }

  const hasPoints = hotspots.length > 0
  const showErrorOverlay = Boolean(error) && !hasPoints && !loading

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-rule bg-paper px-2.5 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden h-6 w-6 shrink-0 items-center justify-center border border-ink bg-ink text-paper sm:flex">
            <MapIcon className="h-3 w-3" />
          </span>
          <div className="min-w-0">
            <div className="hidden font-mono text-[7px] uppercase tracking-[0.15em] text-muted-foreground sm:block">
              Peta sebaran
            </div>
            <div className="truncate font-sans text-[11px] font-semibold leading-tight text-ink">
              {activeProvince ?? 'Indonesia'}
            </div>
          </div>
          <span
            aria-live="polite"
            className="hidden shrink-0 border border-rule px-1.5 py-0.5 font-mono text-[8px] tabular-nums text-ink-soft sm:inline"
          >
            {formatNumber(hotspots.length)} titik
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden shrink-0 items-center gap-1 text-muted-foreground md:inline-flex">
                <Lock className="h-2.5 w-2.5" />
                <span className="font-mono text-[7.5px] uppercase tracking-[0.08em]">Terkunci</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Peta terkunci di Indonesia · zoom tetap aktif
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 gap-1.5 px-2 font-mono text-[8px] uppercase tracking-[0.06em] sm:h-7 sm:px-1.5',
                  selectedDay &&
                    'border-ember bg-ember/[0.07] text-ember hover:bg-ember/[0.12] hover:text-ember',
                )}
                aria-label={
                  selectedDay
                    ? `Tanggal data ${formatWibDayKeyLong(selectedDay)}. Ganti tanggal`
                    : 'Pilih tanggal data dan citra'
                }
                aria-pressed={selectedDay !== null}
              >
                <CalendarDays className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {selectedDay ? formatWibDayKeyShort(selectedDay) : 'Tanggal'}
                </span>
                {selectedDay ? <span className="h-1 w-1 bg-ember" aria-hidden="true" /> : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-72 p-0">
              <div className="flex items-start justify-between gap-3 border-b border-rule px-3 py-2">
                <div>
                  <div className="micro-label text-ember">Tanggal data</div>
                  <div className="mt-0.5 text-[11px] font-medium text-ink">
                    Hari pengamatan · WIB
                  </div>
                </div>
                <span className="mt-0.5 border border-rule px-1 py-0.5 font-mono text-[7px] uppercase tracking-[0.06em] text-muted-foreground">
                  UTC+7
                </span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => chooseDay(null)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 border-b border-rule px-3 py-2 text-left transition-colors',
                    selectedDay === null ? 'bg-ink text-paper' : 'hover:bg-sand',
                  )}
                >
                  <span>
                    <span className="block text-[11px] font-medium leading-tight">Periode aktif</span>
                    <span
                      className={cn(
                        'mt-0.5 block font-mono text-[8px] uppercase tracking-[0.06em]',
                        selectedDay === null ? 'text-paper/55' : 'text-muted-foreground',
                      )}
                    >
                      {periodLabel} · bergulir
                    </span>
                  </span>
                  {selectedDay === null ? <Check className="h-3 w-3 shrink-0" /> : null}
                </button>
                {dayOptions.map((item) => {
                  const active = item.key === selectedDay
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => chooseDay(item.key)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 border-b border-rule/60 px-3 py-2 text-left transition-colors last:border-b-0',
                        active ? 'bg-ink text-paper' : 'hover:bg-sand',
                      )}
                    >
                      <span>
                        <span className="block text-[11px] font-medium leading-tight">
                          {item.relative}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 block font-mono text-[8px] uppercase tracking-[0.06em]',
                            active ? 'text-paper/55' : 'text-muted-foreground',
                          )}
                        >
                          {item.full} · WIB
                        </span>
                      </span>
                      {active ? <Check className="h-3 w-3 shrink-0" /> : null}
                    </button>
                  )
                })}
              </div>
              <p className="border-t border-rule px-3 py-2 text-[9.5px] leading-relaxed text-muted-foreground">
                Deteksi dimuat untuk 00.00–23.59 WIB. Citra satelit memakai komposit UTC terdekat
                dari NASA GIBS; awan dan asap dapat menutup sebagian wilayah.
              </p>
            </PopoverContent>
          </Popover>

          <div className="hidden overflow-hidden border border-rule md:flex" role="group" aria-label="Jenis peta dasar">
            <button
              type="button"
              onClick={() => setBasemap('satellite')}
              aria-pressed={basemap === 'satellite'}
              className={cn(
                'flex h-7 items-center gap-1 px-1.5 font-mono text-[8px] uppercase tracking-[0.04em] transition-colors',
                basemap === 'satellite'
                  ? 'bg-ink text-paper'
                  : 'text-ink-soft hover:bg-sand',
              )}
            >
              <Satellite className="h-3 w-3" />
              <span className="hidden lg:inline">Satelit</span>
            </button>
            <button
              type="button"
              onClick={() => setBasemap('light')}
              aria-pressed={basemap === 'light'}
              className={cn(
                'flex h-7 items-center gap-1 border-l border-rule px-1.5 font-mono text-[8px] uppercase tracking-[0.04em] transition-colors',
                basemap === 'light' ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-sand',
              )}
            >
              <MapIcon className="h-3 w-3" />
              <span className="hidden lg:inline">Peta</span>
            </button>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLegendOpen((value) => !value)}
                aria-pressed={legendOpen}
                aria-label={legendOpen ? 'Sembunyikan legenda peta' : 'Tampilkan legenda peta'}
                className={cn(
                  'hidden h-7 gap-1.5 px-1.5 font-mono text-[8px] uppercase tracking-[0.05em] md:inline-flex',
                  legendOpen && 'border-ink bg-ink text-paper hover:bg-ink hover:text-paper',
                )}
              >
                <Layers className="h-3 w-3" />
                <span className="hidden lg:inline">Legenda</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {legendOpen ? 'Sembunyikan legenda' : 'Tampilkan legenda'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hidden h-7 w-7 md:inline-flex"
                onClick={resetView}
                aria-label="Reset tampilan peta"
              >
                <Frame className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reset tampilan peta</TooltipContent>
          </Tooltip>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setControlsOpen(true)}
            aria-label="Buka pengaturan tampilan peta"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex h-7 shrink-0 items-center gap-1.5 overflow-hidden border-b border-rule bg-paper-raised px-2.5 font-mono text-[7.5px] uppercase tracking-[0.05em] text-muted-foreground sm:px-3">
        <span className="micro-label shrink-0 text-ember">Aktif</span>
        <span className="shrink-0 text-ink-soft">{filterContext.period}</span>
        <span className="shrink-0 text-rule-strong">·</span>
        <span className="shrink-0 text-ink-soft">≥{filters.minFrp} MW</span>
        <span className="hidden shrink-0 text-rule-strong sm:inline">·</span>
        <span className="hidden truncate text-ink-soft sm:inline">{filterContext.confidence}</span>
        <span className="hidden shrink-0 text-rule-strong lg:inline">·</span>
        <span className="hidden shrink-0 text-ink-soft lg:inline">{filterContext.satellite}</span>
        {!isDefaultFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="ml-auto shrink-0 border border-ember/40 px-1.5 py-0.5 text-[7.5px] uppercase tracking-[0.08em] text-ember transition-colors hover:border-ember hover:bg-ember hover:text-paper"
          >
            Reset filter
          </button>
        ) : (
          <span className="ml-auto hidden shrink-0 text-[7px] text-muted-foreground/70 md:inline">
            Filter standar
          </span>
        )}
      </div>

      {error && hotspots.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-ember/40 bg-ember/[0.07] px-3 py-1.5">
          <AlertTriangle className="h-3 w-3 shrink-0 text-ember" />
          <p className="min-w-0 flex-1 truncate font-mono text-[8px] uppercase tracking-[0.05em] text-ink-soft">
            Penyegaran gagal · menampilkan data terakhir
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 font-mono text-[8px] uppercase tracking-[0.08em] text-ember underline-offset-2 hover:underline"
          >
            Coba lagi
          </button>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="h-full w-full"
          role="application"
          aria-label="Peta sebaran titik panas karhutla Indonesia"
        />

        <div className="pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_0_0_1px_rgba(25,24,17,0.16)]" />

        {loading ? <div className="is-loading-stripe absolute inset-x-0 top-0 z-20 h-[2px]" /> : null}

        {imageryLoading && basemap === 'satellite' ? (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute left-1/2 top-2.5 z-20 flex -translate-x-1/2 items-center gap-1.5 border border-ink bg-paper-raised px-2 py-1 hard-shadow"
          >
            <LoaderCircle className="h-3 w-3 animate-spin text-ember" />
            <span className="whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.08em] text-ink-soft">
              Memuat citra {formatImageryDateShort(imageryDate)}
            </span>
          </div>
        ) : null}

        {activeProvince ? (
          <div className="absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-1.25rem)] items-center gap-2 border border-ink bg-paper-raised px-2.5 py-1.5 hard-shadow">
            <span className="micro-label shrink-0 text-muted-foreground">Fokus</span>
            <span className="min-w-0 truncate text-[11px] font-semibold leading-tight text-ink">
              {activeProvince}
            </span>
            <button
              type="button"
              onClick={() => onProvinceClick(activeProvince)}
              aria-label="Hapus fokus provinsi"
              className="shrink-0 p-0.5 text-ink-soft transition-colors hover:bg-ink hover:text-paper"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}

        {legendOpen ? (
          <div
            role="region"
            aria-label="Legenda peta"
            className="legend-pop absolute bottom-2.5 left-2.5 z-10 w-[196px] border border-ink bg-paper-raised hard-shadow"
          >
            <div className="flex items-center justify-between border-b border-rule pl-2.5 pr-1">
              <span className="micro-label text-ink">Legenda</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-muted-foreground">
                  VIIRS 375 m
                </span>
                <button
                  type="button"
                  onClick={() => setLegendOpen(false)}
                  aria-label="Tutup legenda"
                  className="flex h-5 w-5 items-center justify-center text-ink-soft transition-colors hover:bg-ink hover:text-paper"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="p-2.5">
              <LegendContent />
            </div>
          </div>
        ) : null}

        {!legendOpen ? (
          <button
            type="button"
            onClick={() => setLegendOpen(true)}
            aria-label="Buka legenda peta"
            className="absolute bottom-2.5 left-2.5 z-10 hidden items-center gap-2 border border-ink bg-paper-raised px-2 py-1.5 hard-shadow transition-colors hover:bg-sand sm:flex"
          >
            <span className="micro-label text-muted-foreground">Keyakinan</span>
            {Object.values(CONFIDENCE_META).map((entry) => (
              <span
                key={entry.label}
                className="flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-[0.04em] text-ink-soft"
              >
                <span className="h-1.5 w-1.5" style={{ backgroundColor: entry.color }} />
                {entry.label}
              </span>
            ))}
            <Layers className="h-3 w-3 text-muted-foreground" />
          </button>
        ) : null}

        <div className="absolute bottom-2.5 right-2.5 z-10 hidden flex-col overflow-hidden border border-ink bg-paper-raised hard-shadow md:flex">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Perbesar peta"
            className="flex h-7 w-7 items-center justify-center border-b border-rule text-ink-soft transition-colors hover:bg-ink hover:text-paper"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Perkecil peta"
            className="flex h-7 w-7 items-center justify-center text-ink-soft transition-colors hover:bg-ink hover:text-paper"
          >
            <Minus className="h-3 w-3" />
          </button>
        </div>

        {showErrorOverlay ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-paper/30 px-5">
            <div className="w-full max-w-[280px] border border-ink bg-paper-raised p-4 hard-shadow-lg">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-ember" />
                <span className="micro-label text-ember">Koneksi terputus</span>
              </div>
              <p className="mt-2 font-display text-[24px] italic leading-none text-ink">
                Data tidak tersedia.
              </p>
              <p className="mt-2 text-[10.5px] leading-relaxed text-ink-soft">{error}</p>
              <Button
                variant="ember"
                size="sm"
                className="mt-3 w-full font-mono text-[8.5px] uppercase tracking-[0.08em]"
                onClick={onRetry}
              >
                <RefreshCw className="h-3 w-3" />
                Coba muat ulang
              </Button>
            </div>
          </div>
        ) : null}

        {loading && !hasPoints && !error ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 border border-ink bg-paper-raised px-3 py-2 hard-shadow">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-ember" />
              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-soft">
                Menarik arsip VIIRS
              </span>
            </div>
          </div>
        ) : null}

        {!loading && !error && !hasPoints ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-5">
            <div className="pointer-events-auto max-w-[280px] border border-ink bg-paper-raised px-4 py-3 text-center hard-shadow">
              <div className="micro-label text-ember">
                {selectedDay ? 'Hari kosong' : 'Filter kosong'}
              </div>
              <p className="mt-1.5 font-display text-[23px] italic leading-tight text-ink">
                {selectedDay
                  ? `Tidak ada titik pada ${formatWibDayKeyShort(selectedDay)}.`
                  : 'Tidak ada titik panas.'}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                {selectedDay
                  ? 'Coba tanggal lain, longgarkan filter, atau kembali ke periode aktif.'
                  : 'Longgarkan periode, keyakinan, atau ambang FRP untuk memperluas pencarian.'}
              </p>
              {selectedDay ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2.5 w-full gap-1.5 font-mono text-[8px] uppercase tracking-[0.08em]"
                  onClick={() => onDayChange(null)}
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Kembali ke periode
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex h-8 shrink-0 items-center gap-1.5 overflow-hidden border-t border-rule bg-paper-raised px-2.5 font-mono text-[7.5px] uppercase tracking-[0.05em] text-muted-foreground sm:px-3">
        <span className="flex shrink-0 items-center gap-1 sm:hidden">
          <a
            href="https://firms.modaps.eosdis.nasa.gov/"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ember hover:underline"
          >
            FIRMS
          </a>
          <span>·</span>
          <a
            href="https://nasa.github.io/GIBS/"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ember hover:underline"
          >
            GIBS
          </a>
        </span>
        <span className="hidden shrink-0 items-center gap-1 sm:flex">
          <span>Data</span>
          <a
            href="https://firms.modaps.eosdis.nasa.gov/"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ember hover:underline"
          >
            NASA FIRMS
          </a>
          <span>·</span>
          <a
            href="https://nasa.github.io/GIBS/"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ember hover:underline"
          >
            NASA GIBS
          </a>
          {basemap === 'light' ? (
            <>
              <span>·</span>
              <a
                href="https://www.esri.com/en-us/legal/copyright-trademarks"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-ember hover:underline"
              >
                ESRI · OSM
              </a>
            </>
          ) : null}
        </span>
        <span className="hidden xl:inline">· Batas provinsi: Deny Herianto</span>
        <span className="ml-auto flex shrink-0 items-center gap-1 border border-rule px-1.5 py-0.5 text-ink-soft">
          {basemap === 'satellite' ? (
            <>
              {imageryLoading ? (
                <LoaderCircle className="h-2.5 w-2.5 animate-spin text-ember" />
              ) : (
                <Satellite className="h-2.5 w-2.5" />
              )}
              <span className="tabular-nums">Citra {formatImageryDateShort(imageryDate)}</span>
              <span className="hidden sm:inline">· NOAA-20</span>
            </>
          ) : (
            <>
              <MapIcon className="h-2.5 w-2.5" />
              <span>Peta dasar · Esri</span>
            </>
          )}
        </span>
        <span className="hidden shrink-0 tabular-nums md:inline">
          <span ref={coordRef}>Kursor —</span>
        </span>
      </div>

      <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[78svh] gap-0 overflow-y-auto border-t-2 border-ember p-0"
        >
          <div className="flex h-12 items-center border-b border-rule bg-paper-raised pl-4 pr-14">
            <SheetTitle className="micro-label text-ink">Tampilan peta</SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Atur peta dasar, legenda, tanggal citra, dan posisi peta.
          </SheetDescription>
          <div className="space-y-4 p-4">
            <div>
              <div className="micro-label mb-2 text-muted-foreground">Peta dasar</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBasemap('satellite')}
                  aria-pressed={basemap === 'satellite'}
                  className={cn(
                    'flex items-center gap-2 border px-2.5 py-2 text-left transition-colors',
                    basemap === 'satellite'
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule text-ink-soft hover:border-ink hover:bg-sand/60',
                  )}
                >
                  <Satellite className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium leading-tight">Satelit</span>
                    <span
                      className={cn(
                        'mt-0.5 block font-mono text-[7.5px] uppercase tracking-[0.06em]',
                        basemap === 'satellite' ? 'text-paper/55' : 'text-muted-foreground',
                      )}
                    >
                      Citra NOAA-20
                    </span>
                  </span>
                  {basemap === 'satellite' ? <Check className="h-3 w-3 shrink-0" /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => setBasemap('light')}
                  aria-pressed={basemap === 'light'}
                  className={cn(
                    'flex items-center gap-2 border px-2.5 py-2 text-left transition-colors',
                    basemap === 'light'
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule text-ink-soft hover:border-ink hover:bg-sand/60',
                  )}
                >
                  <MapIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium leading-tight">Peta</span>
                    <span
                      className={cn(
                        'mt-0.5 block font-mono text-[7.5px] uppercase tracking-[0.06em]',
                        basemap === 'light' ? 'text-paper/55' : 'text-muted-foreground',
                      )}
                    >
                      Esri Light Gray
                    </span>
                  </span>
                  {basemap === 'light' ? <Check className="h-3 w-3 shrink-0" /> : null}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-rule pt-3">
              <div>
                <div className="text-[11px] font-medium text-ink">Legenda peta</div>
                <div className="mt-0.5 text-[9.5px] text-muted-foreground">
                  Keyakinan & intensitas FRP
                </div>
              </div>
              <Button
                variant={legendOpen ? 'default' : 'outline'}
                size="sm"
                className="font-mono text-[8px] uppercase tracking-[0.08em]"
                onClick={() => setLegendOpen((value) => !value)}
              >
                {legendOpen ? 'Sembunyikan' : 'Tampilkan'}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-rule pt-3">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-ink">Posisi peta</div>
                <div className="mt-0.5 truncate text-[9.5px] text-muted-foreground">
                  {activeProvince ?? 'Indonesia'}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 font-mono text-[8px] uppercase tracking-[0.08em]"
                onClick={resetView}
              >
                <Frame className="h-3 w-3" />
                Reset
              </Button>
            </div>

            <div className="border-t border-rule pt-3">
              <div className="micro-label mb-2 text-muted-foreground">Tanggal data & citra</div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Citra {formatImageryDateShort(imageryDate)} · NOAA-20. Tanggal data mengikuti pilihan
                harian pada peta.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full justify-between font-mono text-[8px] uppercase tracking-[0.08em]"
                onClick={() => {
                  setControlsOpen(false)
                  setDatePending(true)
                }}
              >
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" />
                  Pilih tanggal
                </span>
                <span className="text-muted-foreground">
                  {selectedDay ? formatWibDayKeyShort(selectedDay) : 'Periode aktif'}
                </span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
