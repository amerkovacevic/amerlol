import * as React from "react"

type AsyncState<T> = { key: string; data?: T; error?: unknown }

/**
 * Runs `load` whenever `key` changes (pass `null` to wait) and exposes the result
 * for that key only. Loading is derived from whether the stored result belongs
 * to the current key, so responses for a previous user or query are never shown
 * and no state is set synchronously inside the effect.
 */
export function useAsync<T>(key: string | null, load: () => Promise<T>) {
  const [state, setState] = React.useState<AsyncState<T> | null>(null)
  const [attempt, setAttempt] = React.useState(0)
  const loadRef = React.useRef(load)

  React.useLayoutEffect(() => {
    loadRef.current = load
  })

  const requestKey = key === null ? null : `${key}#${attempt}`

  React.useEffect(() => {
    if (requestKey === null) return
    let active = true
    loadRef.current().then(
      (data) => active && setState({ key: requestKey, data }),
      (error: unknown) => active && setState({ key: requestKey, error })
    )
    return () => {
      active = false
    }
  }, [requestKey])

  const current = state?.key === requestKey ? state : undefined
  return {
    data: current?.data,
    error: current?.error,
    loading: !current,
    reload: React.useCallback(() => setAttempt((value) => value + 1), []),
  }
}
