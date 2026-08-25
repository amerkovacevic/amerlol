# Amer.lol Tarkov Tracker Architecture

## Purpose

The Tarkov module is a first-class Amer.lol application for tracking Escape from Tarkov quest progression, objectives, required items, maps, traders, and long-term progression goals.

A primary product requirement is accuracy of the player's **actual current quest list**. The tracker must not confuse “the data model predicts this quest is available” with “this quest is actually visible on this player's Tarkov character.”

## Existing Stack

The repository uses Next.js 14 App Router, React 18, TypeScript in strict mode, Tailwind CSS, Firebase/Firestore, Zod, Radix UI primitives, Lucide icons, Framer Motion, and the existing Amer.lol shared layout/component system.

Amer.lol currently builds with `output: 'export'`, so the production deployment is fully static. Next.js API routes and server actions are therefore not available unless the deployment model is changed.

## Routing

Tarkov follows the existing Amer.lol App Hub convention and is registered as app ID `tarkov`.

Primary route:

`/a/tarkov`

The existing dynamic app route and component registry render the tracker through the standard Amer.lol app shell. Tarkov-specific subviews are initially internal client views. Dedicated nested URLs can be introduced later where sharing/bookmarking provides clear value.

## Architectural boundaries

### Static game data

Game data is external, shared, and read-only from the player's perspective. The primary provider is `json.tarkov.dev`.

Current static-export flow:

`json.tarkov.dev -> isolated data-source module -> validation -> normalization -> domain layer -> UI`

No React component may construct or call upstream URLs directly. All upstream access goes through `lib/tarkov/api` so the transport can later move behind an Amer.lol proxy without changing UI/domain code.

Target server-backed flow if Amer.lol moves away from static export:

`json.tarkov.dev -> Amer.lol server adapter/cache -> validation -> normalization -> UI`

A server proxy remains preferable because it enables shared caching, corrections, retry control, and prevents the browser from contacting the third-party data source directly. It must not be implemented as a Next API route while `output: 'export'` remains enabled.

### Player data

Player progress is private user state and is persisted separately from static game data.

Flow:

`UI -> progression/domain layer -> Firestore`

Static quests/items must not be duplicated into each user's Firestore documents.

### Quest eligibility vs. quest presence

This is a hard boundary, not a UI preference.

`Eligibility` is calculated from level, faction, prerequisite quest status, trader requirements, branch state, and timing rules.

`Presence` means the player has actually confirmed the quest exists on their current character, whether manually or through a future reliable import/sync mechanism.

The default tracker view is **My Quests**, which is presence-backed. Eligible-but-unconfirmed quests are hidden by default and may only appear in an explicit planning view.

This prevents false positives caused by incomplete upstream relationships, delayed quest issuance, failed/completed branch semantics, faction differences, or Tarkov data changing before a tracker dataset catches up.

## Module layout

```text
app/(hub)/a/[appId]/          Existing generic Amer.lol app route
components/apps/tarkov/       Tarkov-specific UI
lib/tarkov/api/               Upstream transport boundary
lib/tarkov/adapters/          Provider-to-canonical adapters
lib/tarkov/schemas/           Runtime validation
lib/tarkov/types/             Canonical domain types
lib/tarkov/cache/             Client cache utilities
lib/tarkov/domain/            Quest/progression/visibility calculations
lib/tarkov/overrides/         Local upstream-data corrections
docs/tarkov/                  Architecture and implementation documentation
```

## Rules

1. Never use quest names as persistent identifiers.
2. Keep upstream response types out of React components.
3. React components never construct upstream Tarkov URLs directly.
4. Validate external data before normalization.
5. Keep business logic pure where possible and outside components.
6. PvP and PvE progression are separate profiles.
7. Upstream changes must never silently delete user progress.
8. The tracker must degrade gracefully when the upstream API is unavailable.
9. Local data corrections must be possible without forking the upstream dataset.
10. Every persistent user mutation must be ownership-protected by Firestore rules.
11. Mobile and desktop are both first-class targets.
12. Calculated eligibility must never silently place an unconfirmed quest into My Quests.
13. Failed/completed prerequisite status branches must be modeled explicitly rather than flattened into “completed prerequisite IDs.”
14. Availability delays must be preserved by normalization even when the current client cannot yet calculate them exactly.

## Initial delivery sequence

1. App Hub registration and application shell. **Done**
2. Canonical game-data types and schemas. **In progress**
3. Isolated `json.tarkov.dev` transport boundary. **Done**
4. Strict quest visibility/presence engine. **Done**
5. Branch-aware quest dependency engine. **Done**
6. Quest normalization/adapters, including faction, prerequisite statuses, and availability delays.
7. Player profile and quest-presence persistence.
8. Quest reconciliation flow: search/select the quests actually visible in-game, with fast “I have this quest” and “not on my character” actions.
9. Real My Quests list using confirmed presence as its source of truth.
10. Explicit Eligible/Planning view for predicted quests, clearly labeled as predictions.
11. Quest detail/objective tracking.
12. Item aggregation and map planning based primarily on confirmed active quests.
13. Kappa/Lightkeeper and recommendation engines.
14. Add import/sync adapters only when a data source is reliable enough to assert in-game presence.
15. Decide whether to migrate deployment for an Amer.lol server-side proxy/cache.
16. Hardening, migrations, tests, and monitoring.
