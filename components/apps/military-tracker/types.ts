// Types for Military Flight Tracker

export interface GeoPoint {
  lat: number
  lng: number
}

export type MilitaryAircraftType = 
  | "Fighter" 
  | "Bomber" 
  | "Transport" 
  | "Tanker" 
  | "Reconnaissance" 
  | "Helicopter"
  | "UAV"
  | "Unknown"

export type Country = 
  | "USA" 
  | "Russia" 
  | "China" 
  | "UK" 
  | "France" 
  | "Germany" 
  | "Japan" 
  | "Israel"
  | "Other"

export type ActivityType =
  | "Training"
  | "Patrol"
  | "Transport"
  | "Reconnaissance"
  | "Exercise"
  | "Unknown"

export interface MilitaryFlight {
  id: string
  flightNumber: string | null
  callsign: string | null
  aircraftType: MilitaryAircraftType
  aircraftModel: string | null
  country: Country
  registration: string | null
  
  // Position
  position: {
    latitude: number
    longitude: number
    altitude: number | null
    heading: number | null
    speed: number | null
  }
  
  // Status
  status: "en-route" | "landed" | "unknown"
  activity: ActivityType
  
  // Timestamps
  lastUpdate: Date
  firstSeen: Date
  
  // Metadata
  origin?: {
    code: string | null
    name: string | null
    city: string | null
    country: string | null
  }
  destination?: {
    code: string | null
    name: string | null
    city: string | null
    country: string | null
  }
  
  // Detection quality
  dataSource: "adsb" | "mode-s" | "secondary"
  visibility: "high" | "medium" | "low" // How reliable is the tracking
  
  // Analytics
  estimatedDuration?: number // minutes
  estimatedPurpose?: string
}

export interface FilterState {
  countries: Record<Country, boolean>
  aircraftTypes: Record<MilitaryAircraftType, boolean>
  activities: Record<ActivityType, boolean>
  visibility: {
    high: boolean
    medium: boolean
    low: boolean
  }
  altitudeRange: [number, number] // feet
  speedRange: [number, number] // knots
  showInactive: boolean
}

export const DEFAULT_FILTER_STATE: FilterState = {
  countries: {
    USA: true,
    Russia: true,
    China: true,
    UK: true,
    France: true,
    Germany: true,
    Japan: true,
    Israel: true,
    Other: true,
  },
  aircraftTypes: {
    Fighter: true,
    Bomber: true,
    Transport: true,
    Tanker: true,
    Reconnaissance: true,
    Helicopter: true,
    UAV: true,
    Unknown: true,
  },
  activities: {
    Training: true,
    Patrol: true,
    Transport: true,
    Reconnaissance: true,
    Exercise: true,
    Unknown: true,
  },
  visibility: {
    high: true,
    medium: true,
    low: true,
  },
  altitudeRange: [0, 60000],
  speedRange: [0, 1000],
  showInactive: false,
}

export const COUNTRY_COLORS: Record<Country, string> = {
  USA: "#1e40af", // Blue
  Russia: "#dc2626", // Red
  China: "#ea580c", // Orange
  UK: "#059669", // Green
  France: "#7c3aed", // Purple
  Germany: "#475569", // Slate
  Japan: "#b91c1c", // Dark Red
  Israel: "#0d9488", // Teal
  Other: "#6b7280", // Gray
}

export const AIRCRAFT_TYPE_ICONS: Record<MilitaryAircraftType, string> = {
  Fighter: "✈️",
  Bomber: "💣",
  Transport: "📦",
  Tanker: "⛽",
  Reconnaissance: "👁️",
  Helicopter: "🚁",
  UAV: "🤖",
  Unknown: "✈️",
}
