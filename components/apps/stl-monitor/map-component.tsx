"use client"

import * as React from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useTheme } from "next-themes"
import {
  Incident,
  Camera,
  STL_BOUNDS,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "./types"

interface MapComponentProps {
  incidents: Incident[]
  cameras: Camera[]
  onIncidentClick: (incident: Incident) => void
  selectedIncident: Incident | null
  replayMode: boolean
  showCameras?: boolean
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
  cameras,
  onIncidentClick,
  selectedIncident,
  replayMode,
  showCameras = true,
}: MapComponentProps) {
  const mapContainer = React.useRef<HTMLDivElement>(null)
  const map = React.useRef<maplibregl.Map | null>(null)
  const markers = React.useRef<Map<string, maplibregl.Marker>>(new Map())
  const cameraMarkers = React.useRef<Map<string, maplibregl.Marker>>(new Map())
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
      
      // Cleanup camera markers
      cameraMarkers.current.forEach((marker) => marker.remove())
      cameraMarkers.current.clear()
      
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
        
        // Use anchor: "center" to ensure the marker is placed at the exact coordinate
        const marker = new maplibregl.Marker({ 
          element: el,
          anchor: "center"
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

  // Update camera markers when cameras change or visibility setting changes
  React.useEffect(() => {
    if (!map.current) return

    // Remove all camera markers if not showing cameras
    if (!showCameras) {
      cameraMarkers.current.forEach((marker) => marker.remove())
      cameraMarkers.current.clear()
      return
    }

    const currentCameraIds = new Set(cameraMarkers.current.keys())
    const newCameraIds = new Set(cameras.map((cam) => cam.id))

    // Remove camera markers that are no longer in cameras list
    currentCameraIds.forEach((id) => {
      if (!newCameraIds.has(id)) {
        const marker = cameraMarkers.current.get(id)
        if (marker) {
          marker.remove()
          cameraMarkers.current.delete(id)
        }
      }
    })

    // Add or update camera markers
    cameras.forEach((camera) => {
      if (cameraMarkers.current.has(camera.id)) {
        // Update existing camera marker position if needed
        const marker = cameraMarkers.current.get(camera.id)!
        marker.setLngLat([camera.location.lng, camera.location.lat])
      } else {
        // Create new camera marker
        const el = createCameraMarkerElement(camera)
        
        const marker = new maplibregl.Marker({ 
          element: el,
          anchor: "center"
        })
          .setLngLat([camera.location.lng, camera.location.lat])
          .addTo(map.current!)

        cameraMarkers.current.set(camera.id, marker)
      }
    })
  }, [cameras, showCameras])

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

  // Create marker element with fixed-size container for proper anchoring
  function createMarkerElement(incident: Incident): HTMLElement {
    const color = CATEGORY_COLORS[incident.category]
    const icon = CATEGORY_ICONS[incident.category]
    const size = getSizeFromSeverity(incident.severity)
    
    // Fixed-size container - MUST be the same size as the marker for proper centering
    // The anchor: "center" puts the CENTER of this element at the coordinate
    const container = document.createElement("div")
    container.className = `marker-container ${incident.category}`
    container.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      cursor: pointer;
      position: relative;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    `
    
    // The visual marker circle
    const circle = document.createElement("div")
    circle.className = "marker-circle"
    circle.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${color};
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.5}px;
      box-shadow: 0 2px 8px ${color}80;
      transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
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
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2px solid ${color};
      opacity: 0;
      pointer-events: none;
      z-index: 1;
    `
    
    container.appendChild(pingRing)
    container.appendChild(circle)
    
    // Hover effects
    container.addEventListener("mouseenter", () => {
      circle.style.transform = "scale(1.15)"
      circle.style.boxShadow = `0 4px 16px ${color}`
    })
    
    container.addEventListener("mouseleave", () => {
      circle.style.transform = "scale(1)"
      circle.style.boxShadow = `0 2px 8px ${color}80`
    })
    
    return container
  }

  function getSizeFromSeverity(severity: number): number {
    // Map severity 0-100 to size 28-40
    return Math.floor(28 + (severity / 100) * 12)
  }

  // Create camera marker element
  function createCameraMarkerElement(camera: Camera): HTMLElement {
    const size = 24 // Fixed size for cameras
    const isOk = camera.lastOkAt && !camera.isStale
    
    const container = document.createElement("div")
    container.className = "camera-marker-container"
    container.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      cursor: pointer;
      position: relative;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    `
    
    // Camera icon circle
    const circle = document.createElement("div")
    circle.className = "camera-marker-circle"
    circle.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${isOk ? "#3b82f6" : "#6b7280"};
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.6}px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
      z-index: 2;
    `
    circle.innerHTML = "📷"
    
    // Status indicator dot
    const statusDot = document.createElement("div")
    statusDot.style.cssText = `
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      background-color: ${isOk ? "#10b981" : "#ef4444"};
      border-radius: 50%;
      border: 2px solid white;
      z-index: 3;
    `
    
    container.appendChild(circle)
    container.appendChild(statusDot)
    
    // Hover effects
    container.addEventListener("mouseenter", () => {
      circle.style.transform = "scale(1.2)"
      circle.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.4)`
    })
    
    container.addEventListener("mouseleave", () => {
      circle.style.transform = "scale(1)"
      circle.style.boxShadow = `0 2px 6px rgba(0, 0, 0, 0.3)`
    })
    
    // Click handler - open camera in new tab if available
    container.addEventListener("click", (e) => {
      e.stopPropagation()
      if (camera.externalUrl) {
        window.open(camera.externalUrl, "_blank", "noopener,noreferrer")
      }
    })
    
    return container
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
        .marker-container {
          /* Ensure marker doesn't get clipped */
          overflow: visible;
        }
        
        .marker-container.selected .marker-circle {
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
