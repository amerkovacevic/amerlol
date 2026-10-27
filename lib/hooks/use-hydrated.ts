import * as React from "react"

const subscribe = () => () => {}

/**
 * False during server rendering and hydration, true afterwards. Use it to render
 * browser-only values (random ids, the resolved theme) without hydration
 * mismatches or a setState-in-effect "mounted" flag.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
