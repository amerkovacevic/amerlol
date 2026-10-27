export interface DiffLine {
  type: "equal" | "insert" | "delete"
  content: string
  lineNumber: number
}

export function calculateTextDiff(
  original: string,
  changed: string,
  options: { ignoreCase: boolean; ignoreWhitespace: boolean }
): DiffLine[] {
  const left = original.split("\n"),
    right = changed.split("\n")
  if ((left.length + 1) * (right.length + 1) > 2_000_000)
    throw new Error("This comparison is too large. Compare smaller sections (up to two million line pairs).")
  const normalize = (line: string) => {
    let value = line.replace(/\r$/, "")
    if (options.ignoreWhitespace) value = value.trim()
    return options.ignoreCase ? value.toLowerCase() : value
  }
  const a = left.map(normalize),
    b = right.map(normalize)
  const table = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1))
  for (let i = 1; i <= left.length; i++)
    for (let j = 1; j <= right.length; j++)
      table[i][j] =
        a[i - 1] === b[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1])
  const result: DiffLine[] = []
  let i = left.length,
    j = right.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: "equal", content: left[i - 1], lineNumber: i })
      i--
      j--
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      result.push({ type: "insert", content: right[j - 1], lineNumber: j })
      j--
    } else {
      result.push({ type: "delete", content: left[i - 1], lineNumber: i })
      i--
    }
  }
  return result.reverse()
}
