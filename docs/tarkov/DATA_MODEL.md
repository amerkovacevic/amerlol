# Tarkov Tracker Data Model

## Core principle

Static Tarkov game data and user progression are separate systems. Static entities use stable upstream IDs. User documents store references and progression only.

## Game mode

```ts
type TarkovGameMode = "pvp" | "pve" | "pvp-season"
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

Locked and available states are derived from canonical game data plus the profile's progress. They should not normally be persisted.

## Firestore target structure

```text
users/{uid}/tarkovProfiles/{profileId}
users/{uid}/tarkovProfiles/{profileId}/questProgress/{questId}
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
