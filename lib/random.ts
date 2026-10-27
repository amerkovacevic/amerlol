/** Unbiased Fisher–Yates shuffle that returns a new array. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Deterministic pseudo-random numbers in [0, 1) for a string seed (mulberry32). */
export function seededRandom(seed: string): () => number {
  let state = 0
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 0x9e3779b1)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
