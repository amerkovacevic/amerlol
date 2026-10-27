// STL Monitor Type Definitions

// "transit" and "crime" have no connected source yet; they stay in the type because saved settings use them.
export type IncidentCategory = "traffic" | "weather" | "transit" | "news" | "crime"

export type IncidentStatus = "active" | "resolving" | "cleared"

export type ConfidenceLevel = "low" | "medium" | "high"

export type DataSource = "MoDOT" | "NWS" | "Local News"

export interface GeoPoint {
  lat: number
  lng: number
}

export interface GeoPolygon {
  type: "Polygon"
  coordinates: number[][][]
}

export interface Incident {
  id: string
  title: string
  description?: string
  category: IncidentCategory
  subtype?: string
  severity: number // 0-100
  confidence: ConfidenceLevel
  status: IncidentStatus
  location: GeoPoint
  polygon?: GeoPolygon
  source: DataSource
  sourceUrl?: string
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  metadata?: Record<string, unknown>
}

export interface WeatherAlert {
  id: string
  event: string
  headline: string
  description: string
  severity: "Minor" | "Moderate" | "Severe" | "Extreme"
  urgency: "Immediate" | "Expected" | "Future" | "Past" | "Unknown"
  polygon?: GeoPolygon
  effective: Date
  expires: Date
  source: "NWS"
}

export interface NewsItem {
  id: string
  title: string
  outlet: string
  url: string
  publishedAt: Date
  snippet?: string
  location?: GeoPoint
  geocodingConfidence?: ConfidenceLevel
}

// Filter Types
export interface FilterState {
  categories: Record<IncidentCategory, boolean>
  severityMin: number
  severityMax: number
  timeWindow: "15m" | "1h" | "6h" | "24h"
  replayMode: boolean
  replayTime?: Date
}

// Map Bounds for STL Metro (extended to include surrounding counties)
export const STL_BOUNDS = {
  center: { lat: 38.627, lng: -90.1994 } as GeoPoint,
  zoom: 11,
  bounds: {
    north: 39.1, // Extended north to include Lincoln County (Troy, Winfield)
    south: 38.2, // Extended south to include Jefferson County (De Soto, Hillsboro)
    east: -89.85, // East St. Louis area and Illinois side
    west: -91.2, // Extended west to include Franklin County (Washington, Union) and Warren County
  },
}

// Category colors for map markers
export const CATEGORY_COLORS: Record<IncidentCategory, string> = {
  traffic: "#ef4444", // red
  weather: "#3b82f6", // blue
  transit: "#f59e0b", // amber
  news: "#8b5cf6", // purple
  crime: "#6b7280", // gray (analytics only)
}

export const CATEGORY_ICONS: Record<IncidentCategory, string> = {
  traffic: "🚗",
  weather: "⛈️",
  transit: "🚇",
  news: "📰",
  crime: "📊",
}

export const DEFAULT_FILTER_STATE: FilterState = {
  categories: {
    traffic: true,
    weather: true,
    transit: true,
    news: true,
    crime: false, // analytics only
  },
  severityMin: 0,
  severityMax: 100,
  timeWindow: "1h",
  replayMode: false,
}
