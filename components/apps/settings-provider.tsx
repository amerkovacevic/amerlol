"use client"

import * as React from "react"
import { doc, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/components/auth/auth-provider"
import { db } from "@/lib/firebase/db"
import {
  defaultSettings,
  readSettings,
  settingsDefinition,
  settingsStorageKey,
  validateSettings,
  type AppSettings,
  type SettingsAppId,
  type SettingsValues,
} from "@/lib/apps/settings"

interface SettingsContextValue {
  appId: SettingsAppId
  values: SettingsValues
  loading: boolean
  saving: boolean
  error: string
  cloud: boolean
  save: (draft: SettingsValues, baseline: SettingsValues) => Promise<void>
  retry: () => void
}
const SettingsContext = React.createContext<SettingsContextValue | null>(null)

function localSettings(appId: SettingsAppId, key: string, legacy: boolean) {
  const definition = settingsDefinition(appId)
  const raw =
    localStorage.getItem(key) ??
    (legacy && definition.legacyKey ? localStorage.getItem(definition.legacyKey) : null)
  return readSettings(appId, raw ? JSON.parse(raw) : null)
}

export function AppSettingsProvider({
  appId,
  children,
}: {
  appId: SettingsAppId
  children: React.ReactNode
}) {
  const { account, loading: authLoading } = useAuth()
  const definition = settingsDefinition(appId)
  // A keyed session prevents a late response or draft from crossing account boundaries.
  // Anonymous game guests keep device settings, like any other guest.
  const uid = definition.collection ? account?.uid : undefined
  return (
    <SettingsSession
      key={`${appId}:${uid ?? "guest"}`}
      appId={appId}
      uid={uid}
      waiting={Boolean(definition.collection && authLoading)}
    >
      {children}
    </SettingsSession>
  )
}

function SettingsSession({
  appId,
  uid,
  waiting,
  children,
}: {
  appId: SettingsAppId
  uid?: string
  waiting: boolean
  children: React.ReactNode
}) {
  const definition = settingsDefinition(appId)
  const cloud = Boolean(uid && definition.collection)
  const key = settingsStorageKey(appId, uid)
  const [values, setValues] = React.useState(() => defaultSettings(appId))
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")
  const [attempt, setAttempt] = React.useState(0)
  const active = React.useRef(true)
  React.useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  React.useEffect(() => {
    if (waiting) return
    if (cloud && uid && definition.collection) {
      return onSnapshot(
        doc(db, "users", uid, definition.collection, "default"),
        (snapshot) => {
          setValues(readSettings(appId, snapshot.exists() ? snapshot.data() : null))
          setLoading(false)
        },
        () => {
          setError("Settings could not be loaded. Retry before saving.")
          setLoading(false)
        }
      )
    }
    const load = () => {
      try {
        setValues(localSettings(appId, key, true))
        setError("")
      } catch {
        setError("Stored settings could not be read. Your existing data has been left untouched.")
      }
      setLoading(false)
    }
    load()
    const changed = (event: StorageEvent) => {
      if (event.key === key || event.key === definition.legacyKey || event.key === null) load()
    }
    window.addEventListener("storage", changed)
    return () => window.removeEventListener("storage", changed)
  }, [appId, attempt, cloud, definition.collection, definition.legacyKey, key, uid, waiting])

  const save = async (draft: SettingsValues, baseline: SettingsValues) => {
    if (waiting || loading || error || saving)
      throw new Error("Wait for settings to load successfully before saving.")
    const validated = validateSettings(appId, draft)
    const changes = Object.fromEntries(
      Object.entries(validated).filter(
        ([field, value]) => JSON.stringify(value) !== JSON.stringify(baseline[field])
      )
    )
    if (!Object.keys(changes).length) return
    setSaving(true)
    try {
      if (cloud && uid && definition.collection) {
        const ref = doc(db, "users", uid, definition.collection, "default")
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref)
          const current = readSettings(appId, snapshot.exists() ? snapshot.data() : null)
          for (const field of Object.keys(changes)) {
            if (JSON.stringify(current[field]) !== JSON.stringify(baseline[field]))
              throw new Error(
                "These settings changed on another device. Cancel your draft to reload, then try again."
              )
          }
          transaction.set(
            ref,
            {
              ...changes,
              updatedAt: serverTimestamp(),
              ...(!snapshot.exists() ? { createdAt: serverTimestamp() } : {}),
            },
            { merge: true }
          )
        })
      } else {
        // Preserve unknown fields in existing local documents, just as merge writes do remotely.
        const saved =
          localStorage.getItem(key) ??
          (definition.legacyKey ? localStorage.getItem(definition.legacyKey) : null)
        const raw: unknown = saved ? JSON.parse(saved) : {}
        const current = readSettings(appId, raw)
        for (const field of Object.keys(changes)) {
          // Legacy keys are read-only fallbacks until the first explicit save.
          if (saved && JSON.stringify(current[field]) !== JSON.stringify(baseline[field]))
            throw new Error("Settings changed in another tab. Cancel your draft and try again.")
        }
        const merged = {
          ...(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}),
          ...changes,
        }
        localStorage.setItem(key, JSON.stringify(merged))
        if (active.current) setValues(readSettings(appId, merged))
      }
    } finally {
      if (active.current) setSaving(false)
    }
  }
  return (
    <SettingsContext.Provider
      value={{
        appId,
        values,
        loading: loading || waiting,
        saving,
        error,
        cloud,
        save,
        retry: () => {
          setLoading(true)
          setError("")
          setAttempt((value) => value + 1)
        },
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettingsContext() {
  const context = React.useContext(SettingsContext)
  if (!context) throw new Error("App settings require AppSettingsProvider")
  return context
}

export function useAppSettings<K extends SettingsAppId>(appId: K): AppSettings<K> {
  const context = useSettingsContext()
  if (context.appId !== appId) throw new Error(`Wrong settings provider for ${appId}`)
  return context.values as AppSettings<K>
}
