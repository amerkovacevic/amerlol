export const MAX_GUESSES = 3

export interface Guess {
  playerId: string
  playerName: string
}

export function recordGuess(previous: readonly Guess[], guess: Guess, correct: boolean) {
  if (previous.length >= MAX_GUESSES) throw new Error("No guesses remaining")
  if (previous.some(({ playerId }) => playerId === guess.playerId))
    throw new Error("You already tried this player")
  const guesses = [...previous, guess]
  return {
    guesses,
    remaining: MAX_GUESSES - guesses.length,
    finished: correct || guesses.length === MAX_GUESSES,
  }
}
