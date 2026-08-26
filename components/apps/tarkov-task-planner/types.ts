export interface TarkovItem {
  name: string
  shortName?: string | null
  iconLink?: string | null
}

export interface TarkovMap {
  name: string
}

export interface TarkovObjective {
  id?: string | null
  type: string
  description: string
  optional: boolean
  maps: TarkovMap[]
  count?: number
  foundInRaid?: boolean
  items?: TarkovItem[]
  markerItem?: TarkovItem
  useAny?: TarkovItem[]
  usingWeapon?: TarkovItem[]
  wearing?: TarkovItem[][]
  requiredKeys?: TarkovItem[][]
  targetNames?: string[]
  bodyParts?: string[]
  questItem?: { name: string }
}

export interface TarkovTask {
  id: string
  name: string
  factionName?: string | null
  minPlayerLevel?: number | null
  wikiLink?: string | null
  trader: { id: string; name: string }
  map?: TarkovMap | null
  taskRequirements: Array<{ taskId: string; status: Array<"active" | "complete" | "failed"> }>
  traderRequirements: Array<{ traderId: string; traderName: string; level: number; compareMethod: string }>
  traderUnlocks: string[]
  objectives: TarkovObjective[]
}

export interface MapPlan {
  name: string
  tasks: Array<{ task: TarkovTask; objectives: TarkovObjective[] }>
  objectiveCount: number
}
