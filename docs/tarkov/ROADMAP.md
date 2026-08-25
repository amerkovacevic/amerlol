# Tarkov Tracker Product Roadmap

## Core product rule

`My Quests` is presence-backed. Calculated eligibility may inform planning, but it cannot silently add quests to the player's current quest list or raid optimizer.

## What to do next — first-class feature

The tracker must answer one question exceptionally well:

> What should I do in my next raid to maximize quest progression?

This feature is not optional polish. It is a core product surface.

### V1 — implemented foundation

- Rank maps using incomplete objectives from confirmed current quests only.
- Prefer maps where several quests/objectives can be stacked in one raid.
- Include represented quest XP and Kappa relevance in scoring.
- Extract required quest equipment/markers into `What to bring`.
- Extract required key metadata into `Keys / access`.
- Order objectives into a deterministic raid line:
  1. setup-sensitive carried-item/key objectives,
  2. plant/place/mark/retrieve/location objectives,
  3. passive combat objectives while moving,
  4. survive/extract objectives last.
- Show next-best map alternatives.
- Recalculate immediately when quest presence, quest status, or objective completion changes.

### V2 — exact geographic routing

The V1 raid line is priority-optimized, not yet geographically exact. Do not label it as shortest-path or exact optimal routing until coordinate data exists.

Add a coordinate-backed map layer containing:

- objective coordinates/areas,
- quest item locations,
- locked doors/key locations,
- extracts,
- spawn regions,
- optional danger/traffic weighting,
- map traversal graph or walkable route graph.

Then build route optimization that can answer:

- Where should I go first from this spawn region?
- What is the lowest-backtracking order for my objectives?
- Which objectives should I skip because they create excessive detour/risk?
- Which extract best finishes the route?
- Which key/quest item must be brought before queueing?

The route engine should support configurable strategies:

- `Max progression` — maximize objectives/quests progressed per raid.
- `Shortest line` — minimize route distance/backtracking.
- `Safer line` — penalize high-risk areas when risk data is available.
- `Kappa focus` — increase weight of Kappa-required quest progression.
- `Fast XP` — prioritize quest XP per estimated route cost.

### V3 — raid readiness

Before the player queues, show a compact checklist:

```text
RUN: Customs

BRING
- MS2000 Marker x2
- Dorm 206 key

DO
1. Construction — plant marker
2. Dorms — retrieve quest item
3. Gas Station — progress Scav kills while moving
4. Extract — survive and leave

WATCH FOR
- FIR items needed for confirmed/current or near-future quests
```

The planner should warn when a route appears impossible because a required item/key is missing from the known loadout state once inventory/loadout tracking exists.

## Next implementation order

1. Improve item requirement classification: bring vs find-in-raid vs future-save.
2. Build Items Needed from confirmed current quests.
3. Feed FIR/save items into `Watch for` on the next-raid plan.
4. Build map objective/location data model.
5. Add coordinate ingestion/override layer.
6. Build spawn-aware geographic route optimizer.
7. Add extract-aware route ending.
8. Add route strategy selection and scoring explanation.
9. Add squad-aware combined route planning.
10. Add Firestore-backed profile/progress/presence while retaining guest mode.
