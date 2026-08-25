# Tarkov Tracker Product Roadmap

## Product north star

Amer.lol Tarkov Tracker should answer four questions better than mainstream trackers:

1. **What quests do I actually have?**
2. **What should I do next to maximize progression?**
3. **What should I bring and what should I keep?**
4. **How close am I to Kappa, Lightkeeper, traders, and hideout goals?**

The differentiator is not simply a larger checklist. The tracker must be stricter about player truth and more useful during actual raid planning.

---

## Non-negotiable product rule: quest truth

`My Quests` is presence-backed.

Calculated eligibility may inform planning, but it can never silently add a quest to the player's current quest list, current item requirements, raid optimizer, trader-active counts, or other "current character" surfaces.

Three distinct concepts must remain separate:

- **Confirmed** — the player explicitly says the quest exists on the character, or a future trusted sync/import proves it.
- **Eligible** — the rules engine predicts the quest should be available.
- **Not present** — the player explicitly says the quest is not on the character.

This separation exists specifically to avoid the false-positive quest behavior common in other trackers.

---

# Current implementation status

## Implemented

### Foundation and live data

- Amer.lol App Hub integration at `/a/tarkov`.
- PvP/PvE mode separation.
- json.tarkov.dev transport abstraction.
- Runtime envelope validation.
- Canonical quest/objective/domain models.
- Task, trader, map, item, and hideout normalization.
- Objective world-coordinate ingestion where upstream data exposes it.
- Local override/route-pack architecture.

### Quest truth and progression

- `My Quests`, `Eligible`, and reconciliation views.
- Persistent `Not on my character` negative confirmation.
- PMC level and USEC/BEAR profile state.
- Active/completed/failed quest state.
- Per-objective completion tracking.
- Quest dependency calculations.
- Focused quest-chain explorer with ancestor/descendant traversal.

### What to do next

- Confirmed-current-quest-only raid optimizer.
- Map scoring.
- Five strategies:
  - Max progression
  - Shortest line
  - Safer line
  - Kappa focus
  - Fast XP
- What to bring.
- Required keys/access.
- Watch-for/FIR loot.
- Geographic objective ordering where coordinates exist.
- Partial geographic fallback.
- Spawn/extract routing contracts.
- Conservative known-route distance.
- Interactive relative SVG route visualization.
- Per-leg route distance labels.
- Strategy comparison.
- Full Map Planner using the same scoring engine.

### Item intelligence

- Confirmed quest items needed now.
- FIR prioritization.
- Predictive future-save requirements kept separate from current needs.
- Soon/Later future buckets.
- Hideout requirement ingestion.
- Hideout station-level progress.
- Remaining hideout materials based on recorded station progress.

### Progress surfaces

- Trader progression dashboard.
- Overall quest progress.
- Kappa progress.
- Lightkeeper progress.
- Confirmed-vs-unconfirmed remaining required quests.

### Persistence

- Guest/local mode.
- Signed-in Firestore mirroring.
- Owner-scoped Tarkov Firestore rules.
- Incremental quest/profile/hideout writes.
- Cloud hydration/merge path.
- JSON export/import.
- Mode-scoped wipe reset.

---

# Roadmap correction

Feature breadth is currently ahead of engineering hardening.

The original roadmap expected automated tests, versioned game data, migration safety, performance checks, and release validation before the feature set became this large. We have built several high-value product features earlier than planned. That is acceptable, but the implementation should now stop expanding horizontally until the hardening gap is closed.

The next milestone is therefore **not another major user-facing subsystem**.

---

# PHASE A — Hardening Gate

These items are mandatory before the feature is considered release-ready or before large V2 systems such as squad planning are started.

## A1. Production build and TypeScript validation

- Add a GitHub Actions workflow.
- Run `npm ci`.
- Run TypeScript validation.
- Run linting.
- Run the production Next.js build.
- Fail the PR on errors.
- Preserve compatibility with the repository's static-export deployment model.

### Exit criteria

A fresh checkout builds successfully in CI with no TypeScript or lint errors.

---

## A2. Unit tests for domain logic

Prioritize logic where silent mistakes would give players incorrect advice.

Required tests:

- quest state calculation,
- prerequisite status handling,
- faction restrictions,
- `My Quests` visibility rules,
- negative presence suppression,
- quest graph cycle protection,
- current item aggregation,
- future-save separation,
- hideout remaining-material calculations,
- raid map scoring,
- each route strategy,
- geographic/fallback routing,
- route distance calculations,
- Kappa progress,
- Lightkeeper progress.

### Exit criteria

Core domain behavior can be changed only with tests proving expected results.

---

## A3. Game-data versioning and migration safety

This was under-emphasized during implementation and must now be completed.

Add:

- normalized dataset version/hash,
- last successful upstream version metadata,
- detection of added/removed/changed quest IDs,
- detection of changed objective IDs,
- compatibility handling for removed tasks,
- orphan-progress reporting,
- migration hooks for known ID changes,
- admin/debug visibility into upstream changes.

### Critical rule

An upstream data change must never silently delete user progress.

### Exit criteria

A simulated Tarkov patch that removes or modifies quests leaves user data recoverable and explainable.

---

## A4. Firestore sync correctness

The sync path now exists, but it needs conflict and failure testing.

Add tests and explicit handling for:

- offline writes,
- delayed cloud hydration,
- two-device edits,
- stale timestamps,
- import while signed in,
- wipe reset while signed in,
- partial Firestore failure,
- permission errors,
- mode isolation,
- cloud data that references removed quest IDs.

Define and document deterministic conflict rules.

### Exit criteria

Progress cannot disappear or unexpectedly move backward during common multi-device workflows.

---

## A5. Data diagnostics

Implement the originally planned admin/debug data-health page.

Track:

- quest count,
- objective count,
- item count,
- trader count,
- map count,
- hideout count,
- dataset version,
- last successful load,
- invalid normalized records,
- unknown trader/map/item references,
- broken prerequisites,
- dependency cycles,
- override count,
- coordinate coverage percentage.

### Exit criteria

A Tarkov patch can be diagnosed without manually debugging UI failures.

---

## A6. Performance and mobile audit

Measure the complete datasets on realistic devices.

Check:

- quest filtering,
- search,
- chain traversal,
- Items Needed aggregation,
- Map Planner scoring,
- What to do next recalculation,
- route SVG rendering,
- Firestore hydration.

Add memoization/virtualization only where measurements justify it.

### Exit criteria

No noticeable UI lockup during normal tracker interactions on a modern mobile device.

---

# PHASE B — Quest and progression quality

After Phase A passes.

## B1. Better blocker explanations

For every locked/predicted quest, explain exactly why:

```text
LOCKED BECAUSE
- Reach level 24
- Complete Spa Tour Part 4
- Complete or fail branch requirement X
- USEC only
```

Do not collapse complex prerequisite status rules into generic "complete prerequisites" text.

## B2. Quest-chain graph upgrade

Current focused chain explorer is intentionally simple.

Upgrade with:

- direct prerequisite grouping,
- AND/OR semantics where representable,
- branch/failure visualization,
- unlock-count impact,
- critical-path highlighting,
- click-to-focus related quest,
- mobile-friendly layout.

Avoid rendering the entire wipe graph by default.

## B3. Wipe archive profiles

Replace reset-only history with archives.

When starting a new wipe:

- archive the old progression snapshot,
- preserve completion statistics,
- preserve hideout history,
- create a clean active profile,
- keep preferences,
- support viewing past wipe summaries.

---

# PHASE C — Raid optimization V2

The current optimizer is useful, but geographic precision is incomplete.

## C1. Verified spawn/extract data

Find a maintainable and legally suitable source for:

- PMC spawn regions,
- extracts,
- extract availability requirements,
- map transform metadata.

Do not hand-enter guesses merely to make the map look complete.

## C2. Canonical map-image overlays

Only add map backgrounds once source/licensing and coordinate alignment are verified.

Required:

- world-coordinate to image transform,
- objective markers,
- route line,
- spawn marker,
- selected extracts,
- key/access markers.

## C3. Traversal-aware routing

Straight-line nearest-neighbor distance is not enough for true Tarkov routing.

Add a graph representing practical movement constraints:

- walls/fences,
- crossings,
- doors,
- vertical transitions,
- map bottlenecks,
- required keys,
- conditional paths.

Then calculate actual route cost rather than Euclidean distance alone.

## C4. Risk-aware routing

`Safer line` should remain conservative until risk data exists.

Potential risk inputs:

- known chokepoints,
- high-traffic POIs,
- boss zones,
- exposed crossings,
- recent player-defined risk overrides.

Every risk recommendation must be explainable.

## C5. Raid readiness checklist

Before queueing:

```text
RUN: Customs

BRING
- MS2000 Marker x2
- Dorm 206 key

DO
1. Construction — plant marker
2. Dorms — retrieve item
3. Progress Scav kills while moving east
4. Extract

WATCH FOR
- Gas Analyzer x2 FIR
- Flash Drive x1 FIR
```

Later, add warnings for missing carried items once loadout/inventory tracking exists.

---

# PHASE D — Item/stash intelligence V2

## D1. Item lookup

Global `Should I keep this?` search should return:

- needed now,
- FIR status,
- current required quantity,
- future required quantity,
- earliest future quest,
- hideout remaining need,
- Kappa relevance,
- safe-to-sell state where determinable.

## D2. Owned quantity tracking

Optional user-entered stash quantities:

```text
Need: 5
Have: 3
Remaining: 2
```

Keep FIR and non-FIR quantities separate where it matters.

## D3. Unified watch list

Allow players to pin items regardless of quest/hideout source.

---

# PHASE E — Advanced progression

## E1. Better Kappa planning

Add:

- shortest remaining prerequisite chain,
- current bottleneck,
- highest-impact next quest,
- Kappa-specific What to do next integration.

## E2. Better Lightkeeper planning

Same principles as Kappa, with prerequisite-chain explanations.

## E3. Trader progression V2

Add:

- quest-chain visualization per trader,
- represented remaining XP,
- reputation implications where data is trustworthy,
- unlock impact.

---

# PHASE F — Squad mode

Squad planning remains valuable but should now occur after hardening and routing V2.

Add:

- explicit squad membership,
- privacy controls,
- per-player confirmed objectives,
- combined best-map scoring,
- overlapping objectives,
- combined raid route,
- player-specific checklist sections.

The optimizer must never treat another player's predicted quests as confirmed.

---

# PHASE G — Later enhancements

Lower priority until core quality is proven:

- public/shareable progression profiles,
- historical analytics,
- achievements/prestige,
- boss tracking,
- Discord integration,
- PWA/offline shell improvements,
- shareable raid-plan cards,
- advanced hideout/craft profitability,
- flea/trader pricing comparisons.

---

# Removed or changed assumptions from the original roadmap

## Server-side Tarkov API proxy

The original plan assumed Next.js server routes. Amer.lol currently uses static export, so a built-in Next API proxy is not compatible with the existing deployment model.

Current decision:

- keep upstream access isolated behind `lib/tarkov/api`,
- preserve static-export compatibility,
- do not force a deployment migration solely for the tracker,
- revisit a server proxy only if rate limits, caching needs, reliability, or security justify a backend architecture change.

## Exact routing

The original roadmap treated coordinate data as a future manual layer. We discovered that upstream quest objectives already expose useful world positions for many objectives.

Current decision:

- use upstream objective coordinates immediately,
- use verified overrides for corrections/gaps,
- do not claim exact shortest-path routing until spawn/extract and traversal data are verified.

## Firestore timing

Persistence was originally scheduled later. It has already been implemented.

Current decision:

- stop expanding persistence features,
- harden conflict/migration behavior before adding more profile complexity.

---

# Revised execution order

```text
NOW
A. Hardening gate
   CI/build -> tests -> data versioning -> sync conflict safety -> diagnostics -> performance

NEXT
B. Quest/blocker quality + wipe archives

THEN
C. Raid optimization V2
   verified spawns/extracts -> real map overlay -> traversal graph -> safer routing

THEN
D. Item/stash intelligence V2

THEN
E. Advanced Kappa/Lightkeeper/trader planning

LATER
F. Squad mode
G. Analytics/integrations/polish
```

---

# Release gate

The Tarkov Tracker must not be considered production-ready until all of the following are true:

- production build passes in CI,
- TypeScript passes,
- lint passes,
- core domain tests pass,
- Firestore rules are tested,
- multi-device sync behavior is tested,
- dataset version/migration behavior exists,
- upstream failure does not erase progress,
- patch simulation does not erase progress,
- PvP/PvE isolation is verified,
- mobile performance is acceptable,
- no screen silently treats eligibility as confirmed player truth.
