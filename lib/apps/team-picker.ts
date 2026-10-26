export interface Team {
  id: string
  name: string
  city: string
  stadium?: string
  capacity?: number
  established?: number
  rivalry?: string[]
}

export interface League {
  id: string
  name: string
  tier: number
  teams: Team[]
}

export interface Country {
  id: string
  name: string
  flag: string
  leagues: League[]
}

export interface LocatedTeam extends Team {
  countryId: string
  leagueId: string
  countryName: string
  leagueName: string
  tier: number
}

export interface PickOptions {
  count: number
  sameCountry: boolean
  sameLeague: boolean
}

export function flattenTeams(countries: readonly Country[]): LocatedTeam[] {
  return countries.flatMap((country) =>
    country.leagues.flatMap((league) =>
      league.teams.map((team) => ({
        ...team,
        countryId: country.id,
        leagueId: league.id,
        countryName: country.name,
        leagueName: league.name,
        tier: league.tier,
      }))
    )
  )
}

/**
 * Picks up to `count` distinct teams. With a same-country or same-league
 * constraint every pick after the first comes from the first pick's group; if
 * that group runs out, picking continues from everything left and `relaxed`
 * reports which constraint gave way.
 */
export function pickTeams(
  available: readonly LocatedTeam[],
  { count, sameCountry, sameLeague }: PickOptions,
  random: () => number = Math.random
): { picked: LocatedTeam[]; relaxed: "country" | "league" | null } {
  let remaining = [...available]
  const picked: LocatedTeam[] = []
  let relaxed: "country" | "league" | null = null

  while (picked.length < count && remaining.length) {
    const first = picked[0]
    let pool = remaining
    if (first && sameCountry) {
      const sameGroup = pool.filter((team) => team.countryId === first.countryId)
      if (sameGroup.length) pool = sameGroup
      else relaxed ??= "country"
    }
    if (first && sameLeague) {
      const sameGroup = pool.filter((team) => team.leagueId === first.leagueId)
      if (sameGroup.length) pool = sameGroup
      else relaxed ??= "league"
    }
    const team = pool[Math.floor(random() * pool.length)]
    picked.push(team)
    remaining = remaining.filter(({ id }) => id !== team.id)
  }

  return { picked, relaxed }
}
