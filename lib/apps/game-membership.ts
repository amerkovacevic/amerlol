export function changeGameMembership(
  players: string[],
  uid: string,
  maxPlayers: number,
  join: boolean
): string[] {
  if (
    !Array.isArray(players) ||
    !players.every((player) => typeof player === "string") ||
    !Number.isInteger(maxPlayers) ||
    maxPlayers < 2
  )
    throw new Error("This game has invalid player data")
  if (join) {
    if (players.includes(uid)) throw new Error("You're already in this game")
    if (players.length >= maxPlayers) throw new Error("Game is full")
    return [...players, uid]
  }
  if (!players.includes(uid)) throw new Error("You're not in this game")
  return players.filter((player) => player !== uid)
}
