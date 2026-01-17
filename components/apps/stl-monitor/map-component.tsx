"use client"

import * as React from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useTheme } from "next-themes"
import {
  Incident,
  STL_BOUNDS,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "./types"

interface MapComponentProps {
  incidents: Incident[]
  onIncidentClick: (incident: Incident) => void
  selectedIncident: Incident | null
  replayMode: boolean
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

export default function MapComponent({
  incidents,
  onIncidentClick,
  selectedIncident,
  replayMode,
}: MapComponentProps) {
  const mapContainer = React.useRef<HTMLDivElement>(null)
  const map = React.useRef<maplibregl.Map | null>(null)
  const markers = React.useRef<Map<string, maplibregl.Marker>>(new Map())
  const animationFrames = React.useRef<Map<string, number>>(new Map())
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
      center: [STL_BOUNDS.center.lng, STL_BOUNDS.center.lat],
      zoom: STL_BOUNDS.zoom,
      minZoom: 9,
      maxZoom: 16,
      maxBounds: [
        [STL_BOUNDS.bounds.west, STL_BOUNDS.bounds.south],
        [STL_BOUNDS.bounds.east, STL_BOUNDS.bounds.north],
      ],
    })

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-left")
    map.current.addControl(new maplibregl.ScaleControl(), "bottom-left")

    // Trigger resize after map loads to ensure proper rendering
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

    // Add STL metro area boundary
    map.current.on("load", () => {
      if (!map.current) return

      // Add STL boundary outline
      map.current.addSource("stl-boundary", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [[
              [STL_BOUNDS.bounds.west, STL_BOUNDS.bounds.south],
              [STL_BOUNDS.bounds.east, STL_BOUNDS.bounds.south],
              [STL_BOUNDS.bounds.east, STL_BOUNDS.bounds.north],
              [STL_BOUNDS.bounds.west, STL_BOUNDS.bounds.north],
              [STL_BOUNDS.bounds.west, STL_BOUNDS.bounds.south],
            ]],
          },
        },
      })

      map.current.addLayer({
        id: "stl-boundary-line",
        type: "line",
        source: "stl-boundary",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-opacity": 0.3,
          "line-dasharray": [4, 2],
        },
      })
    })

    return () => {
      // Cleanup resize listener
      window.removeEventListener("resize", handleResize)
      
      // Cleanup animations
      animationFrames.current.forEach((frame) => cancelAnimationFrame(frame))
      animationFrames.current.clear()
      
      // Cleanup markers
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
    
    // Update the tile source when theme changes
    const source = map.current.getSource("osm-tiles") as maplibregl.RasterTileSource
    if (source) {
      // MapLibre doesn't support updating tiles directly, so we need to set the whole style
      const center = map.current.getCenter()
      const zoom = map.current.getZoom()
      const bearing = map.current.getBearing()
      const pitch = map.current.getPitch()
      
      map.current.setStyle(createMapStyle(isDark))
      
      // Restore view after style change
      map.current.once("style.load", () => {
        map.current?.jumpTo({ center, zoom, bearing, pitch })
        
        // Re-add the STL boundary
        if (map.current && !map.current.getSource("stl-boundary")) {
          map.current.addSource("stl-boundary", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [STL_BOUNDS.bounds.west, STL_BOUNDS.bounds.south],
                  [STL_BOUNDS.bounds.east, STL_BOUNDS.bounds.south],
                  [STL_BOUNDS.bounds.east, STL_BOUNDS.bounds.north],
                  [STL_BOUNDS.bounds.west, STL_BOUNDS.bounds.north],
                  [STL_BOUNDS.bounds.west, STL_BOUNDS.bounds.south],
                ]],
              },
            },
          })

          map.current.addLayer({
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
      })
    }
  }, [isDark, mounted])

  // Update markers when incidents change
  React.useEffect(() => {
    if (!map.current) return

    const currentMarkerIds = new Set(markers.current.keys())
    const newIncidentIds = new Set(incidents.map((inc) => inc.id))

    // Remove markers that are no longer in incidents
    currentMarkerIds.forEach((id) => {
      if (!newIncidentIds.has(id)) {
        const marker = markers.current.get(id)
        if (marker) {
          marker.remove()
          markers.current.delete(id)
        }
        const frame = animationFrames.current.get(id)
        if (frame) {
          cancelAnimationFrame(frame)
          animationFrames.current.delete(id)
        }
      }
    })

    // Add or update markers for incidents
    incidents.forEach((incident) => {
      if (markers.current.has(incident.id)) {
        // Update existing marker position if needed
        const marker = markers.current.get(incident.id)!
        marker.setLngLat([incident.location.lng, incident.location.lat])
      } else {
        // Create new marker
        const el = createMarkerElement(incident)
        
        // Use anchor: "center" - this tells MapLibre to position the CENTER of the element at the coordinate
        // The marker element uses margin offsets to ensure the visual marker is centered
        const marker = new maplibregl.Marker({ 
          element: el,
          anchor: "center" // Center anchor ensures stable positioning at all zoom levels
        })
          .setLngLat([incident.location.lng, incident.location.lat])
          .addTo(map.current!)

        // Add click handler
        el.addEventListener("click", (e) => {
          e.stopPropagation()
          onIncidentClick(incident)
        })

        markers.current.set(incident.id, marker)

        // Start ping animation for new incidents
        if (!replayMode) {
          const timeSinceCreation = Date.now() - incident.createdAt.getTime()
          if (timeSinceCreation < 5 * 60 * 1000) {
            // Less than 5 minutes old
            startPingAnimation(incident.id, el)
          }
        }
      }
    })
  }, [incidents, onIncidentClick, replayMode])

  // Center on selected incident or restore previous view
  React.useEffect(() => {
    if (!map.current) return

    if (selectedIncident) {
      // Save current view before zooming to incident
      previousView.current = {
        center: map.current.getCenter().toArray() as [number, number],
        zoom: map.current.getZoom(),
      }
      
      // Fly to selected incident
      map.current.flyTo({
        center: [selectedIncident.location.lng, selectedIncident.location.lat],
        zoom: 14,
        duration: 1000,
      })
    } else if (previousView.current) {
      // Restore previous view when sidebar closes
      map.current.flyTo({
        center: previousView.current.center,
        zoom: previousView.current.zoom,
        duration: 1000,
      })
      previousView.current = null
    }
  }, [selectedIncident])

  // Create marker element with proper anchoring for zoom stability
  // MapLibre Marker with anchor: "center" positions the CENTER of the element at the coordinate
  // So we need to offset the element by half its size so the visual center is at the coordinate
  function createMarkerElement(incident: Incident): HTMLElement {
    const color = CATEGORY_COLORS[incident.category]
    const icon = CATEGORY_ICONS[incident.category]
    const size = getSizeFromSeverity(incident.severity)
    const halfSize = size / 2
    
    // Create wrapper div - MapLibre will position this at the coordinate point
    // When using anchor: "center", MapLibre positions the CENTER of this element at the coordinate
    const wrapper = document.createElement("div")
    wrapper.className = `marker-wrapper ${incident.category}`
    
    // The wrapper needs to be positioned so its visual center (where the circle is) aligns with the coordinate
    // Since we're using anchor: "center", we offset by half the size
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
    
    // The visual marker circle - fills the entire wrapper
    const circle = document.createElement("div")
    circle.className = "marker-circle"
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
      font-size: ${size * 0.5}px;
      box-shadow: 0 2px 8px ${color}80;
      transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
      transform-origin: center center;
      z-index: 2;
    `
    circle.innerHTML = icon
    
    // Ping ring for animation
    const pingRing = document.createElement("div")
    pingRing.className = "ping-ring"
    pingRing.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 2px solid ${color};
      opacity: 0;
      pointer-events: none;
      transform-origin: center center;
      z-index: 1;
    `
    
    wrapper.appendChild(pingRing)
    wrapper.appendChild(circle)
    
    // Hover effects - only transform the circle, never the wrapper
    wrapper.addEventListener("mouseenter", () => {
      circle.style.transform = "scale(1.15)"
      circle.style.boxShadow = `0 4px 16px ${color}`
    })
    
    wrapper.addEventListener("mouseleave", () => {
      circle.style.transform = "scale(1)"
      circle.style.boxShadow = `0 2px 8px ${color}80`
    })
    
    return wrapper
  }

  function getSizeFromSeverity(severity: number): number {
    // Map severity 0-100 to size 28-40
    return Math.floor(28 + (severity / 100) * 12)
  }

  function startPingAnimation(id: string, el: HTMLElement) {
    const pingRing = el.querySelector(".ping-ring") as HTMLElement
    if (!pingRing) return

    let startTime: number | null = null
    const duration = 2000 // 2 seconds per ping cycle
    const repeatCount = 3 // Number of ping cycles

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const cycle = Math.floor(elapsed / duration)
      
      if (cycle >= repeatCount) {
        pingRing.style.opacity = "0"
        pingRing.style.transform = "scale(1)"
        animationFrames.current.delete(id)
        return
      }
      
      const progress = (elapsed % duration) / duration
      const scale = 1 + progress * 2 // Scale from 1 to 3
      const opacity = 1 - progress // Fade from 1 to 0
      
      pingRing.style.transform = `scale(${scale})`
      pingRing.style.opacity = String(opacity * 0.6)
      
      animationFrames.current.set(id, requestAnimationFrame(animate))
    }
    
    animationFrames.current.set(id, requestAnimationFrame(animate))
  }

  return (
    <div ref={mapContainer} className="w-full h-full" style={{ minHeight: "500px" }}>
      {/* Custom CSS for markers */}
      <style jsx global>{`
        /* Marker wrapper - positioned by MapLibre with center anchor */
        .marker-wrapper {
          /* Ensure marker doesn't get clipped */
          overflow: visible !important;
          /* No padding to avoid offset issues */
          padding: 0 !important;
          /* Box sizing to ensure size calculations are correct */
          box-sizing: content-box !important;
        }
        
        /* Ensure MapLibre's marker container uses center transform origin */
        .maplibregl-marker {
          /* MapLibre handles positioning - don't interfere */
          transform-origin: center center !important;
        }
        
        .marker-wrapper.selected .marker-circle {
          transform: scale(1.2) !important;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
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
