export type TarkovGameMode = "pvp" | "pve" | "seasonal"
export type TarkovUpstreamGameMode = "regular" | "pve" | "pvp-season"
export type TarkovFaction = "USEC" | "BEAR"

export type QuestProgressStatus = "active" | "completed" | "failed"
export type DerivedQuestState = "locked" | "available" | QuestProgressStatus

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

export interface QuestObjective {
  id: string
  description: string
  mapIds: string[]
  itemIds: string[]
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
  objectives: QuestObjective[]
  requirements: QuestRequirement[]
  rewards: QuestReward[]
  experience: number
  kappaRequired: boolean
  lightkeeperRequired: boolean
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
  updatedAt: unknown
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
