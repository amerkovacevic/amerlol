import { describe, expect, it } from "vitest"
import { INITIAL_STATE, snakeReducer } from "../components/not-found/snake-game"

const tick = (state = INITIAL_STATE) => snakeReducer(state, { type: "tick", random: 0 })
const steer = (state: typeof INITIAL_STATE, x: number, y: number) =>
  snakeReducer(state, { type: "steer", direction: { x, y } })

describe("404 snake", () => {
  it("cannot reverse into itself with two quick turns inside one tick", () => {
    // Moving right: up then left before the next tick must not queue a reversal.
    const state = steer(steer(INITIAL_STATE, 0, -1), -1, 0)
    expect(state.queued).toEqual({ x: 0, y: -1 })
    expect(tick(state).dead).toBe(false)
  })

  it("grows and scores when it eats, placing food on a free cell", () => {
    let state = INITIAL_STATE
    for (let step = 0; step < 5; step++) state = tick(state)
    expect(state.score).toBe(1)
    expect(state.snake).toHaveLength(4)
    expect(state.snake.some((part) => part.x === state.food.x && part.y === state.food.y)).toBe(false)
  })

  it("dies at the wall and ignores input afterwards", () => {
    let state = steer(INITIAL_STATE, 0, -1)
    for (let step = 0; step < 9; step++) state = tick(state)
    expect(state.dead).toBe(true)
    expect(steer(state, 1, 0)).toBe(state)
  })
})
