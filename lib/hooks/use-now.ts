import * as React from "react"

/**
 * The current time, refreshed every `intervalMs` while `live` is true. `null`
 * during server rendering and hydration, so clocks never cause a hydration
 * mismatch; it is set from the interval callback rather than in the effect body.
 */
export function useNow(intervalMs = 1000, live = true): Date | null {
  const [now, setNow] = React.useState<Date | null>(null)

  React.useEffect(() => {
    const tick = () => setNow(new Date())
    const first = setTimeout(tick, 0)
    if (!live) return () => clearTimeout(first)
    const timer = setInterval(tick, intervalMs)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [intervalMs, live])

  return now
}
