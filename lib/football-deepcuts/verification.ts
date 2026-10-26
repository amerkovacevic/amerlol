import type { PlayerClubAppearance } from "./types.ts"

export interface AppearanceVerificationResult {
  eligible: boolean
  reasons: string[]
}

export function verifyAppearanceRecord(record: PlayerClubAppearance): AppearanceVerificationResult {
  const reasons: string[] = []
  if (record.verificationStatus !== "verified") reasons.push("Record has not been verified")
  if (record.competitiveAppearances === undefined) reasons.push("Competitive appearance count is missing")
  else if (!Number.isInteger(record.competitiveAppearances))
    reasons.push("Appearance count must be an integer")
  else if (record.competitiveAppearances < 1) reasons.push("At least one competitive appearance is required")
  if (!record.source.provider || !record.source.externalId || !record.source.retrievedAt)
    reasons.push("Source attribution is incomplete")
  if (!record.verifiedAt) reasons.push("Verification date is missing")
  return { eligible: reasons.length === 0, reasons }
}

export function eligibleAppearanceRecords(records: readonly PlayerClubAppearance[]): PlayerClubAppearance[] {
  return records.filter((record) => verifyAppearanceRecord(record).eligible)
}
