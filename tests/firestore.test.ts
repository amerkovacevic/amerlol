// This suite is run only against a local demo-project emulator, never a live project.
import { readFileSync } from "node:fs"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore"
import { SETTINGS, defaultSettings } from "../lib/apps/settings"
import { changeGameMembership } from "../lib/apps/game-membership"

let environment: RulesTestEnvironment
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST)
    throw new Error("Run npm run test:rules against the demo emulator")
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":")
  environment = await initializeTestEnvironment({
    projectId: "demo-amerlol-audit",
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync("firestore.rules", "utf8"),
    },
  })
}, 30000)
beforeEach(async () => {
  await environment.clearFirestore()
})
afterAll(async () => {
  await environment?.cleanup()
})
const database = (uid?: string) =>
  uid ? environment.authenticatedContext(uid).firestore() : environment.unauthenticatedContext().firestore()
async function seed(path: string, value: Record<string, unknown>) {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), value)
  })
}

describe("account preference access and validation", () => {
  for (const [appId, definition] of Object.entries(SETTINGS)) {
    if (!("collection" in definition)) continue
    const path = `users/alice/${definition.collection}/default`
    it(`${appId}: isolates owners, validates writes, preserves legacy fields and blocks deletion`, async () => {
      const values = defaultSettings(appId as keyof typeof SETTINGS)
      await assertSucceeds(
        setDoc(doc(database("alice"), path), {
          ...values,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
      await assertSucceeds(getDoc(doc(database("alice"), path)))
      await assertFails(getDoc(doc(database("bob"), path)))
      await assertFails(getDoc(doc(database(), path)))
      await assertFails(
        updateDoc(doc(database("bob"), path), {
          ...values,
          updatedAt: serverTimestamp(),
        })
      )
      const firstKey = Object.keys(values)[0]
      await assertFails(
        updateDoc(doc(database("alice"), path), {
          [firstKey]: null,
          updatedAt: serverTimestamp(),
        })
      )
      await assertFails(
        updateDoc(doc(database("alice"), path), {
          surpriseField: "forbidden",
          updatedAt: serverTimestamp(),
        })
      )
      await assertFails(
        updateDoc(doc(database("alice"), path), {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
      await assertFails(deleteDoc(doc(database("alice"), path)))
      await seed(path, {
        ...values,
        futureField: "keep",
        createdAt: "original",
      })
      await assertSucceeds(
        updateDoc(doc(database("alice"), path), {
          ...values,
          updatedAt: serverTimestamp(),
        })
      )
      expect((await getDoc(doc(database("alice"), path))).data()?.futureField).toBe("keep")
      expect((await getDoc(doc(database("alice"), path))).data()?.createdAt).toBe("original")
    })
  }
  it("rejects invalid ranges and lengths", async () => {
    await assertFails(
      setDoc(doc(database("alice"), "users/alice/encryptionSettings/default"), {
        fontSize: 99999,
        updatedAt: serverTimestamp(),
      })
    )
    await assertFails(
      setDoc(doc(database("alice"), "users/alice/stlMonitorSettings/default"), {
        defaultSeverityRange: [80, 10],
        updatedAt: serverTimestamp(),
      })
    )
    await assertFails(
      setDoc(doc(database("alice"), "users/alice/timezoneSettings/default"), {
        defaultTimeZones: [],
        updatedAt: serverTimestamp(),
      })
    )
  })
})

describe("game membership", () => {
  const gamePath = "games/game"
  beforeEach(async () => {
    await seed(gamePath, {
      createdBy: "owner",
      maxPlayers: 2,
      players: ["alice"],
    })
  })
  it("allows joining and leaving only yourself", async () => {
    await assertSucceeds(
      updateDoc(doc(database("bob"), gamePath), {
        players: ["alice", "bob"],
        updatedAt: serverTimestamp(),
      })
    )
    await assertFails(
      updateDoc(doc(database("eve"), gamePath), {
        players: ["eve", "bob"],
        updatedAt: serverTimestamp(),
      })
    )
    await assertFails(
      updateDoc(doc(database("eve"), gamePath), {
        players: ["alice", "bob", "eve"],
        updatedAt: serverTimestamp(),
      })
    )
    await assertFails(
      updateDoc(doc(database("owner"), gamePath), {
        players: [],
        updatedAt: serverTimestamp(),
      })
    )
    await assertSucceeds(
      updateDoc(doc(database("bob"), gamePath), {
        players: ["alice"],
        updatedAt: serverTimestamp(),
      })
    )
  })
  it("serializes competing joins without dropping players or exceeding capacity", async () => {
    const join = (uid: string) => {
      const db = database(uid)
      return runTransaction(db, async (transaction) => {
        const ref = doc(db, gamePath),
          snapshot = await transaction.get(ref),
          game = snapshot.data()!
        transaction.update(ref, {
          players: changeGameMembership(game.players, uid, game.maxPlayers, true),
          updatedAt: serverTimestamp(),
        })
      })
    }
    const result = await Promise.allSettled([join("bob"), join("carol")])
    expect(result.filter((item) => item.status === "fulfilled")).toHaveLength(1)
    const players = (await getDoc(doc(database(), gamePath))).data()!.players
    expect(players).toHaveLength(2)
    expect(players).toContain("alice")
  })
})

describe("private data and unknown collections", () => {
  it("allows a first Santa participant to add only their own name and responses", async () => {
    const path = "secretSantaExchanges/legacy"
    await seed(path, {
      createdBy: "owner",
      participants: ["owner"],
      drawn: false,
    })
    const ref = doc(database("alice"), path)
    await assertFails(
      updateDoc(ref, {
        participants: ["owner", "alice"],
        participantNames: { owner: "Impersonated", alice: "Alice" },
        participantResponses: {},
        updatedAt: serverTimestamp(),
      })
    )
    await assertFails(
      updateDoc(ref, {
        participants: ["owner", "alice"],
        participantNames: { alice: "Alice" },
        participantResponses: { owner: { gift: "Tampered" } },
        updatedAt: serverTimestamp(),
      })
    )
    await assertSucceeds(
      updateDoc(ref, {
        participants: ["owner", "alice"],
        participantNames: { alice: "Alice" },
        participantResponses: { alice: { gift: "Book" } },
        updatedAt: serverTimestamp(),
      })
    )
  })
  it("denies access to another user's profile, sticker lists and private Santa assignment", async () => {
    await seed("users/alice", { email: "private@example.test" })
    await seed("users/alice/stickrSettings/default", { duplicates: ["FWC-1"] })
    await seed("secretSantaExchanges/exchange/assignments/alice", {
      receiverId: "bob",
    })
    for (const path of [
      "users/alice",
      "users/alice/stickrSettings/default",
      "secretSantaExchanges/exchange/assignments/alice",
    ]) {
      await assertFails(getDoc(doc(database("eve"), path)))
      await assertSucceeds(getDoc(doc(database("alice"), path)))
    }
    await assertFails(setDoc(doc(database("alice"), "unknown/item"), { value: "no" }))
  })
})
