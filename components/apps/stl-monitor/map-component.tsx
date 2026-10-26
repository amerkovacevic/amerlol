"use client"

import * as React from "react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { CATEGORY_COLORS, CATEGORY_ICONS, STL_BOUNDS, type Incident } from "./types"

interface MapComponentProps {
  mapStyle: "dark" | "light"
  incidents: Incident[]
  onIncidentClick: (incident: Incident) => void
  selectedIncident: Incident | null
  replayMode: boolean
}

const NEW_INCIDENT_MS = 5 * 60 * 1000
const { west, south, east, north } = STL_BOUNDS.bounds

function createMapStyle(isDark: boolean): maplibregl.StyleSpecification {
  const style = isDark ? "dark_all" : "light_all"
  return {
    version: 8,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: ["a", "b", "c"].map(
          (host) => `https://${host}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`
        ),
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [{ id: "osm-tiles", type: "raster", source: "osm-tiles", minzoom: 0, maxzoom: 19 }],
  }
}

/** Dashed outline of the monitored area; styles are replaced on theme change, so it is re-added. */
function addBoundary(map: maplibregl.Map, isDark: boolean) {
  if (map.getSource("stl-boundary")) return
  map.addSource("stl-boundary", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
    },
  })
  map.addLayer({
    id: "stl-boundary-line",
    type: "line",
    source: "stl-boundary",
    paint: {
      "line-color": isDark ? "#3b82f6" : "#2563eb",
      "line-width": 2,
      "line-opacity": 0.3,
      "line-dasharray": [4, 2],
    },
  })
}

/** Severity 0–100 maps to a 28–40px marker. */
const markerSize = (severity: number) => Math.floor(28 + (severity / 100) * 12)

function createMarkerElement(incident: Incident, ping: boolean): HTMLElement {
  const color = CATEGORY_COLORS[incident.category]
  const size = markerSize(incident.severity)

  const wrapper = document.createElement("button")
  wrapper.type = "button"
  wrapper.className = incident.simulated ? "stl-marker stl-marker-simulated" : "stl-marker"
  wrapper.setAttribute("aria-label", incident.simulated ? `Simulated: ${incident.title}` : incident.title)
  wrapper.style.setProperty("--marker-size", `${size}px`)
  wrapper.style.setProperty("--marker-color", color)

  const ring = document.createElement("span")
  ring.className = ping ? "stl-marker-ring stl-marker-ping" : "stl-marker-ring"

  const circle = document.createElement("span")
  circle.className = "stl-marker-circle"
  circle.textContent = CATEGORY_ICONS[incident.category]

  wrapper.append(ring, circle)
  return wrapper
}

export default function MapComponent({
  mapStyle,
  incidents,
  onIncidentClick,
  selectedIncident,
  replayMode,
}: MapComponentProps) {
  const container = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<maplibregl.Map | null>(null)
  const markers = React.useRef(new Map<string, maplibregl.Marker>())
  const previousView = React.useRef<{ center: [number, number]; zoom: number } | null>(null)
  const isDark = mapStyle === "dark"
  // The style the map currently shows; the map is created once and restyled in place.
  const appliedDark = React.useRef(isDark)
  // Marker click handlers look incidents up here so they always open the latest data.
  const latestIncidents = React.useRef(new Map<string, Incident>())
  const latestOnClick = React.useRef(onIncidentClick)

  React.useLayoutEffect(() => {
    latestIncidents.current = new Map(incidents.map((incident) => [incident.id, incident]))
    latestOnClick.current = onIncidentClick
  })

  React.useEffect(() => {
    if (!container.current) return
    const markerMap = markers.current
    const map = new maplibregl.Map({
      container: container.current,
      style: createMapStyle(appliedDark.current),
      center: [STL_BOUNDS.center.lng, STL_BOUNDS.center.lat],
      zoom: STL_BOUNDS.zoom,
      minZoom: 9,
      maxZoom: 16,
      maxBounds: [
        [west, south],
        [east, north],
      ],
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), "top-left")
    map.addControl(new maplibregl.ScaleControl(), "bottom-left")
    map.on("load", () => {
      addBoundary(map, appliedDark.current)
      // The container may have been laid out after the map measured it.
      map.resize()
    })
    const resize = () => map.resize()
    window.addEventListener("resize", resize)

    return () => {
      window.removeEventListener("resize", resize)
      markerMap.forEach((marker) => marker.remove())
      markerMap.clear()
      map.remove()
      mapRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || appliedDark.current === isDark) return
    appliedDark.current = isDark
    const view = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    }
    map.setStyle(createMapStyle(isDark))
    map.once("style.load", () => {
      map.jumpTo(view)
      addBoundary(map, isDark)
    })
  }, [isDark])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const current = markers.current
    const ids = new Set(incidents.map((incident) => incident.id))

    for (const [id, marker] of current) {
      if (ids.has(id)) continue
      marker.remove()
      current.delete(id)
    }

    for (const incident of incidents) {
      const existing = current.get(incident.id)
      if (existing) {
        existing.setLngLat([incident.location.lng, incident.location.lat])
        continue
      }
      // Recently reported incidents pulse briefly, except while replaying history.
      const isNew = !replayMode && Date.now() - incident.createdAt.getTime() < NEW_INCIDENT_MS
      const element = createMarkerElement(incident, isNew)
      element.addEventListener("click", (event) => {
        event.stopPropagation()
        const latest = latestIncidents.current.get(incident.id)
        if (latest) latestOnClick.current(latest)
      })
      current.set(
        incident.id,
        new maplibregl.Marker({ element, anchor: "center" })
          .setLngLat([incident.location.lng, incident.location.lat])
          .addTo(map)
      )
    }
  }, [incidents, replayMode])

  // Fly to the selected incident, then back to where the user was when it closes.
  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (selectedIncident) {
      previousView.current ??= { center: map.getCenter().toArray() as [number, number], zoom: map.getZoom() }
      map.flyTo({
        center: [selectedIncident.location.lng, selectedIncident.location.lat],
        zoom: 14,
        duration: 1000,
      })
    } else if (previousView.current) {
      map.flyTo({ ...previousView.current, duration: 1000 })
      previousView.current = null
    }
  }, [selectedIncident])

  return (
    <div ref={container} className="h-full w-full" style={{ minHeight: "500px" }}>
      <style jsx global>{`
        /* MapLibre positions markers absolutely, which also anchors the layers below. */
        .stl-marker {
          width: var(--marker-size);
          height: var(--marker-size);
          padding: 0;
          border: 0;
          background: none;
          cursor: pointer;
        }
        .stl-marker-circle,
        .stl-marker-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }
        .stl-marker-circle {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--marker-color);
          border: 2px solid white;
          font-size: calc(var(--marker-size) * 0.5);
          box-shadow: 0 2px 8px color-mix(in srgb, var(--marker-color) 50%, transparent);
          transition:
            transform 0.15s ease-out,
            box-shadow 0.15s ease-out;
        }
        .stl-marker:hover .stl-marker-circle,
        .stl-marker:focus-visible .stl-marker-circle {
          transform: scale(1.15);
          box-shadow: 0 4px 16px var(--marker-color);
        }
        .stl-marker-simulated .stl-marker-circle {
          border-style: dashed;
          opacity: 0.65;
        }
        .stl-marker-ring {
          border: 2px solid var(--marker-color);
          opacity: 0;
          pointer-events: none;
        }
        .stl-marker-ping {
          animation: stl-marker-ping 2s ease-out 3;
        }
        @keyframes stl-marker-ping {
          from {
            transform: scale(1);
            opacity: 0.6;
          }
          to {
            transform: scale(3);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .stl-marker-ping {
            animation: none;
          }
        }
        .maplibregl-popup-content {
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
        }
        .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
          border-top-color: rgba(0, 0, 0, 0.85);
        }
      `}</style>
    </div>
  )
}
