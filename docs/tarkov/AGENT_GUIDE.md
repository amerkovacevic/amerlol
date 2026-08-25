# Tarkov Tracker Agent Guide

Read the existing implementation before modifying it. Reuse Amer.lol conventions and shared components where they fit.

## Completion rules

An agent may not mark work complete when it contains placeholder production behavior, fake data, unfinished TODO implementations, or knowingly broken types.

For each task:

1. Inspect relevant existing routes/components/lib code.
2. Implement the smallest coherent feature.
3. Keep domain logic outside React components.
4. Avoid duplicating existing abstractions.
5. Add or update tests for non-trivial domain logic.
6. Check TypeScript and lint/build compatibility.
7. Document important architecture decisions.

## Tarkov-specific rules

- Do not hardcode game data that belongs in the upstream dataset.
- Do not use quest/item names as persistent IDs.
- Do not let browser components call json.tarkov.dev directly.
- Keep static game data separate from user progression.
- Treat PvP and PvE as independent progression profiles.
- Never erase progress merely because the upstream dataset changed.
- All external responses must be validated.
- Quest availability and dependency calculations must be deterministic.
- Prevent recursion/cycles in quest graph traversal.
- Support local upstream corrections through an override layer.
- Keep Firestore reads/writes economical.
- Every user write requires ownership protection.
- Preserve mobile usability.

## Review checklist

Before considering a phase complete, inspect the full path from data source to validation, normalization, domain logic, persistence, UI, and error handling. Fix critical/high findings before moving forward.
