import { describe, expect, it } from "vitest"
import { flattenTeams, pickTeams, type Country } from "../lib/apps/team-picker"

const team = (id: string) => ({ id, name: id, city: id })
const countries: Country[] = [
  {
    id: "eng",
    name: "England",
    flag: "",
    leagues: [
      { id: "pl", name: "Premier League", tier: 1, teams: [team("a"), team("b")] },
      { id: "champ", name: "Championship", tier: 2, teams: [team("c")] },
    ],
  },
  { id: "esp", name: "Spain", flag: "", leagues: [{ id: "liga", name: "La Liga", tier: 1, teams: [team("d")] }] },
]
const teams = flattenTeams(countries)
const first = () => 0

describe("team picker", () => {
  it("annotates every team with its country, league and tier", () => {
    expect(teams.map(({ id, countryId, leagueId, tier }) => [id, countryId, leagueId, tier])).toEqual([
      ["a", "eng", "pl", 1],
      ["b", "eng", "pl", 1],
      ["c", "eng", "champ", 2],
      ["d", "esp", "liga", 1],
    ])
  })

  it("never picks the same team twice and stops when teams run out", () => {
    const { picked } = pickTeams(teams, { count: 10, sameCountry: false, sameLeague: false })
    expect(new Set(picked.map(({ id }) => id)).size).toBe(4)
  })

  it("keeps later picks in the first pick's league while possible", () => {
    const { picked, relaxed } = pickTeams(teams, { count: 2, sameCountry: false, sameLeague: true }, first)
    expect(picked.map(({ leagueId }) => leagueId)).toEqual(["pl", "pl"])
    expect(relaxed).toBeNull()
  })

  it("reports when a constraint has to be relaxed", () => {
    const { picked, relaxed } = pickTeams(teams, { count: 4, sameCountry: true, sameLeague: false }, first)
    expect(picked.at(-1)?.countryId).toBe("esp")
    expect(relaxed).toBe("country")
  })
})
