import type { TarkovTask } from "./types"

export type WipeMode = "pvp" | "pve" | "seasonal"

const MODE_FILES: Record<WipeMode, string> = {
  pvp: "regular",
  pve: "pve",
  seasonal: "pvp-season",
}

export async function fetchTarkovTasks(mode: WipeMode, signal?: AbortSignal): Promise<TarkovTask[]> {
  const response = await fetch(`/data/tarkov-tasks-${MODE_FILES[mode]}.json`, { signal })
  if (!response.ok) throw new Error("The bundled tarkov.dev task data could not be loaded")
  const payload = await response.json()
  return (payload?.tasks || []).filter((task: TarkovTask) => task.id && task.name)
}
