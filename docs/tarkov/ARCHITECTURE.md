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

Target server-backed flow if Amer.lol moves away from static export:

`json.tarkov.dev -> Amer.lol server adapter/cache -> validation -> normalization -> UI`

A server proxy remains preferable because it enables shared caching, corrections, retry control, and prevents the browser from contacting the third-party data source directly. It must not be implemented as a Next API route while `output: 'export'` remains enabled.

### Player data

Player progress is private user state and is persisted separately from static game data.

Flow:

`UI -> progression/domain layer -> Firestore`

Static quests/items must not be duplicated into each user's Firestore documents.

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

## Initial delivery sequence

1. App Hub registration and application shell.
2. Canonical game-data types and schemas.
3. Isolated `json.tarkov.dev` transport boundary.
4. Quest normalization/adapters.
5. Player profile persistence.
6. Quest state/dependency engine.
7. Quest list and quest detail UI.
8. Item aggregation and map planning.
9. Kappa/Lightkeeper and recommendation engines.
10. Decide whether to migrate deployment for an Amer.lol server-side proxy/cache.
11. Hardening, migrations, tests, and monitoring.
