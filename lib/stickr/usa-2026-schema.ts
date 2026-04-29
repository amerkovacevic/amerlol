export type GroupId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L"

export interface Usa2026Team {
  group: GroupId
  /** Sticker prefix used in the album (country code) */
  code: string
  name: string
}

export const USA_2026_TEAMS: Usa2026Team[] = [
  // Group A
  { group: "A", code: "MEX", name: "Mexico" },
  { group: "A", code: "RSA", name: "South Africa" },
  { group: "A", code: "KOR", name: "Korea Republic" },
  { group: "A", code: "CZE", name: "Czechia" },
  // Group B
  { group: "B", code: "CAN", name: "Canada" },
  { group: "B", code: "BIH", name: "Bosnia and Herzegovina" },
  { group: "B", code: "QAT", name: "Qatar" },
  { group: "B", code: "SUI", name: "Switzerland" },
  // Group C
  { group: "C", code: "BRA", name: "Brazil" },
  { group: "C", code: "MAR", name: "Morocco" },
  { group: "C", code: "HAI", name: "Haiti" },
  { group: "C", code: "SCO", name: "Scotland" },
  // Group D
  { group: "D", code: "USA", name: "USA" },
  { group: "D", code: "PAR", name: "Paraguay" },
  { group: "D", code: "AUS", name: "Australia" },
  { group: "D", code: "TUR", name: "Türkiye" },
  // Group E
  { group: "E", code: "GER", name: "Germany" },
  { group: "E", code: "CUW", name: "Curaçao" },
  { group: "E", code: "CIV", name: "Côte d'Ivoire" },
  { group: "E", code: "ECU", name: "Ecuador" },
  // Group F
  { group: "F", code: "NED", name: "Netherlands" },
  { group: "F", code: "JPN", name: "Japan" },
  { group: "F", code: "SWE", name: "Sweden" },
  { group: "F", code: "TUN", name: "Tunisia" },
  // Group G
  { group: "G", code: "BEL", name: "Belgium" },
  { group: "G", code: "EGY", name: "Egypt" },
  { group: "G", code: "IRN", name: "Iran" },
  { group: "G", code: "NZL", name: "New Zealand" },
  // Group H
  { group: "H", code: "ESP", name: "Spain" },
  { group: "H", code: "CPV", name: "Cabo Verde" },
  { group: "H", code: "KSA", name: "Saudi Arabia" },
  { group: "H", code: "URU", name: "Uruguay" },
  // Group I
  { group: "I", code: "FRA", name: "France" },
  { group: "I", code: "SEN", name: "Senegal" },
  { group: "I", code: "IRQ", name: "Iraq" },
  { group: "I", code: "NOR", name: "Norway" },
  // Group J
  { group: "J", code: "ARG", name: "Argentina" },
  { group: "J", code: "ALG", name: "Algeria" },
  { group: "J", code: "AUT", name: "Austria" },
  { group: "J", code: "JOR", name: "Jordan" },
  // Group K
  { group: "K", code: "POR", name: "Portugal" },
  { group: "K", code: "COD", name: "Congo DR" },
  { group: "K", code: "UZB", name: "Uzbekistan" },
  { group: "K", code: "COL", name: "Colombia" },
  // Group L
  { group: "L", code: "ENG", name: "England" },
  { group: "L", code: "CRO", name: "Croatia" },
  { group: "L", code: "GHA", name: "Ghana" },
  { group: "L", code: "PAN", name: "Panama" },
]

export const USA_2026_GROUPS: { id: GroupId; teams: Usa2026Team[] }[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
].map((g) => ({
  id: g as GroupId,
  teams: USA_2026_TEAMS.filter((t) => t.group === g),
}))

export const USA_2026_TEAM_STICKERS_PER_TEAM = 20
export const USA_2026_FWC_SPECIAL_COUNT = 19

export function makeTeamStickerId(teamCode: string, n: number): string {
  return `${teamCode}-${n}`
}

export function makeFwcStickerId(n: number): string {
  return `FWC-${n}`
}

export function parseUsa2026StickerId(id: string):
  | { kind: "team"; code: string; n: number }
  | { kind: "fwc"; n: number }
  | null {
  const trimmed = id.trim()
  if (!trimmed) return null

  const fwc = /^FWC-(\d+)$/.exec(trimmed)
  if (fwc) return { kind: "fwc", n: parseInt(fwc[1], 10) }

  const team = /^([A-Z]{3})-(\d+)$/.exec(trimmed)
  if (team) return { kind: "team", code: team[1], n: parseInt(team[2], 10) }

  return null
}

export function findTeamByCode(code: string): Usa2026Team | undefined {
  return USA_2026_TEAMS.find((t) => t.code === code)
}

