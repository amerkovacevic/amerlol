export type Qatar2022GroupId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"

export interface Qatar2022Team {
  group: Qatar2022GroupId
  /** Sticker prefix used in the album (country code) */
  code: string
  name: string
}

// Groups per the attached image (A–H).
export const QATAR_2022_TEAMS: Qatar2022Team[] = [
  // Group A
  { group: "A", code: "QAT", name: "Qatar" },
  { group: "A", code: "ECU", name: "Ecuador" },
  { group: "A", code: "SEN", name: "Senegal" },
  { group: "A", code: "NED", name: "Netherlands" },
  // Group B
  { group: "B", code: "ENG", name: "England" },
  { group: "B", code: "IRN", name: "Iran" },
  { group: "B", code: "USA", name: "United States" },
  { group: "B", code: "WAL", name: "Wales" },
  // Group C
  { group: "C", code: "ARG", name: "Argentina" },
  { group: "C", code: "KSA", name: "Saudi Arabia" },
  { group: "C", code: "MEX", name: "Mexico" },
  { group: "C", code: "POL", name: "Poland" },
  // Group D
  { group: "D", code: "FRA", name: "France" },
  { group: "D", code: "AUS", name: "Australia" },
  { group: "D", code: "DEN", name: "Denmark" },
  { group: "D", code: "TUN", name: "Tunisia" },
  // Group E
  { group: "E", code: "ESP", name: "Spain" },
  { group: "E", code: "CRC", name: "Costa Rica" },
  { group: "E", code: "GER", name: "Germany" },
  { group: "E", code: "JPN", name: "Japan" },
  // Group F
  { group: "F", code: "BEL", name: "Belgium" },
  { group: "F", code: "CAN", name: "Canada" },
  { group: "F", code: "MAR", name: "Morocco" },
  { group: "F", code: "CRO", name: "Croatia" },
  // Group G
  { group: "G", code: "BRA", name: "Brazil" },
  { group: "G", code: "SRB", name: "Serbia" },
  { group: "G", code: "SUI", name: "Switzerland" },
  { group: "G", code: "CMR", name: "Cameroon" },
  // Group H
  { group: "H", code: "POR", name: "Portugal" },
  { group: "H", code: "GHA", name: "Ghana" },
  { group: "H", code: "URU", name: "Uruguay" },
  { group: "H", code: "KOR", name: "South Korea" },
]

export const QATAR_2022_GROUPS: { id: Qatar2022GroupId; teams: Qatar2022Team[] }[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
].map((g) => ({
  id: g as Qatar2022GroupId,
  teams: QATAR_2022_TEAMS.filter((t) => t.group === g),
}))

export const QATAR_2022_TEAM_STICKERS_PER_TEAM = 20
export const QATAR_2022_FWC_SPECIAL_COUNT = 18

export function makeQatar2022TeamStickerId(teamCode: string, n: number): string {
  return `${teamCode}-${n}`
}

export function makeQatar2022FwcStickerId(n: number): string {
  return `FWC-${n}`
}

export function parseQatar2022StickerId(id: string):
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

export function findQatar2022TeamByCode(code: string): Qatar2022Team | undefined {
  return QATAR_2022_TEAMS.find((t) => t.code === code)
}

