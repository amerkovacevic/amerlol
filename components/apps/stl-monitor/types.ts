// STL Monitor Type Definitions

export type IncidentCategory = 
  | "traffic" 
  | "weather" 
  | "transit" 
  | "news" 
  | "crime"

export type IncidentStatus = "active" | "resolving" | "cleared"

export type ConfidenceLevel = "low" | "medium" | "high"

export type DataSource = 
  | "MoDOT" 
  | "IDOT (East St. Louis Only)" 
  | "NWS" 
  | "Metro Transit" 
  | "SLMPD" 
  | "STL County" 
  | "Local News"

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
  metadata?: Record<string, any>
}

export interface Camera {
  id: string
  name: string
  provider: "MoDOT" | "IDOT" | "STL City" | "Other"
  location: GeoPoint
  thumbnailUrl?: string
  streamUrl?: string
  externalUrl?: string
  roadway?: string
  direction?: string
  lastOkAt?: Date
  failCount: number
  isStale: boolean
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

export interface TransitAlert {
  id: string
  headerText: string
  descriptionText?: string
  routes: string[]
  stops: string[]
  effect: string
  cause?: string
  activePeriods: Array<{ start: Date; end?: Date }>
  source: "Metro Transit"
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

// Historical/Analytics Types
export interface CrimeRecord {
  id: string
  crimeType: string
  neighborhood: string
  location: GeoPoint
  date: Date
  description?: string
  source: "SLMPD"
}

export interface AccidentRecord {
  id: string
  accidentType: string
  location: GeoPoint
  date: Date
  injuries?: number
  fatalities?: number
  roadway?: string
  source: "STL County" | "MoDOT"
}

export interface AggregatedStats {
  period: "daily" | "weekly" | "monthly"
  startDate: Date
  endDate: Date
  category: IncidentCategory
  count: number
  averageSeverity?: number
  topLocations?: Array<{ name: string; count: number }>
}

export interface HeatmapCell {
  lat: number
  lng: number
  value: number
  category?: IncidentCategory
}

export interface TemporalHeatmapCell {
  dayOfWeek: number // 0-6
  hourOfDay: number // 0-23
  value: number
  category?: IncidentCategory
}

// Prediction Types
export interface PredictionResult {
  id: string
  type: "high-risk-hours" | "high-risk-locations" | "incident-likelihood"
  category?: IncidentCategory
  area?: string
  predictions: Array<{
    label: string
    probability: number
    confidence: ConfidenceLevel
  }>
  generatedAt: Date
  validUntil: Date
  modelVersion: string
  disclaimer: string
}

export interface RiskScore {
  location: GeoPoint
  gridCell: { row: number; col: number }
  score: number // 0-100
  factors: string[]
  category: IncidentCategory
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

// Settings Types
export interface STLMonitorSettings {
  defaultCategories: Record<IncidentCategory, boolean>
  defaultSeverityRange: [number, number]
  defaultTimeWindow: "15m" | "1h" | "6h" | "24h"
  autoRefresh: boolean
  refreshInterval: number // seconds
  showCameraOverlay: boolean
  cameraSearchRadius: number // miles
  mapStyle: "dark" | "light" | "satellite"
  clusterAtZoom: number
  notifications: {
    enabled: boolean
    severityThreshold: number
    categories: IncidentCategory[]
  }
}

// Map Bounds for STL Metro (extended to include surrounding counties)
export const STL_BOUNDS = {
  center: { lat: 38.6270, lng: -90.1994 } as GeoPoint,
  zoom: 11,
  bounds: {
    north: 39.10,  // Extended north to include Lincoln County (Troy, Winfield)
    south: 38.20,  // Extended south to include Jefferson County (De Soto, Hillsboro)
    east: -89.85,  // East St. Louis area and Illinois side
    west: -91.20   // Extended west to include Franklin County (Washington, Union) and Warren County
  }
}

// East St. Louis boundary (simplified polygon)
export const EAST_STL_BOUNDS = {
  north: 38.65,
  south: 38.58,
  east: -89.98,
  west: -90.15
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

export const DEFAULT_SETTINGS: STLMonitorSettings = {
  defaultCategories: {
    traffic: true,
    weather: true,
    transit: true,
    news: true,
    crime: false,
  },
  defaultSeverityRange: [0, 100],
  defaultTimeWindow: "1h",
  autoRefresh: true,
  refreshInterval: 30,
  showCameraOverlay: true,
  cameraSearchRadius: 0.5,
  mapStyle: "dark",
  clusterAtZoom: 12,
  notifications: {
    enabled: false,
    severityThreshold: 70,
    categories: ["traffic", "weather"],
  },
}
