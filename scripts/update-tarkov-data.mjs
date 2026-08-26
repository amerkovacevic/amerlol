import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const API_ROOT = "https://json.tarkov.dev"
const MODES = ["regular", "pve", "pvp-season"]

async function fetchJson(mode, path) {
  const response = await fetch(`${API_ROOT}/${mode}/${path}`, {
    headers: { Accept: "application/json", "User-Agent": "amer.lol Tarkov Raid Planner" },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`)
  return response.json()
}

function values(record) {
  return Object.values(record || {})
}

function translate(value, translations) {
  if (typeof value !== "string") return value
  return translations[value] || value
}

function itemFrom(id, items, itemTranslations) {
  const item = items[id]
  if (!item) return null
  return {
    name: translate(item.name, itemTranslations),
    shortName: translate(item.shortName, itemTranslations),
    iconLink: item.iconLink || null,
  }
}

function itemList(ids, items, translations) {
  return (ids || []).map((id) => itemFrom(id, items, translations)).filter(Boolean)
}

function itemGroups(groups, items, translations) {
  return (groups || []).map((group) => itemList(group, items, translations)).filter((group) => group.length)
}

async function updateMode(mode) {
  const outputPath = resolve(process.cwd(), `public/data/tarkov-tasks-${mode}.json`)
  try {
    const [taskBase, taskEnglish, itemBase, itemEnglish, mapBase, mapEnglish, traderBase, traderEnglish] = await Promise.all([
      fetchJson(mode, "tasks"),
      fetchJson(mode, "tasks_en"),
      fetchJson(mode, "items"),
      fetchJson(mode, "items_en"),
      fetchJson(mode, "maps"),
      fetchJson(mode, "maps_en"),
      fetchJson(mode, "traders"),
      fetchJson(mode, "traders_en"),
    ])

    const tasks = taskBase.data?.tasks || {}
    const questItems = taskBase.data?.questItems || {}
    const items = itemBase.data?.items || {}
    const maps = mapBase.data?.maps || {}
    const traders = traderBase.data || {}
    const taskTranslations = taskEnglish.data || {}
    const itemTranslations = itemEnglish.data || {}
    const mapTranslations = mapEnglish.data || {}
    const traderTranslations = traderEnglish.data || {}

    const resolveMap = (id) => maps[id] ? { name: translate(maps[id].name, mapTranslations) } : null
    const resolveMaps = (ids) => (ids || []).map(resolveMap).filter(Boolean)

    const normalizedTasks = values(tasks).map((task) => ({
      id: task.id,
      name: translate(task.name, taskTranslations),
      factionName: task.factionName || null,
      minPlayerLevel: task.minPlayerLevel ?? null,
      wikiLink: task.wikiLink || null,
      trader: { id: task.trader, name: traders[task.trader] ? translate(traders[task.trader].name, traderTranslations) : "Unknown trader" },
      map: resolveMap(task.map),
      taskRequirements: (task.taskRequirements || []).map((requirement) => ({
        taskId: requirement.task,
        status: requirement.status || ["complete"],
      })),
      traderRequirements: (task.traderRequirements || [])
        .filter((requirement) => requirement.requirementType === "level")
        .map((requirement) => ({
          traderId: requirement.trader,
          traderName: traders[requirement.trader] ? translate(traders[requirement.trader].name, traderTranslations) : "Unknown trader",
          level: requirement.value,
          compareMethod: requirement.compareMethod || ">=",
        })),
      traderUnlocks: task.finishRewards?.traderUnlock || [],
      objectives: (task.objectives || []).map((objective) => ({
        id: objective.id || null,
        type: objective.type,
        description: translate(objective.description, taskTranslations),
        optional: Boolean(objective.optional),
        maps: resolveMaps(objective.maps || values(objective.zones).map((zone) => zone.map)),
        count: objective.count,
        foundInRaid: objective.foundInRaid,
        items: itemList(objective.items, items, itemTranslations),
        markerItem: itemFrom(objective.markerItem, items, itemTranslations),
        useAny: itemList(objective.useAny, items, itemTranslations),
        usingWeapon: itemList(objective.usingWeapon, items, itemTranslations),
        wearing: itemGroups(objective.wearing, items, itemTranslations),
        requiredKeys: itemGroups(objective.requiredKeys, items, itemTranslations),
        targetNames: (objective.targetNames || []).map((name) => translate(name, taskTranslations)),
        bodyParts: (objective.bodyParts || []).map((name) => translate(name, taskTranslations)),
        questItem: questItems[objective.questItem]
          ? { name: translate(questItems[objective.questItem].name, taskTranslations) }
          : undefined,
      })),
    })).filter((task) => task.id && task.name)

    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify({ updatedAt: new Date().toISOString(), source: "json.tarkov.dev", mode, tasks: normalizedTasks })}\n`)
    console.log(`Updated ${normalizedTasks.length} ${mode} Tarkov tasks from json.tarkov.dev`)
  } catch (error) {
    try {
      await readFile(outputPath)
      console.warn(`Could not refresh ${mode} Tarkov data; keeping the existing snapshot: ${error.message}`)
    } catch {
      throw error
    }
  }
}

await Promise.all(MODES.map(updateMode))
