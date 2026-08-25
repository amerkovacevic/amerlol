export type TarkovGameMode = "pvp" | "pve" | "seasonal"
export type TarkovUpstreamGameMode = "regular" | "pve" | "pvp-season"
export type TarkovFaction = "USEC" | "BEAR"

export type QuestProgressStatus = "active" | "completed" | "failed"
export type QuestPresenceStatus = "not-present" | "available" | QuestProgressStatus
export type QuestPresenceSource = "manual" | "import" | "sync"
export type DerivedQuestState = "locked" | "available" | QuestProgressStatus
export type QuestVisibilityMode = "my-quests" | "eligible" | "all"
export type QuestRequirementStatus = "completed" | "failed"

export interface TarkovEntityRef {
  id: string
  name: string
}

export interface TarkovMap extends TarkovEntityRef {
  normalizedName?: string
}

export interface TarkovTrader extends TarkovEntityRef {}

export interface TarkovItem extends TarkovEntityRef {
  shortName?: string
  imageUrl?: string
  wikiUrl?: string
}

export interface QuestObjectiveWorldPosition {
  mapId: string
  x: number
  y: number
  z: number
}

export interface QuestObjective {
  id: string
  description: string
  mapIds: string[]
  itemIds: string[]
  /** Items the player should intentionally bring into raid for this objective. */
  bringItemIds?: string[]
  /** Keys that may be required to access the objective. Each ID is a candidate key. */
  requiredKeyIds?: string[]
  /** Verified/upstream world-space positions used for geographic route ordering. */
  worldPositions?: QuestObjectiveWorldPosition[]
  count?: number
  foundInRaid?: boolean
  optional?: boolean
}

export interface QuestRequirement {
  type: "level" | "quest" | "trader" | "faction" | "other"
  questId?: string
  level?: number
  traderId?: string
  reputation?: number
  faction?: TarkovFaction
  description?: string
}

export interface QuestDependencyRequirement {
  questId: string
  statuses: QuestRequirementStatus[]
}

export interface QuestReward {
  type: "experience" | "item" | "money" | "reputation" | "unlock" | "other"
  itemId?: string
  traderId?: string
  amount?: number
  description?: string
}

export interface TarkovQuest extends TarkovEntityRef {
  traderId: string
  mapIds: string[]
  minimumLevel: number
  prerequisiteQuestIds: string[]
  dependencyRequirements?: QuestDependencyRequirement[]
  objectives: QuestObjective[]
  requirements: QuestRequirement[]
  rewards: QuestReward[]
  experience: number
  kappaRequired: boolean
  lightkeeperRequired: boolean
  availableDelaySecondsMin?: number
  availableDelaySecondsMax?: number
  wikiUrl?: string
}

export interface TarkovProfile {
  id: string
  userId: string
  displayName: string
  gameMode: TarkovGameMode
  faction: TarkovFaction
  level: number
  wipeId: string
  createdAt: unknown
  updatedAt: unknown
}

export interface QuestProgress {
  questId: string
  status: QuestProgressStatus
  completedObjectiveIds: string[]
  statusChangedAt?: string
  updatedAt: string
}

export interface QuestPresence {
  questId: string
  status: QuestPresenceStatus
  source: QuestPresenceSource
  confirmedAt: string
  updatedAt: string
}

export interface TarkovDatasetMetadata {
  source: "json.tarkov.dev"
  gameMode: TarkovUpstreamGameMode
  language: string
  downloadedAt: string
  version?: string
}

export function toUpstreamGameMode(mode: TarkovGameMode): TarkovUpstreamGameMode {
  switch (mode) {
    case "pve":
      return "pve"
    case "seasonal":
      return "pvp-season"
    case "pvp":
    default:
      return "regular"
  }
}
