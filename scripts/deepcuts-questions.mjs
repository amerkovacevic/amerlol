function points(count) {
  return count <= 4 ? 100 : count <= 19 ? 85 : count <= 49 ? 60 : count <= 99 ? 30 : 10
}
function slug(...parts) {
  return parts
    .join("-")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// Membership intervals cannot establish appearances during a decade.
// Era questions stay disabled until dated match evidence is available.
export function buildQuestions({ clubs, players: catalog, appearances }) {
  const CLUBS = clubs.map(({ id, name }) => [id, name])
  const clubMap = new Map(clubs.map((club) => [club.id, club]))
  const players = new Map(catalog.map((player) => [player.id, player]))
  const relationships = new Map(appearances.map((row) => [`${row.playerId}:${row.clubId}`, row]))
  const byPlayer = new Map()
  const byClub = new Map()
  for (const row of appearances) {
    const career = byPlayer.get(row.playerId) ?? []
    career.push(row)
    byPlayer.set(row.playerId, career)
    const squad = byClub.get(row.clubId) ?? []
    squad.push(row)
    byClub.set(row.clubId, squad)
  }
  const questions = []
  function addQuestion(question, answers, minimum) {
    const unique = [...new Map(answers.map((answer) => [answer.playerId, answer])).values()]
    if (unique.length < minimum) return
    const sourced = unique.map((answer) => ({
      ...answer,
      appearanceScopes: question.clubIds.map((clubId) => {
        const source = relationships.get(`${answer.playerId}:${clubId}`).source
        return source.provider === "espn" ? source.season : "Wikidata recorded club matches"
      }),
    }))
    questions.push({
      ...question,
      answerCount: sourced.length,
      answers: sourced.sort((a, b) => a.playerId.localeCompare(b.playerId)),
    })
  }

  for (let a = 0; a < CLUBS.length; a++)
    for (let b = a + 1; b < CLUBS.length; b++) {
      const [clubAId, clubA] = CLUBS[a],
        [clubBId, clubB] = CLUBS[b]
      const other = new Map((byClub.get(clubBId) ?? []).map((row) => [row.playerId, row]))
      const answers = (byClub.get(clubAId) ?? [])
        .filter((row) => other.has(row.playerId))
        .map((row) => {
          const second = other.get(row.playerId)
          return {
            playerId: row.playerId,
            points: points(Math.min(row.appearances, second.appearances)),
            appearances: [row.appearances, second.appearances],
          }
        })
      addQuestion(
        {
          id: `clubs-${clubAId}-${clubBId}`,
          type: "club_pair",
          prompt: `Name a player who made a senior appearance for both ${clubA} and ${clubB}.`,
          clubIds: [clubAId, clubBId],
        },
        answers,
        8
      )
    }

  for (const [clubId, clubName] of CLUBS) {
    const nationalityGroups = new Map()
    for (const row of byClub.get(clubId) ?? [])
      for (const nationality of players.get(row.playerId)?.nationalities ?? []) {
        const group = nationalityGroups.get(nationality) ?? []
        group.push({
          playerId: row.playerId,
          points: points(row.appearances),
          appearances: [row.appearances],
        })
        nationalityGroups.set(nationality, group)
      }
    for (const [nationality, answers] of nationalityGroups)
      addQuestion(
        {
          id: slug("nationality", clubId, nationality),
          type: "club_nationality",
          prompt: `Name a player with ${nationality} citizenship who made a senior appearance for ${clubName}.`,
          clubIds: [clubId],
          nationality,
        },
        answers,
        6
      )
  }

  const tripleGroups = new Map()
  for (const [playerId, career] of byPlayer) {
    const eligible = career
      .filter((row) => clubMap.has(row.clubId))
      .sort((a, b) => a.clubId.localeCompare(b.clubId))
    for (let a = 0; a < eligible.length; a++)
      for (let b = a + 1; b < eligible.length; b++)
        for (let c = b + 1; c < eligible.length; c++) {
          const trio = [eligible[a], eligible[b], eligible[c]],
            id = trio.map((row) => row.clubId).join("-")
          const group = tripleGroups.get(id) ?? []
          group.push({
            playerId,
            points: points(Math.min(...trio.map((row) => row.appearances))),
            appearances: trio.map((row) => row.appearances),
          })
          tripleGroups.set(id, group)
        }
  }
  for (const [id, answers] of tripleGroups) {
    const clubIds = id.split("-")
    const names = clubIds.map((clubId) => clubMap.get(clubId).name)
    addQuestion(
      {
        id: `path-${id}`,
        type: "three_clubs",
        prompt: `Name a player who made a senior appearance for ${names[0]}, ${names[1]}, and ${names[2]}.`,
        clubIds,
      },
      answers,
      4
    )
  }

  return questions
}
