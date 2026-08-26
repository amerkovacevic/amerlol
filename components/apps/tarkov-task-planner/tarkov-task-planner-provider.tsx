"use client"

import * as React from "react"
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import type { WipeMode } from "./data-service"

export const TARKOV_STORAGE_KEY = "amerlol-tarkov-task-planner"
const PLANNER_COLLECTION = "tarkovPlanner"
const PLANNER_DOCUMENT = "default"

export type PmcFaction = "USEC" | "BEAR"
export interface PlannerState {
  selectedIds: string[]
  completedObjectiveIds: string[]
  completedTaskIds: string[]
  failedTaskIds: string[]
  wipeMode: WipeMode
  faction: PmcFaction
  pmcLevel: number
  traderLevels: Record<string, number>
}

const DEFAULT_STATE: PlannerState = {
  selectedIds: [], completedObjectiveIds: [], completedTaskIds: [], failedTaskIds: [],
  wipeMode: "pvp", faction: "USEC", pmcLevel: 1, traderLevels: {},
}

function normalizeState(value: Partial<PlannerState>): PlannerState {
  return {
    selectedIds: Array.isArray(value.selectedIds) ? value.selectedIds.filter((id): id is string => typeof id === "string") : [],
    completedObjectiveIds: Array.isArray(value.completedObjectiveIds) ? value.completedObjectiveIds.filter((id): id is string => typeof id === "string") : [],
    completedTaskIds: Array.isArray(value.completedTaskIds) ? value.completedTaskIds.filter((id): id is string => typeof id === "string") : [],
    failedTaskIds: Array.isArray(value.failedTaskIds) ? value.failedTaskIds.filter((id): id is string => typeof id === "string") : [],
    wipeMode: ["pvp", "pve", "seasonal"].includes(value.wipeMode || "") ? value.wipeMode! : "pvp",
    faction: value.faction === "BEAR" ? "BEAR" : "USEC",
    pmcLevel: Math.min(79, Math.max(1, Number(value.pmcLevel) || 1)),
    traderLevels: Object.fromEntries(Object.entries(value.traderLevels || {}).filter(([id, level]) => id && Number.isInteger(level) && level >= 1 && level <= 4)),
  }
}

interface PlannerContextValue extends PlannerState {
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>
  setCompletedObjectiveIds: React.Dispatch<React.SetStateAction<string[]>>
  setCompletedTaskIds: React.Dispatch<React.SetStateAction<string[]>>
  setFailedTaskIds: React.Dispatch<React.SetStateAction<string[]>>
  setWipeMode: React.Dispatch<React.SetStateAction<WipeMode>>
  setFaction: React.Dispatch<React.SetStateAction<PmcFaction>>
  setPmcLevel: React.Dispatch<React.SetStateAction<number>>
  setTraderLevels: React.Dispatch<React.SetStateAction<Record<string, number>>>
  hydrated: boolean
  cloudReady: boolean
  clearProgress: () => Promise<void>
}

const PlannerContext = React.createContext<PlannerContextValue | null>(null)

export function TarkovTaskPlannerProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = React.useState(DEFAULT_STATE)
  const [hydrated, setHydrated] = React.useState(false)
  const [cloudReady, setCloudReady] = React.useState(false)
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    try { setState(normalizeState(JSON.parse(localStorage.getItem(TARKOV_STORAGE_KEY) || "{}"))) } catch { setState(DEFAULT_STATE) }
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(TARKOV_STORAGE_KEY, JSON.stringify(state))
  }, [hydrated, state])

  React.useEffect(() => {
    if (authLoading || !hydrated) return
    if (!user) { setCloudReady(false); return }
    let cancelled = false
    const load = async () => {
      try {
        const ref = doc(db, "users", user.uid, PLANNER_COLLECTION, PLANNER_DOCUMENT)
        const snapshot = await getDoc(ref)
        if (cancelled) return
        if (snapshot.exists()) setState(normalizeState(snapshot.data() as Partial<PlannerState>))
        else await setDoc(ref, { ...state, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        if (!cancelled) setCloudReady(true)
      } catch (error) {
        console.error("Tarkov planner cloud load failed:", error)
        toast.error("Could not load cloud progress; using this browser's data")
      }
    }
    load()
    return () => { cancelled = true }
  }, [user, authLoading, hydrated])

  React.useEffect(() => {
    if (!user || !cloudReady) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      setDoc(doc(db, "users", user.uid, PLANNER_COLLECTION, PLANNER_DOCUMENT), { ...state, updatedAt: serverTimestamp() }, { merge: true })
        .catch((error) => { console.error("Tarkov planner cloud save failed:", error); toast.error("Cloud sync failed; progress remains saved locally") })
    }, 700)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [user, cloudReady, state])

  const setter = <K extends keyof PlannerState>(key: K): React.Dispatch<React.SetStateAction<PlannerState[K]>> => (next) => {
    setState((current) => ({ ...current, [key]: typeof next === "function" ? (next as (value: PlannerState[K]) => PlannerState[K])(current[key]) : next }))
  }

  const clearProgress = async () => {
    setState(DEFAULT_STATE)
    localStorage.setItem(TARKOV_STORAGE_KEY, JSON.stringify(DEFAULT_STATE))
    if (user) await setDoc(doc(db, "users", user.uid, PLANNER_COLLECTION, PLANNER_DOCUMENT), { ...DEFAULT_STATE, updatedAt: serverTimestamp() })
  }

  return <PlannerContext.Provider value={{ ...state, setSelectedIds: setter("selectedIds"), setCompletedObjectiveIds: setter("completedObjectiveIds"), setCompletedTaskIds: setter("completedTaskIds"), setFailedTaskIds: setter("failedTaskIds"), setWipeMode: setter("wipeMode"), setFaction: setter("faction"), setPmcLevel: setter("pmcLevel"), setTraderLevels: setter("traderLevels"), hydrated, cloudReady, clearProgress }}>{children}</PlannerContext.Provider>
}

export function useTarkovTaskPlanner() {
  const context = React.useContext(PlannerContext)
  if (!context) throw new Error("useTarkovTaskPlanner must be used within TarkovTaskPlannerProvider")
  return context
}
