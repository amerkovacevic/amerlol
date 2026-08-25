import type { MapRoutingData } from "@/lib/tarkov/routing/types"

/**
 * Coordinate data is intentionally kept in an explicit override registry.
 * Quest/game-data providers are authoritative for quest semantics, but route
 * coordinates need their own versioned source because they can be incomplete,
 * community-maintained, or corrected independently.
 *
 * Do not invent coordinates. Add map packs only when locations have been
 * verified against a canonical map image/version.
 */
const ROUTING_DATA: Record<string, MapRoutingData> = {}

export function getMapRoutingData(mapId: string): MapRoutingData | undefined {
  return ROUTING_DATA[mapId]
}

export function getAllMapRoutingData(): MapRoutingData[] {
  return Object.values(ROUTING_DATA)
}
