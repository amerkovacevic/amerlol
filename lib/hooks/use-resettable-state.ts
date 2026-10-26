import * as React from "react"

/**
 * Local state that starts from `initial` and resets to it whenever `resetKey`
 * changes — e.g. a control that follows a saved default until the user edits it.
 * The reset is derived during render, so there is no effect and no extra
 * render with stale state.
 */
export function useResettableState<T>(initial: T, resetKey: string) {
  const [state, setState] = React.useState({ resetKey, value: initial })
  const value = state.resetKey === resetKey ? state.value : initial

  const setValue = React.useCallback(
    (action: React.SetStateAction<T>) =>
      setState((current) => {
        const base = current.resetKey === resetKey ? current.value : initial
        const next = typeof action === "function" ? (action as (previous: T) => T)(base) : action
        return { resetKey, value: next }
      }),
    [initial, resetKey]
  )

  return [value, setValue] as const
}
