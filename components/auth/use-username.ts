"use client"

import * as React from "react"
import { doc, onSnapshot } from "firebase/firestore"
import type { User } from "firebase/auth"
import { db } from "@/lib/firebase/config"

/**
 * Live @username for a registered account. Subscribing (rather than reading once)
 * keeps the UI current when the username is chosen during onboarding.
 */
export function useUsername(user: User | null): string | null {
  const [state, setState] = React.useState<{ uid: string; username: string | null } | null>(null)
  const uid = user && !user.isAnonymous ? user.uid : null

  React.useEffect(() => {
    if (!uid) return
    return onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        const username = snapshot.data()?.username
        setState({ uid, username: typeof username === "string" && username.trim() ? username : null })
      },
      () => setState({ uid, username: null })
    )
  }, [uid])

  // Ignore a value that belongs to a previously signed-in account.
  return state?.uid === uid ? state.username : null
}
