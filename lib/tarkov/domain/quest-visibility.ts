import { calculateQuestState, type QuestProgressLookup } from "@/lib/tarkov/domain/quest-state"
import type {
  QuestPresence,
  QuestVisibilityMode,
  TarkovProfile,
  TarkovQuest,
} from "@/lib/tarkov/types"

export type QuestPresenceLookup = Readonly<Record<string, QuestPresence | undefined>>

export type QuestVisibilityReason =
  | "confirmed-in-game"
  | "confirmed-not-present"
  | "active-progress"
  | "completed-progress"
  | "eligible-only"
  | "locked"
  | "faction-mismatch"
  | "failed"
  | "all-quests"

export interface QuestVisibilityDecision {
  visible: boolean
  reason: QuestVisibilityReason
  /**
   * True when the tracker has calculated that a quest could be available but
   * the player has not confirmed seeing it in-game. In strict mode these are
   * intentionally hidden to avoid mainstream-tracker false positives.
   */
  unconfirmedEligibility: boolean
}

export interface QuestVisibilityOptions {
  mode: QuestVisibilityMode
  includeCompleted?: boolean
  includeFailed?: boolean
}

export function decideQuestVisibility(
  quest: TarkovQuest,
  profile: Pick<TarkovProfile, "level" | "faction">,
  progress: QuestProgressLookup,
  presence: QuestPresenceLookup,
  options: QuestVisibilityOptions
): QuestVisibilityDecision {
  const state = calculateQuestState(quest, profile, progress)
  const confirmed = presence[quest.id]
  const currentProgress = progress[quest.id]

  if (options.mode === "all") {
    return {
      visible: true,
      reason: confirmed?.status === "not-present" ? "confirmed-not-present" : "all-quests",
      unconfirmedEligibility: state.state === "available" && !confirmed,
    }
  }

  const factionMismatch = state.blockers.some((blocker) => blocker.type === "faction")
  if (factionMismatch) {
    return { visible: false, reason: "faction-mismatch", unconfirmedEligibility: false }
  }

  if (confirmed?.status === "not-present") {
    return {
      visible: false,
      reason: "confirmed-not-present",
      unconfirmedEligibility: false,
    }
  }

  if (currentProgress?.status === "completed" || confirmed?.status === "completed") {
    return {
      visible: options.includeCompleted ?? false,
      reason: "completed-progress",
      unconfirmedEligibility: false,
    }
  }

  if (currentProgress?.status === "failed" || confirmed?.status === "failed") {
    return {
      visible: options.includeFailed ?? false,
      reason: "failed",
      unconfirmedEligibility: false,
    }
  }

  if (currentProgress?.status === "active") {
    return { visible: true, reason: "active-progress", unconfirmedEligibility: false }
  }

  if (confirmed && (confirmed.status === "available" || confirmed.status === "active")) {
    return { visible: true, reason: "confirmed-in-game", unconfirmedEligibility: false }
  }

  if (options.mode === "my-quests") {
    return {
      visible: false,
      reason: state.state === "available" ? "eligible-only" : "locked",
      unconfirmedEligibility: state.state === "available",
    }
  }

  if (state.state === "available") {
    return { visible: true, reason: "eligible-only", unconfirmedEligibility: !confirmed }
  }

  return { visible: false, reason: "locked", unconfirmedEligibility: false }
}

export function filterVisibleQuests(
  quests: readonly TarkovQuest[],
  profile: Pick<TarkovProfile, "level" | "faction">,
  progress: QuestProgressLookup,
  presence: QuestPresenceLookup,
  options: QuestVisibilityOptions
): TarkovQuest[] {
  return quests.filter((quest) =>
    decideQuestVisibility(quest, profile, progress, presence, options).visible
  )
}

export function countUnconfirmedEligibleQuests(
  quests: readonly TarkovQuest[],
  profile: Pick<TarkovProfile, "level" | "faction">,
  progress: QuestProgressLookup,
  presence: QuestPresenceLookup
): number {
  return quests.reduce((count, quest) => {
    const decision = decideQuestVisibility(quest, profile, progress, presence, {
      mode: "my-quests",
    })
    return count + (decision.unconfirmedEligibility ? 1 : 0)
  }, 0)
}
