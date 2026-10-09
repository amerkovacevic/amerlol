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

  const shuffled = [...participants]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return Object.fromEntries(
    shuffled.map((giver, index) => [giver, shuffled[(index + 1) % shuffled.length]])
  )
}
