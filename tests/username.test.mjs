import test from "node:test"
import assert from "node:assert/strict"
import { getUsernameError, normalizeUsernameInput } from "../lib/account/username.ts"

test("username input removes an @ prefix and unsupported characters", () => {
  assert.equal(normalizeUsernameInput("@@Amer Person!"), "AmerPerson")
  assert.equal(normalizeUsernameInput("amer_lol"), "amer_lol")
})

test("username validation enforces a readable handle", () => {
  assert.match(getUsernameError("ab") || "", /at least 3/)
  assert.match(getUsernameError("amer-lol") || "", /letters, numbers, and underscores/)
  assert.equal(getUsernameError("amer_lol"), null)
})
