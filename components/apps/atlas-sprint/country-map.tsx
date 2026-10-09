"use client"

import * as React from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useTheme } from "next-themes"
import type { FeatureCollection } from "geojson"
import { COUNTRIES, normalizeCountry, type Continent } from "./countries"

type Region = "World" | Continent

interface CountryMapProps {
  region: Region
  guessed: string[]
  revealRemaining?: boolean
  focusOnGuess?: boolean
}

const NAME_OVERRIDES: Record<string, string> = {
  "United Republic of Tanzania": "Tanzania",
  "Republic of Serbia": "Serbia",
  "East Timor": "Timor-Leste",
  eSwatini: "Eswatini",
  "United States of America": "United States",
  "The Bahamas": "Bahamas",
  Vatican: "Holy See",
  "São Tomé and Principe": "Sao Tome and Principe",
  "Federated States of Micronesia": "Micronesia",
}

const REGION_BOUNDS: Record<Region, [[number, number], [number, number]]> = {
  World: [[-179, -58], [179, 82]],
  Africa: [[-20, -36], [55, 38]],
  Asia: [[24, -12], [180, 82]],
  Europe: [[-26, 34], [46, 72]],
  "North America": [[-171, 5], [-50, 84]],
  "South America": [[-83, -57], [-33, 14]],
  Oceania: [[108, -50], [180, 10]],
}

const quizCountryByName = new Map(COUNTRIES.map((country) => [normalizeCountry(country.name), country]))

function quizNameForMapName(mapName: string) {
  const mapped = NAME_OVERRIDES[mapName] ?? mapName
  return quizCountryByName.get(normalizeCountry(mapped))?.name
}

export function CountryMap({ region, guessed, revealRemaining = false, focusOnGuess = false }: CountryMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<maplibregl.Map | null>(null)
  const dataRef = React.useRef<FeatureCollection | null>(null)
  const labelMarkersRef = React.useRef<maplibregl.Marker[]>([])
  const previousGuessesRef = React.useRef(guessed.length)
  const returnTimerRef = React.useRef<number | null>(null)
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    if (!containerRef.current) return
    const dark = resolvedTheme === "dark"
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "background", type: "background", paint: { "background-color": dark ? "#020817" : "#ffffff" } }],
      },
      bounds: REGION_BOUNDS[region],
      fitBoundsOptions: { padding: 16 },
      attributionControl: false,
      renderWorldCopies: false,
      dragRotate: false,
      pitchWithRotate: false,
      maxPitch: 0,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 })
    map.on("load", async () => {
      const response = await fetch("/data/countries.geojson")
      const data = await response.json() as FeatureCollection
      dataRef.current = data
      map.addSource("countries", { type: "geojson", data })
      map.addLayer({
        id: "countries-fill",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": ["match", ["get", "quizStatus"], "guessed", "#0ea5e9", "remaining", dark ? "#1e293b" : "#e2e8f0", dark ? "#0f172a" : "#f8fafc"],
          "fill-opacity": ["match", ["get", "quizStatus"], "outside", 0.35, 0.9],
        },
      })
      map.addLayer({ id: "countries-line", type: "line", source: "countries", paint: { "line-color": dark ? "#475569" : "#94a3b8", "line-width": 0.7 } })
      updateMapData(map, data, region, guessed, revealRemaining)
      updateMapLabels(map, data, region, guessed, revealRemaining, labelMarkersRef.current)
    })

    const showCountryStatus = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      const mapName = feature?.properties?.name as string | undefined
      const quizName = mapName ? quizNameForMapName(mapName) : undefined
      if (!feature || !event.lngLat || !quizName) return
      const isVisible = feature.properties?.quizStatus === "guessed" || feature.properties?.revealRemaining
      popup.setLngLat(event.lngLat).setText(isVisible ? quizName : "Not guessed yet").addTo(map)
    }
    map.on("mousemove", "countries-fill", (event) => { map.getCanvas().style.cursor = "pointer"; showCountryStatus(event) })
    map.on("click", "countries-fill", showCountryStatus)
    map.on("mouseleave", "countries-fill", () => { map.getCanvas().style.cursor = ""; popup.remove() })

    return () => {
      if (returnTimerRef.current) window.clearTimeout(returnTimerRef.current)
      labelMarkersRef.current.forEach((marker) => marker.remove())
      labelMarkersRef.current = []
      popup.remove(); map.remove(); mapRef.current = null
    }
  }, [resolvedTheme])

  React.useEffect(() => {
    const map = mapRef.current
    const data = dataRef.current
    if (!map || !data || !map.isStyleLoaded()) return
    updateMapData(map, data, region, guessed, revealRemaining)
    updateMapLabels(map, data, region, guessed, revealRemaining, labelMarkersRef.current)
  }, [region, guessed, revealRemaining])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !dataRef.current || !map.isStyleLoaded()) return
    map.fitBounds(REGION_BOUNDS[region], { padding: 16, duration: 600 })
  }, [region])

  React.useEffect(() => {
    const previousCount = previousGuessesRef.current
    previousGuessesRef.current = guessed.length
    if (!focusOnGuess || guessed.length <= previousCount) return
    const map = mapRef.current
    const data = dataRef.current
    const newestGuess = guessed[guessed.length - 1]
    if (!map || !data || !newestGuess) return
    const feature = data.features.find((item) => quizNameForMapName(String(item.properties?.name ?? "")) === newestGuess)
    const center = feature ? getFeatureCenter(feature) : null
    if (!center) return
    if (returnTimerRef.current) window.clearTimeout(returnTimerRef.current)
    map.easeTo({ center, zoom: Math.min(4.2, map.getZoom() + 1.35), duration: 500 })
    returnTimerRef.current = window.setTimeout(() => {
      map.fitBounds(REGION_BOUNDS[region], { padding: 16, duration: 600 })
    }, 1250)
  }, [focusOnGuess, guessed, region])

  return <div ref={containerRef} className="mx-auto h-[300px] w-full max-w-5xl overflow-hidden rounded-md border sm:h-auto sm:aspect-[2/1]" role="img" aria-label={`Interactive map of ${region}. Guessed countries are highlighted.`} />
}

function getFeatureCenter(feature: FeatureCollection["features"][number]): [number, number] | null {
  if (!feature.geometry) return null
  const rings = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates[0]]
    : feature.geometry.type === "MultiPolygon"
      ? feature.geometry.coordinates.map((polygon) => polygon[0])
      : []
  if (!rings.length) return null

  const candidates = rings.map(getRingCentroid).filter((candidate): candidate is { center: [number, number]; area: number } => candidate !== null)
  if (!candidates.length) return null
  return candidates.reduce((largest, candidate) => candidate.area > largest.area ? candidate : largest).center
}

function getRingCentroid(ring: number[][]): { center: [number, number]; area: number } | null {
  if (ring.length < 3) return null
  const rawLongitudes = ring.map(([longitude]) => longitude)
  const crossesDateLine = Math.max(...rawLongitudes) - Math.min(...rawLongitudes) > 180
  const points = ring.map(([longitude, latitude]) => [crossesDateLine && longitude < 0 ? longitude + 360 : longitude, latitude] as [number, number])
  let signedArea = 0
  let longitudeTotal = 0
  let latitudeTotal = 0

  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1] = points[index]
    const [x2, y2] = points[index + 1]
    const cross = x1 * y2 - x2 * y1
    signedArea += cross
    longitudeTotal += (x1 + x2) * cross
    latitudeTotal += (y1 + y2) * cross
  }

  signedArea /= 2
  if (Math.abs(signedArea) < 0.000001) return null
  let longitude = longitudeTotal / (6 * signedArea)
  if (longitude > 180) longitude -= 360
  return { center: [longitude, latitudeTotal / (6 * signedArea)], area: Math.abs(signedArea) }
}

function updateMapData(map: maplibregl.Map, original: FeatureCollection, region: Region, guessed: string[], revealRemaining: boolean) {
  const guessedSet = new Set(guessed)
  const data = structuredClone(original)
  for (const feature of data.features) {
    const mapName = feature.properties?.name as string | undefined
    const quizName = mapName ? quizNameForMapName(mapName) : undefined
    const country = quizName ? quizCountryByName.get(normalizeCountry(quizName)) : undefined
    const inQuiz = !!country && (region === "World" || country.continent === region)
    feature.properties = {
      ...feature.properties,
      quizStatus: !inQuiz ? "outside" : guessedSet.has(quizName!) ? "guessed" : "remaining",
      revealRemaining,
    }
  }
  const source = map.getSource("countries") as maplibregl.GeoJSONSource | undefined
  source?.setData(data)
}

function updateMapLabels(map: maplibregl.Map, data: FeatureCollection, region: Region, guessed: string[], revealRemaining: boolean, markers: maplibregl.Marker[]) {
  markers.forEach((marker) => marker.remove())
  markers.length = 0
  const guessedSet = new Set(guessed)

  for (const feature of data.features) {
    const mapName = String(feature.properties?.name ?? "")
    const quizName = quizNameForMapName(mapName)
    const country = quizName ? quizCountryByName.get(normalizeCountry(quizName)) : undefined
    if (!quizName || !country || (region !== "World" && country.continent !== region)) continue
    const center = getFeatureCenter(feature)
    if (!center) continue

    const showName = guessedSet.has(quizName) || revealRemaining
    const element = document.createElement("div")
    if (showName) {
      element.textContent = quizName
      element.className = "max-w-24 truncate whitespace-nowrap rounded border bg-background/90 px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground shadow-sm"
      element.setAttribute("aria-label", quizName)
    } else {
      element.className = "h-2.5 w-5 rounded-sm border border-muted-foreground bg-background/80 shadow-sm"
      element.setAttribute("aria-label", "Unguessed country location")
    }
    const anchor = center[0] > 150 ? "right" : center[0] < -150 ? "left" : "center"
    const marker = new maplibregl.Marker({ element, anchor }).setLngLat(center).addTo(map)
    element.tabIndex = -1
    element.setAttribute("aria-hidden", "true")
    element.setAttribute("role", "presentation")
    markers.push(marker)
  }
}
