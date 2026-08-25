import { onAuthStateChanged } from "firebase/auth"
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase/config"
import type { LocalTarkovProfile } from "@/lib/tarkov/storage/profile"
import type { HideoutProgress } from "@/lib/tarkov/storage/hideout-progress"
import type { QuestProgress, QuestPresence, TarkovGameMode } from "@/lib/tarkov/types"

export interface CloudTarkovSnapshot {
  profile?: LocalTarkovProfile
  presence: Record<string, QuestPresence>
  progress: Record<string, QuestProgress>
  hideout: HideoutProgress
}

function currentUid(): string | undefined {
  return typeof window !== "undefined" ? auth?.currentUser?.uid : undefined
}

function profileRef(uid: string, mode: TarkovGameMode) {
  return doc(db, "users", uid, "tarkovProfiles", mode)
}

export async function syncTarkovProfile(mode: TarkovGameMode, profile: LocalTarkovProfile): Promise<void> {
  const uid = currentUid()
  if (!uid || !db) return
  await setDoc(profileRef(uid, mode), { mode, level: profile.level, faction: profile.faction, updatedAt: serverTimestamp() }, { merge: true })
}

export async function syncQuestPresenceEntry(mode: TarkovGameMode, entry: QuestPresence): Promise<void> {
  const uid = currentUid()
  if (!uid || !db) return
  await setDoc(doc(db, "users", uid, "tarkovProfiles", mode, "questPresence", entry.questId), { ...entry, updatedAtServer: serverTimestamp() }, { merge: true })
}

export async function deleteQuestPresenceEntry(mode: TarkovGameMode, questId: string): Promise<void> {
  const uid = currentUid()
  if (!uid || !db) return
  await deleteDoc(doc(db, "users", uid, "tarkovProfiles", mode, "questPresence", questId))
}

export async function syncQuestProgressEntry(mode: TarkovGameMode, entry: QuestProgress): Promise<void> {
  const uid = currentUid()
  if (!uid || !db) return
  await setDoc(doc(db, "users", uid, "tarkovProfiles", mode, "questProgress", entry.questId), { ...entry, updatedAtServer: serverTimestamp() }, { merge: true })
}

export async function deleteQuestProgressEntry(mode: TarkovGameMode, questId: string): Promise<void> {
  const uid = currentUid()
  if (!uid || !db) return
  await deleteDoc(doc(db, "users", uid, "tarkovProfiles", mode, "questProgress", questId))
}

export async function syncHideoutStation(mode: TarkovGameMode, stationId: string, level: number): Promise<void> {
  const uid = currentUid()
  if (!uid || !db) return
  await setDoc(doc(db, "users", uid, "tarkovProfiles", mode, "hideout", stationId), { stationId, level, updatedAt: serverTimestamp() }, { merge: true })
}

export async function clearCloudHideoutProgress(mode: TarkovGameMode): Promise<void> {
  const uid = currentUid()
  if (!uid || !db) return
  const snapshots = await getDocs(collection(db, "users", uid, "tarkovProfiles", mode, "hideout"))
  await Promise.all(snapshots.docs.map((snapshot) => deleteDoc(snapshot.ref)))
}

export async function loadTarkovCloudSnapshot(mode: TarkovGameMode): Promise<CloudTarkovSnapshot | undefined> {
  const uid = currentUid()
  if (!uid || !db) return undefined

  const [profileSnap, presenceSnap, progressSnap, hideoutSnap] = await Promise.all([
    getDoc(profileRef(uid, mode)),
    getDocs(collection(db, "users", uid, "tarkovProfiles", mode, "questPresence")),
    getDocs(collection(db, "users", uid, "tarkovProfiles", mode, "questProgress")),
    getDocs(collection(db, "users", uid, "tarkovProfiles", mode, "hideout")),
  ])

  const profileData = profileSnap.data()
  const profile = profileData && typeof profileData.level === "number"
    ? { level: Math.max(1, Math.floor(profileData.level)), faction: profileData.faction === "BEAR" ? "BEAR" as const : "USEC" as const }
    : undefined

  const presence = Object.fromEntries(
    presenceSnap.docs.map((snapshot) => snapshot.data() as QuestPresence).filter((entry) => typeof entry.questId === "string").map((entry) => [entry.questId, entry])
  )
  const progress = Object.fromEntries(
    progressSnap.docs.map((snapshot) => snapshot.data() as QuestProgress).filter((entry) => typeof entry.questId === "string").map((entry) => [entry.questId, entry])
  )
  const hideout = Object.fromEntries(
    hideoutSnap.docs
      .map((snapshot) => snapshot.data() as { stationId?: string; level?: number })
      .filter((entry): entry is { stationId: string; level: number } => typeof entry.stationId === "string" && typeof entry.level === "number")
      .map((entry) => [entry.stationId, Math.max(0, Math.floor(entry.level))])
  )

  return { profile, presence, progress, hideout }
}

export function subscribeTarkovAuth(callback: (signedIn: boolean) => void): () => void {
  if (typeof window === "undefined" || !auth) return () => undefined
  return onAuthStateChanged(auth, (user) => callback(Boolean(user)))
}
