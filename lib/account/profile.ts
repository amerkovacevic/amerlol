import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

/** The name other people see for an account: display name, then @username. */
export async function getProfileName(uid: string): Promise<string | null> {
  const profile = (await getDoc(doc(db, "users", uid))).data()
  return profile?.displayName || profile?.username || null
}

/** Resolves many names at once; unknown or unreadable profiles get `fallback`. */
export async function getProfileNames(uids: Iterable<string>, fallback: string): Promise<Record<string, string>> {
  const entries = await Promise.all(
    [...new Set(uids)].map(async (uid) => [uid, (await getProfileName(uid).catch(() => null)) ?? fallback] as const)
  )
  return Object.fromEntries(entries)
}
