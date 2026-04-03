/** Human-readable ranges for sticker numbers, e.g. "1, 5, 12–15, 20" */
export function formatStickerList(nums: number[]): string {
  const sorted = [...new Set(nums)].sort((a, b) => a - b)
  if (sorted.length === 0) return "—"
  const parts: string[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++
    if (i === j) parts.push(String(sorted[i]))
    else if (j === i + 1) parts.push(`${sorted[i]}, ${sorted[j]}`)
    else parts.push(`${sorted[i]}–${sorted[j]}`)
    i = j + 1
  }
  return parts.join(", ")
}

export function filterToAlbum(nums: number[], stickerCount: number): number[] {
  return nums.filter((n) => n >= 1 && n <= stickerCount).sort((a, b) => a - b)
}
