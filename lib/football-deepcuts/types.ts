export type VerificationStatus = "pending" | "verified" | "rejected"

export interface SourceReference {
  provider: string
  externalId: string
  url?: string
  retrievedAt: string
  license?: string
}

export interface FootballClub {
  id: string
  officialName: string
  displayName: string
  alternativeNames: string[]
  country: string
  badgeUrl?: string
  sources: SourceReference[]
}

export interface FootballPlayer {
  id: string
  canonicalName: string
  displayName: string
  alternativeNames: string[]
  nationality?: string
  dateOfBirth?: string
  sources: SourceReference[]
  verificationStatus: VerificationStatus
}

export interface PlayerClubAppearance {
  id: string
  playerId: string
  clubId: string
  firstSeason?: string
  lastSeason?: string
  competitiveAppearances?: number
  moveType?: "permanent" | "loan" | "unknown"
  source: SourceReference
  verifiedAt?: string
  verificationStatus: VerificationStatus
}

export type RarityPoints = 10 | 30 | 60 | 85 | 100

export interface FrozenAnswer {
  playerId: string
  points: RarityPoints
  clubAAppearances: number
  clubBAppearances: number
  calculatedAt: string
  scoringVersion: string
}

export interface QuestionBankEntry {
  id: string
  clubAId: string
  clubBId: string
  status: "candidate" | "approved" | "rejected"
  answerCount: number
  tierDistribution: Partial<Record<RarityPoints, number>>
  hasIdentityConflicts: boolean
  answers: FrozenAnswer[]
  generatedAt: string
}

export interface DailyChallenge {
  id: string
  challengeNumber: number
  utcDate: string
  status: "draft" | "published" | "archived"
  questionIds: [string, string, string, string, string]
  scoringVersion: string
  publishedAt?: string
}
