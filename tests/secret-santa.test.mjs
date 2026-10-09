import test from "node:test"
import assert from "node:assert/strict"
import { createSecretSantaAssignments } from "../lib/secret-santa/draw.ts"

test("draw creates a complete one-to-one assignment with no self matches", () => {
  for (let size = 2; size <= 100; size++) {
    const participants = Array.from({ length: size }, (_, index) => `person-${index}`)

    for (let attempt = 0; attempt < 100; attempt++) {
      const assignments = createSecretSantaAssignments(participants)
      assert.equal(Object.keys(assignments).length, size)
      assert.equal(new Set(Object.values(assignments)).size, size)
      participants.forEach((participant) => {
        assert.notEqual(assignments[participant], participant)
        assert.ok(participants.includes(assignments[participant]))
      })
    }
  }
})

test("draw rejects fewer than two or duplicate participants", () => {
  assert.throws(() => createSecretSantaAssignments([]), /At least two/)
  assert.throws(() => createSecretSantaAssignments(["one"]), /At least two/)
  assert.throws(() => createSecretSantaAssignments(["one", "one"]), /unique/)
})

test("draw does not mutate the participant list", () => {
  const participants = ["a", "b", "c"]
  createSecretSantaAssignments(participants, () => 0)
  assert.deepEqual(participants, ["a", "b", "c"])
})
