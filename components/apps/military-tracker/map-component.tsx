"use client"

import * as React from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useTheme } from "next-themes"
import type { MilitaryFlight } from "./types"
import { COUNTRY_COLORS, AIRCRAFT_TYPE_ICONS } from "./types"

interface MilitaryTrackerMapProps {
  flights: MilitaryFlight[]
  onFlightClick: (flight: MilitaryFlight) => void
  selectedFlight: MilitaryFlight | null
}

// Get tile URLs based on theme
function getTileUrls(isDark: boolean) {
  const style = isDark ? "dark_all" : "light_all"
  return [
    `https://a.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`,
    `https://b.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`,
    `https://c.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`,
  ]
}

// Create map style object
function createMapStyle(isDark: boolean): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: getTileUrls(isDark),
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm-tiles",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  }
}

export function MilitaryTrackerMap({
  flights,
  onFlightClick,
  selectedFlight,
}: MilitaryTrackerMapProps) {
  const mapContainer = React.useRef<HTMLDivElement>(null)
  const map = React.useRef<maplibregl.Map | null>(null)
  const markers = React.useRef<Map<string, maplibregl.Marker>>(new Map())
  const previousView = React.useRef<{ center: [number, number]; zoom: number } | null>(null)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Track if component is mounted (for SSR)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = !mounted || resolvedTheme === "dark"

  // Initialize map
  React.useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: createMapStyle(isDark),
      center: [0, 20], // Center on world view
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
    })

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-left")
    map.current.addControl(new maplibregl.ScaleControl(), "bottom-left")

    // Trigger resize after map loads
    map.current.on("load", () => {
      setTimeout(() => {
        map.current?.resize()
      }, 100)
    })

    // Handle window resize
    const handleResize = () => {
      map.current?.resize()
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      markers.current.forEach((marker) => marker.remove())
      markers.current.clear()
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update map style when theme changes
  React.useEffect(() => {
    if (!map.current || !mounted) return

    const source = map.current.getSource("osm-tiles") as maplibregl.RasterTileSource
    if (source) {
      const center = map.current.getCenter()
      const zoom = map.current.getZoom()
      const bearing = map.current.getBearing()
      const pitch = map.current.getPitch()

      map.current.setStyle(createMapStyle(isDark))

      map.current.once("style.load", () => {
        map.current?.jumpTo({ center, zoom, bearing, pitch })
      })
    }
  }, [isDark, mounted])

  // Update markers when flights change
  React.useEffect(() => {
    if (!map.current) return

    const currentMarkerIds = new Set(markers.current.keys())
    const newFlightIds = new Set(flights.map((f) => f.id))

    // Remove markers that are no longer in flights
    currentMarkerIds.forEach((id) => {
      if (!newFlightIds.has(id)) {
        const marker = markers.current.get(id)
        if (marker) {
          marker.remove()
          markers.current.delete(id)
        }
      }
    })

    // Add or update markers for flights
    flights.forEach((flight) => {
      if (markers.current.has(flight.id)) {
        // Update existing marker position
        const marker = markers.current.get(flight.id)!
        marker.setLngLat([flight.position.longitude, flight.position.latitude])
      } else {
        // Create new marker
        const el = createFlightMarkerElement(flight)

        const marker = new maplibregl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([flight.position.longitude, flight.position.latitude])
          .addTo(map.current!)

        // Add click handler
        el.addEventListener("click", (e) => {
          e.stopPropagation()
          onFlightClick(flight)
        })

        markers.current.set(flight.id, marker)
      }
    })

    // Highlight selected flight
    if (selectedFlight) {
      markers.current.forEach((marker, id) => {
        const el = marker.getElement()
        if (id === selectedFlight.id) {
          el.classList.add("selected")
        } else {
          el.classList.remove("selected")
        }
      })
    } else {
      markers.current.forEach((marker) => {
        marker.getElement().classList.remove("selected")
      })
    }
  }, [flights, onFlightClick, selectedFlight])

  // Center on selected flight
  React.useEffect(() => {
    if (!map.current) return

    if (selectedFlight) {
      previousView.current = {
        center: map.current.getCenter().toArray() as [number, number],
        zoom: map.current.getZoom(),
      }

      map.current.flyTo({
        center: [selectedFlight.position.longitude, selectedFlight.position.latitude],
        zoom: Math.max(map.current.getZoom(), 8),
        duration: 1000,
      })
    } else if (previousView.current) {
      map.current.flyTo({
        center: previousView.current.center,
        zoom: previousView.current.zoom,
        duration: 1000,
      })
      previousView.current = null
    }
  }, [selectedFlight])

  // Create flight marker element
  function createFlightMarkerElement(flight: MilitaryFlight): HTMLElement {
    const color = COUNTRY_COLORS[flight.country]
    const icon = AIRCRAFT_TYPE_ICONS[flight.aircraftType]
    const size = 32
    const halfSize = size / 2

    const wrapper = document.createElement("div")
    wrapper.className = `flight-marker-wrapper ${flight.country.toLowerCase()}`
    wrapper.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      margin-left: -${halfSize}px;
      margin-top: -${halfSize}px;
      cursor: pointer;
      pointer-events: auto;
      transform-origin: ${halfSize}px ${halfSize}px;
      will-change: transform;
    `

    const circle = document.createElement("div")
    circle.className = "flight-marker-circle"
    circle.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.6}px;
      box-shadow: 0 2px 8px ${color}80, 0 0 0 2px ${color}40;
      transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
      transform-origin: center center;
      z-index: 2;
    `
    circle.innerHTML = icon

    // Add heading indicator if available
    if (flight.position.heading !== null) {
      const headingIndicator = document.createElement("div")
      headingIndicator.style.cssText = `
        position: absolute;
        top: -2px;
        left: 50%;
        width: 2px;
        height: 8px;
        background-color: ${color};
        transform-origin: bottom center;
        transform: translateX(-50%) rotate(${flight.position.heading}deg);
        z-index: 3;
      `
      wrapper.appendChild(headingIndicator)
    }

    wrapper.appendChild(circle)

    // Hover effects
    wrapper.addEventListener("mouseenter", () => {
      circle.style.transform = "scale(1.2)"
      circle.style.boxShadow = `0 4px 16px ${color}, 0 0 0 4px ${color}40`
    })

    wrapper.addEventListener("mouseleave", () => {
      circle.style.transform = "scale(1)"
      circle.style.boxShadow = `0 2px 8px ${color}80, 0 0 0 2px ${color}40`
    })

    return wrapper
  }

  return (
    <div ref={mapContainer} className="w-full h-full" style={{ minHeight: "500px" }}>
      <style jsx global>{`
        .flight-marker-wrapper {
          overflow: visible !important;
          padding: 0 !important;
          box-sizing: content-box !important;
        }

        .maplibregl-marker {
          transform-origin: center center !important;
        }

        .flight-marker-wrapper.selected .flight-marker-circle {
          transform: scale(1.3) !important;
          animation: pulse-military 1.5s ease-in-out infinite;
          box-shadow: 0 0 0 4px rgba(255, 0, 0, 0.5) !important;
        }

        @keyframes pulse-military {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
        }

        .maplibregl-popup-content {
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}
