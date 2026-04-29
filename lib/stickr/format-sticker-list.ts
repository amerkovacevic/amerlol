import { parseUsa2026StickerId } from "./usa-2026-schema"
import { parseQatar2022StickerId } from "./qatar-2022-schema"

function formatRanges(sortedUnique: number[]): string {
  if (sortedUnique.length === 0) return "—"
  const parts: string[] = []
  let i = 0
  while (i < sortedUnique.length) {
    let j = i
    while (j + 1 < sortedUnique.length && sortedUnique[j + 1] === sortedUnique[j] + 1) j++
    if (i === j) parts.push(String(sortedUnique[i]))
    else if (j === i + 1) parts.push(`${sortedUnique[i]}, ${sortedUnique[j]}`)
    else parts.push(`${sortedUnique[i]}–${sortedUnique[j]}`)
    i = j + 1
  }
  return parts.join(", ")
}

/** Human-readable ranges for numeric sticker IDs, e.g. "1, 5, 12–15, 20" */
export function formatNumericStickerList(ids: string[]): string {
  const nums = ids
    .map((s) => (typeof s === "string" ? parseInt(s, 10) : NaN))
    .filter((n) => Number.isFinite(n))
    .map((n) => n as number)
  const sorted = [...new Set(nums)].sort((a, b) => a - b)
  return formatRanges(sorted)
}

/**
 * USA 2026 formatting: groups by team code and "FWC" specials.
 * Example:
 * - "USA: 1–3, 7 · MEX: 2, 9 · FWC: 1, 5"
 */
export function formatUsa2026StickerList(ids: string[]): string {
  const byTeam = new Map<string, number[]>()
  const fwc: number[] = []

  for (const id of ids) {
    if (typeof id !== "string") continue
    const parsed = parseUsa2026StickerId(id)
    if (!parsed) continue
    if (parsed.kind === "fwc") {
      if (Number.isFinite(parsed.n)) fwc.push(parsed.n)
      continue
    }
    if (parsed.kind === "team") {
      if (!Number.isFinite(parsed.n)) continue
      const arr = byTeam.get(parsed.code) ?? []
      arr.push(parsed.n)
      byTeam.set(parsed.code, arr)
    }
  }

  const chunks: string[] = []
  const teamCodes = [...byTeam.keys()].sort((a, b) => a.localeCompare(b))
  for (const code of teamCodes) {
    const nums = [...new Set(byTeam.get(code) ?? [])].sort((a, b) => a - b)
    chunks.push(`${code}: ${formatRanges(nums)}`)
  }

  const fwcNums = [...new Set(fwc)].sort((a, b) => a - b)
  if (fwcNums.length) chunks.push(`FWC: ${formatRanges(fwcNums)}`)

  return chunks.length ? chunks.join(" · ") : "—"
}

/**
 * Qatar 2022 formatting: same structure as USA 2026 (team code + ranges, plus FWC specials).
 */
export function formatQatar2022StickerList(ids: string[]): string {
  const byTeam = new Map<string, number[]>()
  const fwc: number[] = []

  for (const id of ids) {
    if (typeof id !== "string") continue
    const parsed = parseQatar2022StickerId(id)
    if (!parsed) continue
    if (parsed.kind === "fwc") {
      if (Number.isFinite(parsed.n)) fwc.push(parsed.n)
      continue
    }
    if (parsed.kind === "team") {
      if (!Number.isFinite(parsed.n)) continue
      const arr = byTeam.get(parsed.code) ?? []
      arr.push(parsed.n)
      byTeam.set(parsed.code, arr)
    }
  }

  const chunks: string[] = []
  const teamCodes = [...byTeam.keys()].sort((a, b) => a.localeCompare(b))
  for (const code of teamCodes) {
    const nums = [...new Set(byTeam.get(code) ?? [])].sort((a, b) => a - b)
    chunks.push(`${code}: ${formatRanges(nums)}`)
  }

  const fwcNums = [...new Set(fwc)].sort((a, b) => a - b)
  if (fwcNums.length) chunks.push(`FWC: ${formatRanges(fwcNums)}`)

  return chunks.length ? chunks.join(" · ") : "—"
}

export function filterNumericToAlbum(ids: string[], stickerCount: number): string[] {
  return ids
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .filter((s) => {
      const n = parseInt(s, 10)
      return Number.isFinite(n) && n >= 1 && n <= stickerCount
    })
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
}

