"use client"

import * as React from "react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type Point = { x: number; y: number }

const SIZE = 16
const TICK_MS = 125
const SWIPE_THRESHOLD_PX = 18
const MILESTONES: Record<number, string> = {
  5: "Still lost.",
  10: "You're actually playing this?",
  20: "There are real pages on this website.",
  30: "Please consider going outside.",
  40: "Amer.lol Productivity Department has been notified.",
  50: "I genuinely did not plan for anyone to get this far.",
}
const UP = { x: 0, y: -1 }
const DOWN = { x: 0, y: 1 }
const LEFT = { x: -1, y: 0 }
const RIGHT = { x: 1, y: 0 }
const KEY_DIRECTIONS: Record<string, Point> = {
  ArrowUp: UP,
  w: UP,
  ArrowDown: DOWN,
  s: DOWN,
  ArrowLeft: LEFT,
  a: LEFT,
  ArrowRight: RIGHT,
  d: RIGHT,
}

interface GameState {
  snake: Point[]
  food: Point
  score: number
  dead: boolean
  /** Direction of the last move; steering is validated against it, not the queued turn. */
  heading: Point
  queued: Point
}

type Action = { type: "tick"; random: number } | { type: "steer"; direction: Point } | { type: "restart" }

export const INITIAL_STATE: GameState = {
  snake: [
    { x: 7, y: 8 },
    { x: 6, y: 8 },
    { x: 5, y: 8 },
  ],
  food: { x: 12, y: 8 },
  score: 0,
  dead: false,
  heading: RIGHT,
  queued: RIGHT,
}

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

// Pure: randomness arrives with the action so React may safely replay it.
export function snakeReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "restart":
      return INITIAL_STATE
    case "steer": {
      const { direction } = action
      const reverses = direction.x + state.heading.x === 0 && direction.y + state.heading.y === 0
      return state.dead || reverses ? state : { ...state, queued: direction }
    }
    case "tick": {
      if (state.dead) return state
      const heading = state.queued
      const head = { x: state.snake[0].x + heading.x, y: state.snake[0].y + heading.y }
      const ate = samePoint(head, state.food)
      // The tail moves away this tick unless the snake grows.
      const body = ate ? state.snake : state.snake.slice(0, -1)
      const hitWall = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE
      if (hitWall || body.some((part) => samePoint(part, head))) return { ...state, dead: true }

      const snake = [head, ...body]
      if (!ate) return { ...state, snake, heading }
      const free: Point[] = []
      for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
          if (!snake.some((part) => part.x === x && part.y === y)) free.push({ x, y })
      if (!free.length) return { ...state, snake, heading, score: state.score + 1, dead: true }
      return {
        ...state,
        snake,
        heading,
        score: state.score + 1,
        food: free[Math.floor(action.random * free.length)],
      }
    }
  }
}

export function SnakeGame({
  best,
  onScore,
  onClose,
}: {
  best: number
  onScore: (score: number) => void
  onClose: () => void
}) {
  const [{ snake, food, score, dead }, dispatch] = React.useReducer(snakeReducer, INITIAL_STATE)
  const touchStart = React.useRef<Point | null>(null)
  const steer = (direction: Point) => dispatch({ type: "steer", direction })

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[event.key]
      if (!direction) return
      event.preventDefault()
      dispatch({ type: "steer", direction })
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  React.useEffect(() => {
    if (dead) return
    const timer = setInterval(() => dispatch({ type: "tick", random: Math.random() }), TICK_MS)
    return () => clearInterval(timer)
  }, [dead])

  // Persist new high scores as they happen.
  React.useEffect(() => {
    if (score > 0) onScore(score)
  }, [score, onScore])

  const swipeEnd = (event: React.TouchEvent) => {
    const start = touchStart.current
    if (!start) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) return
    steer(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) })
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-background/95 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-sm">
            <b>SCORE {String(score).padStart(2, "0")}</b>
            <span className="ml-5 text-muted-foreground">BEST {Math.max(best, score)}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close game">
            <X />
          </Button>
        </div>
        <div
          className="relative aspect-square overflow-hidden rounded-2xl border bg-card shadow-2xl touch-none"
          onTouchStart={(event) =>
            (touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY })
          }
          onTouchEnd={swipeEnd}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--border)) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--border)) 1px,transparent 1px)",
              backgroundSize: `${100 / SIZE}% ${100 / SIZE}%`,
            }}
          />
          {snake.map((p, i) => (
            <div
              key={`${p.x}-${p.y}`}
              className="absolute rounded-[3px] bg-primary"
              style={{
                left: `${(p.x * 100) / SIZE}%`,
                top: `${(p.y * 100) / SIZE}%`,
                width: `${100 / SIZE}%`,
                height: `${100 / SIZE}%`,
                opacity: 1 - i / (snake.length * 1.5),
              }}
            />
          ))}
          <div
            className="absolute grid place-items-center rounded-sm bg-foreground font-mono text-[7px] font-black text-background"
            style={{
              left: `${(food.x * 100) / SIZE}%`,
              top: `${(food.y * 100) / SIZE}%`,
              width: `${100 / SIZE}%`,
              height: `${100 / SIZE}%`,
            }}
          >
            404
          </div>
          {dead && (
            <div className="absolute inset-0 grid place-items-center bg-background/75 backdrop-blur-sm">
              <div className="text-center">
                <h3 className="text-3xl font-bold">GAME OVER</h3>
                <p className="mb-4 text-sm text-muted-foreground">Even the snake found a dead end.</p>
                <Button onClick={() => dispatch({ type: "restart" })}>Try Again</Button>
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 min-h-5 text-center text-sm text-muted-foreground">
          {MILESTONES[score] || "Use arrow keys, WASD, swipe, or the controls."}
        </p>
        <div className="mx-auto mt-2 grid w-36 grid-cols-3 gap-1 sm:hidden">
          <span />
          <Button size="icon" variant="outline" onClick={() => steer(UP)} aria-label="Move up">
            <ArrowUp />
          </Button>
          <span />
          <Button size="icon" variant="outline" onClick={() => steer(LEFT)} aria-label="Move left">
            <ArrowLeft />
          </Button>
          <Button size="icon" variant="outline" onClick={() => steer(DOWN)} aria-label="Move down">
            <ArrowDown />
          </Button>
          <Button size="icon" variant="outline" onClick={() => steer(RIGHT)} aria-label="Move right">
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
