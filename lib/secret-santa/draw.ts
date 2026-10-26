import { shuffle } from "../random.ts"

export function createSecretSantaAssignments(
  participants: readonly string[],
  random: () => number = Math.random
): Record<string, string> {
  const uniqueParticipants = new Set(participants)

  if (uniqueParticipants.size !== participants.length) {
    throw new Error("Participants must be unique")
  }
  if (participants.length < 2) {
    throw new Error("At least two participants are required")
  }

  // A single cycle through a random order guarantees nobody draws themselves.
  const shuffled = shuffle(participants, random)

  return Object.fromEntries(
    shuffled.map((giver, index) => [giver, shuffled[(index + 1) % shuffled.length]])
  )
}
