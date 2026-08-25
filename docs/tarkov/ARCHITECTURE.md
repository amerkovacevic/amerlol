# Amer.lol Tarkov Tracker Architecture

## Purpose

The Tarkov module is a first-class Amer.lol application for tracking Escape from Tarkov quest progression, objectives, required items, maps, traders, and long-term progression goals.

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

The initial quest experience loads the task, trader, and map datasets together. Task records are normalized into `TarkovQuest`; trader/map datasets enrich ID references for reliable display and search.

Target server-backed flow if Amer.lol moves away from static export:

`json.tarkov.dev -> Amer.lol server adapter/cache -> validation -> normalization -> UI`

A server proxy remains preferable because it enables shared caching, corrections, retry control, and prevents the browser from contacting the third-party data source directly. It must not be implemented as a Next API route while `output: 'export'` remains enabled.

### Player data

Player progress is private user state and is persisted separately from static game data.

Flow:

`UI -> progression/domain layer -> Firestore`

Static quests/items must not be duplicated into each user's Firestore documents.

### Quest presence and reconciliation

Quest eligibility and quest presence are separate domain concepts.

- Eligibility means the rules engine predicts a quest could be available.
- Presence means the player has confirmed what Tarkov actually shows on the current character.
- `not-present` is explicit negative confirmation and suppresses repeated false-positive recommendations.

The first usable implementation is local-first and mode-isolated:

`live quest catalog -> search/reconciliation -> local QuestPresence state -> My Quests`

This will migrate to Firestore-backed Tarkov profiles without changing the domain model.

## Module layout

```text
app/(hub)/a/[appId]/          Existing generic Amer.lol app route
components/apps/tarkov/       Tarkov-specific UI
lib/tarkov/api/               Upstream transport boundary
lib/tarkov/adapters/          Provider-to-canonical adapters
lib/tarkov/schemas/           Runtime validation
lib/tarkov/types/             Canonical domain types
lib/tarkov/cache/             Client cache utilities
lib/tarkov/domain/            Quest/progression calculations
lib/tarkov/storage/           Local-first persistence adapters
lib/tarkov/overrides/         Local upstream-data corrections
docs/tarkov/                  Architecture and implementation documentation
```

## Rules

1. Never use quest names as persistent identifiers.
2. Keep upstream response types out of React components.
3. React components never construct upstream Tarkov URLs directly.
4. Validate external data before normalization.
5. Keep business logic pure where possible and outside components.
6. PvP and PvE progression are separate profiles/state spaces.
7. Eligibility never implies confirmed in-game quest presence.
8. Explicit `not-present` confirmation overrides eligibility until the player changes it.
9. Upstream changes must never silently delete user progress.
10. The tracker must degrade gracefully when the upstream API is unavailable.
11. Local data corrections must be possible without forking the upstream dataset.
12. Every persistent user mutation must be ownership-protected by Firestore rules once profile sync is enabled.
13. Mobile and desktop are both first-class targets.

## Initial delivery sequence

1. App Hub registration and application shell. COMPLETE
2. Canonical game-data types and schemas. COMPLETE
3. Isolated `json.tarkov.dev` transport boundary. COMPLETE
4. Quest normalization/adapters. COMPLETE (initial task/trader/map coverage)
5. Strict quest presence/reconciliation. COMPLETE (local-first)
6. Player profile persistence and Firestore migration.
7. Quest progress/objective tracking.
8. Exact eligibility view using profile level/faction/progress/delays.
9. Item aggregation and map planning.
10. Kappa/Lightkeeper and recommendation engines.
11. Decide whether to migrate deployment for an Amer.lol server-side proxy/cache.
12. Hardening, migrations, tests, and monitoring.
