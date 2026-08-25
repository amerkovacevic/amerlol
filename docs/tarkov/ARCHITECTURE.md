# Amer.lol Tarkov Tracker Architecture

## Purpose

The Tarkov module is a first-class Amer.lol application for tracking Escape from Tarkov quest progression, objectives, required items, maps, traders, and long-term progression goals.

## Existing Stack

The repository uses Next.js 14 App Router, React 18, TypeScript in strict mode, Tailwind CSS, Firebase/Firestore, Zod, Radix UI primitives, Lucide icons, Framer Motion, and the existing Amer.lol shared layout/component system.

## Architectural boundaries

### Static game data

Game data is external, shared, and read-only from the player's perspective. The primary data provider will be json.tarkov.dev. UI components must never fetch the upstream provider directly.

Flow:

`json.tarkov.dev -> server adapter -> validation -> normalization -> Amer.lol API/cache -> UI`

### Player data

Player progress is private user state and is persisted separately from static game data.

Flow:

`UI -> progression/domain layer -> Firestore`

Static quests/items must not be duplicated into each user's Firestore documents.

## Module layout

```text
app/tarkov/                  Tarkov routes and layouts
components/tarkov/           Tarkov-specific UI
lib/tarkov/api/              Upstream/API access
lib/tarkov/adapters/         Provider adapters
lib/tarkov/schemas/          Runtime validation
lib/tarkov/types/            Canonical domain types
lib/tarkov/cache/            Cache utilities
lib/tarkov/domain/           Quest/progression calculations
lib/tarkov/overrides/        Local upstream-data corrections
docs/tarkov/                 Architecture and implementation documentation
```

## Rules

1. Never use quest names as persistent identifiers.
2. Keep upstream response types out of React components.
3. Validate external data before normalization.
4. Keep business logic pure where possible and outside components.
5. PvP and PvE progression are separate profiles.
6. Upstream changes must never silently delete user progress.
7. The tracker must degrade gracefully when the upstream API is unavailable.
8. Local data corrections must be possible without forking the upstream dataset.
9. Every persistent user mutation must be ownership-protected by Firestore rules.
10. Mobile and desktop are both first-class targets.

## Initial delivery sequence

1. Route/application shell.
2. Canonical game-data types and schemas.
3. Upstream Tarkov data adapter.
4. Server-side API/cache layer.
5. Player profile persistence.
6. Quest state/dependency engine.
7. Quest list and quest detail UI.
8. Item aggregation and map planning.
9. Kappa/Lightkeeper and recommendation engines.
10. Hardening, migrations, tests, and monitoring.
