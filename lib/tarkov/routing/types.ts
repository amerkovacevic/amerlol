export interface NormalizedPoint {
  /** 0..1 from left to right on the canonical map image. */
  x: number
  /** 0..1 from top to bottom on the canonical map image. */
  y: number
}

export type RouteLocationKind = "objective" | "spawn" | "extract" | "landmark"

export interface RouteLocation {
  id: string
  mapId: string
  name: string
  kind: RouteLocationKind
  point: NormalizedPoint
  /** Optional risk weight. Higher means the safer-route strategy should avoid it. */
  risk?: number
  /** Optional tags such as dorms, underground, bridge, boss-area. */
  tags?: string[]
}

export interface ObjectiveCoordinateRef {
  questId: string
  objectiveId: string
  mapId: string
  locationId: string
}

export interface MapRoutingData {
  mapId: string
  version: number
  locations: RouteLocation[]
  objectiveRefs: ObjectiveCoordinateRef[]
}

export type RouteStrategy =
  | "max-progression"
  | "shortest-line"
  | "safer-line"
  | "kappa-focus"
  | "fast-xp"

export interface RouteContext {
  spawnLocationId?: string
  extractLocationIds?: string[]
  strategy?: RouteStrategy
}

export function isNormalizedPoint(point: NormalizedPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
}
