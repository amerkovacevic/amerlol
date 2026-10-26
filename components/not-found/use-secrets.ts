"use client"

import * as React from "react"
import { readStoredJson, writeStorage } from "@/lib/storage"

export const SECRET_IDS = ["konami", "broken404", "terminal", "snake", "falseHope"] as const
export type SecretId = (typeof SECRET_IDS)[number]

export type SecretState = Record<SecretId, boolean> & { snakeHighScore: number; completed: boolean }

const STORAGE_KEY = "amer.lol:404-secrets"
const EMPTY_STATE: SecretState = {
  konami: false,
  broken404: false,
  terminal: false,
  snake: false,
  falseHope: false,
  snakeHighScore: 0,
  completed: false,
}

function readState(): SecretState {
  const stored = readStoredJson(STORAGE_KEY)
  if (!stored || typeof stored !== "object") return EMPTY_STATE
  const value = stored as Partial<Record<keyof SecretState, unknown>>
  const highScore = value.snakeHighScore
  return {
    ...EMPTY_STATE,
    ...Object.fromEntries(SECRET_IDS.map((id) => [id, value[id] === true])),
    snakeHighScore: typeof highScore === "number" && Number.isFinite(highScore) ? Math.max(0, highScore) : 0,
    completed: value.completed === true,
  }
}

// A tiny localStorage-backed store: progress survives reloads, renders stay
// hydration-safe (the server snapshot is empty), and updates are synchronous so
// callers know immediately whether an unlock was new.
let snapshot: SecretState | null = null
const listeners = new Set<() => void>()

export function getSecrets(): SecretState {
  return (snapshot ??= readState())
}

function setSecrets(next: SecretState) {
  snapshot = next
  writeStorage(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSecretState(): SecretState {
  return React.useSyncExternalStore(subscribe, getSecrets, () => EMPTY_STATE)
}

export const countSecrets = (state: SecretState) => SECRET_IDS.filter((id) => state[id]).length

/** Records a secret. `completedAll` is true only for the unlock that finds the last one. */
export function unlockSecret(id: SecretId): { unlocked: boolean; completedAll: boolean } {
  const current = getSecrets()
  if (current[id]) return { unlocked: false, completedAll: false }
  const next = { ...current, [id]: true }
  const completedAll = !next.completed && countSecrets(next) === SECRET_IDS.length
  setSecrets(completedAll ? { ...next, completed: true } : next)
  return { unlocked: true, completedAll }
}

export function recordSnakeScore(score: number) {
  const current = getSecrets()
  if (score > current.snakeHighScore) setSecrets({ ...current, snakeHighScore: score })
}
