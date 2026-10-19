import test from "node:test"
import assert from "node:assert/strict"
import {
  getAuthErrorMessage,
  getDataErrorMessage,
  getErrorCode,
} from "../lib/firebase/user-facing-errors.ts"

test("extracts error codes without exposing raw errors", () => {
  assert.equal(getErrorCode({ code: "permission-denied" }), "permission-denied")
  assert.equal(getErrorCode(new Error("private implementation detail")), "")
  assert.equal(getErrorCode(null), "")
})

test("turns authentication errors into clear next steps", () => {
  assert.match(getAuthErrorMessage({ code: "auth/email-already-in-use" }), /signing in/i)
  assert.match(getAuthErrorMessage({ code: "auth/network-request-failed" }), /internet connection/i)
  assert.doesNotMatch(getAuthErrorMessage({ message: "Firebase: internal error" }), /firebase/i)
})

test("turns data errors into non-technical messages", () => {
  assert.match(getDataErrorMessage({ code: "permission-denied" }, "join"), /sign in again/i)
  assert.match(getDataErrorMessage({ code: "aborted" }, "join"), /updated/i)
  assert.equal(getDataErrorMessage({}, "join the exchange"), "We could not join the exchange. Please try again.")
})
