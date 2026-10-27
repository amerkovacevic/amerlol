import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type FieldValue,
} from "firebase/firestore"
import { db } from "@/lib/firebase/db"

/**
 * Watches users/{uid}. `data` is undefined when the profile does not exist yet.
 * Site-wide components import this module lazily, so the Firestore SDK only loads once someone signs in.
 */
export function subscribeToProfile(
  uid: string,
  onData: (data: DocumentData | undefined) => void,
  onError: (error: unknown) => void
) {
  return onSnapshot(doc(db, "users", uid), (snapshot) => onData(snapshot.data()), onError)
}

/** Merges fields into users/{uid}, keeping everything else and stamping `createdAt` on first write. */
export async function saveProfile(uid: string, fields: Record<string, string | FieldValue>) {
  const ref = doc(db, "users", uid)
  const exists = (await getDoc(ref)).exists()
  await setDoc(
    ref,
    { ...fields, updatedAt: serverTimestamp(), ...(exists ? {} : { createdAt: serverTimestamp() }) },
    { merge: true }
  )
}

/** The name other people see for an account: display name, then @username. */
export async function getProfileName(uid: string): Promise<string | null> {
  const profile = (await getDoc(doc(db, "users", uid))).data()
  return profile?.displayName || profile?.username || null
}

/** Resolves many names at once; unknown or unreadable profiles get `fallback`. */
export async function getProfileNames(
  uids: Iterable<string>,
  fallback: string
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    [...new Set(uids)].map(
      async (uid) => [uid, (await getProfileName(uid).catch(() => null)) ?? fallback] as const
    )
  )
  return Object.fromEntries(entries)
}
