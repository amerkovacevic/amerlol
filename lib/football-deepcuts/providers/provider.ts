import type { FootballClub, FootballPlayer, PlayerClubAppearance } from "../types.ts"

export interface ImportIssue {
  code: "missing-appearances" | "identity-conflict" | "unsupported-record" | "source-error"
  message: string
  externalId?: string
}

export interface ImportBatch {
  clubs: FootballClub[]
  players: FootballPlayer[]
  appearances: PlayerClubAppearance[]
  issues: ImportIssue[]
}

/** Providers must not translate an unknown appearance count into zero. */
export interface FootballDataProvider {
  readonly id: string
  readonly attribution: string
  readonly licenseNotes: string
  import(options?: { cursor?: string; limit?: number }): Promise<ImportBatch>
}
