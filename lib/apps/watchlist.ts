export interface Movie {
  id: string
  name: string
  year?: string
  uri?: string
}

export function safeMovieUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  try {
    const url = new URL(value)
    return url.protocol === "https:" &&
      (url.hostname === "letterboxd.com" || url.hostname.endsWith(".letterboxd.com")) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

export function isMovieList(value: unknown): value is Movie[] {
  return (
    Array.isArray(value) &&
    value.every(
      (movie) =>
        movie &&
        typeof movie.id === "string" &&
        typeof movie.name === "string" &&
        (movie.year === undefined || typeof movie.year === "string") &&
        (movie.uri === undefined || typeof movie.uri === "string")
    )
  )
}

export function parseLetterboxdCsv(text: string): Movie[] {
  if (text.length > 5_000_000) throw new Error("Watchlists must be smaller than 5 MB")
  const rows: string[][] = []
  let row: string[] = [],
    value = "",
    quoted = false
  const source = text.replace(/^\uFEFF/, "")
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char === '"' && quoted && source[index + 1] === '"') {
      value += '"'
      index++
    } else if (char === '"') quoted = !quoted
    else if (char === "," && !quoted) {
      row.push(value.trim())
      value = ""
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index++
      row.push(value.trim())
      rows.push(row)
      row = []
      value = ""
    } else value += char
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field")
  if (value || row.length) {
    row.push(value.trim())
    rows.push(row)
  }
  if (rows.length < 2) return []
  const headers = rows[0].map((header) => header.toLowerCase())
  const nameAt = headers.indexOf("name"),
    yearAt = headers.indexOf("year"),
    uriAt = headers.findIndex((header) => header.includes("letterboxd uri"))
  if (nameAt < 0) return []
  const seen = new Set<string>(),
    movies: Movie[] = []
  for (const fields of rows.slice(1)) {
    const name = fields[nameAt]?.trim(),
      year = fields[yearAt]?.trim()
    if (!name) continue
    const key = `${name.toLowerCase()}-${year ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)
    movies.push({
      id: `import-${Date.now()}-${movies.length}`,
      name,
      ...(year ? { year } : {}),
      ...(safeMovieUrl(fields[uriAt]) ? { uri: safeMovieUrl(fields[uriAt]) } : {}),
    })
  }
  return movies
}
