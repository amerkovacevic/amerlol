# Tarkov Tracker Data Model

## Core principle

Static Tarkov game data and user progression are separate systems. Static entities use stable upstream IDs. User documents store references and progression only.

A second core principle is that **calculated eligibility is not the same thing as in-game presence**. The tracker must not assume that a quest exists on a player's character merely because level and prerequisite rules appear satisfied.

## Game mode

```ts
type TarkovGameMode = "pvp" | "pve" | "seasonal"
```

Upstream mapping:

```text
pvp      -> regular
pve      -> pve
seasonal -> pvp-season
```

## Canonical entities

Initial domain entities:

- `TarkovQuest`
- `QuestObjective`
- `TarkovItem`
- `TarkovTrader`
- `TarkovMap`
- `QuestRequirement`
- `QuestReward`

Canonical entities preserve the upstream ID but do not expose upstream response shapes to the UI.

## Player profile

```ts
interface TarkovProfile {
  id: string
  userId: string
  displayName: string
  gameMode: TarkovGameMode
  faction: "USEC" | "BEAR"
  level: number
  wipeId: string
  createdAt: unknown
  updatedAt: unknown
}
```

## Quest progress

```ts
type QuestProgressStatus = "active" | "completed" | "failed"

interface QuestProgress {
  questId: string
  status: QuestProgressStatus
  completedObjectiveIds: string[]
  updatedAt: unknown
}
```

Locked and calculated-available states are derived from canonical game data plus the profile's progress.

## Confirmed in-game quest presence

This exists specifically to prevent the common tracker failure where quests appear because the dependency graph predicts they should be available even though the player does not actually have them in Tarkov.

```ts
type QuestPresenceStatus = "available" | "active" | "completed" | "failed"
type QuestPresenceSource = "manual" | "import" | "sync"

interface QuestPresence {
  questId: string
  status: QuestPresenceStatus
  source: QuestPresenceSource
  confirmedAt: unknown
  updatedAt: unknown
}
```

The two concepts must remain separate:

```text
Eligibility = the rules engine predicts the quest could be available.
Presence    = the player has actually confirmed seeing the quest in-game.
```

The default `my-quests` view uses presence, not eligibility. A mathematically eligible but unconfirmed quest is hidden and tracked internally as `unconfirmedEligibility`.

Visibility modes:

```text
my-quests  Only quests confirmed on the current character. DEFAULT.
eligible   Confirmed quests plus quests the rules engine predicts are available.
all        Entire compatible dataset for research/debugging.
```

Initial confirmation methods are manual selection and tracker interaction. The model deliberately includes `import` and `sync` sources so a reliable future import/synchronization method can be added without changing persistence semantics.

## Firestore target structure

```text
users/{uid}/tarkovProfiles/{profileId}
users/{uid}/tarkovProfiles/{profileId}/questProgress/{questId}
users/{uid}/tarkovProfiles/{profileId}/questPresence/{questId}
users/{uid}/tarkovProfiles/{profileId}/itemProgress/{itemId}
users/{uid}/tarkovProfiles/{profileId}/settings/preferences
```

## Versioning

Every normalized game-data snapshot should expose metadata containing:

- source
- game mode
- downloaded timestamp
- normalized dataset version/hash

A changed upstream dataset must not imply that a user's existing progress is invalid. Removed or changed entity IDs must be handled explicitly by migration/compatibility logic.
