import type { RarityPoints } from "./types.ts"

export const SCORING_VERSION = "min-appearances-v1"

export interface ScoringTier {
  points: RarityPoints
  minAppearances: number
  maxAppearances: number | null
  label: string
}

export const DEFAULT_SCORING_TIERS: readonly ScoringTier[] = [
  { points: 100, minAppearances: 1, maxAppearances: 4, label: "Deep cut" },
  { points: 85, minAppearances: 5, maxAppearances: 19, label: "Rare" },
  { points: 60, minAppearances: 20, maxAppearances: 49, label: "Uncommon" },
  { points: 30, minAppearances: 50, maxAppearances: 99, label: "Familiar" },
  { points: 10, minAppearances: 100, maxAppearances: null, label: "Obvious" },
] as const

export function scoreClubPair(
  clubAAppearances: number | undefined,
  clubBAppearances: number | undefined,
  tiers: readonly ScoringTier[] = DEFAULT_SCORING_TIERS
): RarityPoints {
  if (!Number.isInteger(clubAAppearances) || !Number.isInteger(clubBAppearances)) {
    throw new Error("Verified appearance counts are required for both clubs")
  }
  if (clubAAppearances! < 1 || clubBAppearances! < 1) {
    throw new Error("A player must have at least one competitive appearance for each club")
  }

  const minimum = Math.min(clubAAppearances!, clubBAppearances!)
  const tier = tiers.find(
    ({ minAppearances, maxAppearances }) =>
      minimum >= minAppearances && (maxAppearances === null || minimum <= maxAppearances)
  )
  if (!tier) throw new Error(`No scoring tier covers ${minimum} appearances`)
  return tier.points
}

export function getRarityLabel(points: RarityPoints): string {
  return DEFAULT_SCORING_TIERS.find((tier) => tier.points === points)?.label ?? "Unknown"
}
