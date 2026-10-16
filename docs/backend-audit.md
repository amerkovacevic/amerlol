# Site foundation and backend audit — October 16, 2026

This change validates the local implementation. It is not a certification of the deployed Firebase project, production traffic, backups, or external feed availability. No production documents were read or written, no rules were deployed, and no bundled datasets were changed.

## Architecture

The site exports static pages. Firebase Auth and Firestore provide account identity and persistence; there is no trusted application server in this repository that verifies gameplay. Device-only apps use local storage.

`lib/apps/settings.ts` defines supported preferences, defaults, input validation, legacy storage keys, and existing Firestore collection names. `AppSettingsProvider` owns the load/save lifecycle. `AppSettingsPanel` supplies validated import/export, explicit Save, Cancel, and a preference-only reset. The component registry requires both a main component and settings component for every app.

Account settings use owner-scoped subscriptions and transaction-based, field-level merge writes. A save checks the edited fields against the original draft to prevent overwriting another device's changes. Unknown legacy fields and existing creation timestamps remain intact. Loading, malformed imports, failed reads, blocked storage, failed saves, and account switches are covered by regression tests. Reads never initialize or migrate documents.

Device preferences work without signing in. Guest settings are not implicitly copied into accounts. Atlas Sprint, Next Watch, and Deepcuts preferences remain device-only. Stickr retains a separate provider because its existing document combines preferences and collection data; it serializes explicit edits, merges only changed fields, and keeps guest/account sessions separate.

## All 14 hub apps

| App                          | Working settings and behavior                                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deepcuts                     | Sourced answer-count visibility and question-mix guide. Settings do not change questions, scoring, completed results, or leaderboard consent.                                                                                   |
| Atlas Sprint                 | Focus the map on correctly guessed countries. Updating preferences preserves an active quiz.                                                                                                                                    |
| Next Watch                   | Spin duration and release-year visibility. Existing watchlists stay untouched when preferences change. Reduced-motion accessibility overrides animation duration.                                                               |
| Encryption                   | Automatic conversion, clearing input when switching tools, default tool, and text size. Saved tool changes select the actual tool.                                                                                              |
| Diff Checker                 | Ignore case, ignore leading/trailing whitespace, line-number visibility, and text size. Comparison preserves the original text. Large comparisons fail with a message instead of allocating an unbounded table.                 |
| Time Zone Converter          | Default IANA zones, 12/24-hour display, seconds, day/night indicators, and automatic refresh. Display and offsets use the selected date, including daylight saving and fractional offsets.                                      |
| Pickup Soccer                | New-game capacity/location defaults, showing only games created/joined by the user, and joining games the user creates. Joining/leaving uses transactions and enforces capacity.                                                |
| Secret Santa                 | Default budget for new exchange forms and showing only exchanges created/joined by the user. Existing exchanges are not rewritten.                                                                                              |
| Football Manager Team Picker | Pick mode/count, tier, same-country/league defaults, history persistence, and favorites-only filtering. An empty favorites list produces no favorite-only candidates.                                                           |
| Color Crafter                | New-palette color count, color-code visibility, click-to-copy, HEX/RGB/JSON export, and like-count visibility. Existing palettes are not rewritten.                                                                             |
| Amer Gauntlet                | Timer/hint visibility, guess animations, and Enter submission. Changing preferences preserves an active game and its scoring rules.                                                                                             |
| STL Monitor                  | Default categories/severity/window, automatic refresh and interval, and light/dark map appearance.                                                                                                                              |
| Let Me Google That           | Animation speed, redirect delay, and query visibility. Generated links carry those preferences. Query parameters are decoded once and playback timers are cleaned up.                                                           |
| Stickr                       | Existing album, display-name, and trade-card-theme controls. Reset changes display preferences only. Album changes are locked while either sticker list contains entries, preventing silent filtering/deletion of a collection. |

Controls for unimplemented services were removed from the UI: email reminders, push notifications, Gauntlet difficulty/sound effects, and unsupported styling options. Their historical document fields were not deleted. Exposing a toggle that merely stores a value is not treated as working functionality.

## Data preservation

- Existing collection/document paths and bundled data files are unchanged.
- Secret Santa no longer migrates public legacy assignment maps when an exchange page loads. The legacy read fallback remains for compatibility.
- Stickr no longer creates a document on page load or copies one account's local collection into another account. Unsynced guest lists remain under the original device key and can be accessed signed out.
- Next Watch no longer removes stored `sample-*` entries on load. Malformed watchlists are left intact instead of being overwritten with an empty array. Imports validate rows and external links; existing stored URI fields are preserved but unsafe links are not rendered.
- Preference resets do not delete game results, watchlists, favorites, games, exchanges, palettes, or sticker lists.

## Verification

- 61 component/unit tests, including a settings-access smoke test for every hub app, real component preference behavior, transaction conflicts, account switching, failed storage, invalid imports, CSV edge cases, and preservation of existing data.
- 15 Firestore emulator tests against the disposable `demo-amerlol-audit` project. Coverage includes owner-only settings, malformed/range-invalid writes, unchanged legacy metadata, deletion denial, private profiles/lists/assignments, unknown collections, and simultaneous game joins.
- Existing 13 Secret Santa and Deepcuts tests pass.
- Deepcuts data validation passes: 20 clubs, 9,874 players, 11,810 appearances, 478 questions. No data regeneration was run.
- TypeScript and the production static-export build pass.
- `npm audit --omit=dev`: zero vulnerabilities. Ten development-tool findings remain from upstream `braces` and `uuid` dependency chains.
- Repository-wide lint is not clean. The newer Next/React lint configuration reports hook/compiler-rule failures in app and layout code. No lint rules were disabled to hide them.

The component tests mock Firebase transport, map rendering, and external feeds; they do not prove production credentials, indexes, map tile rendering, or feed uptime. The rules suite runs the actual Firestore rules in the emulator. CI is configured to run the foundation checks, rules suite, and production dependency audit on pushes to main and pull requests; the hosted CI job itself has not been run here.

## Repeatable checks

```sh
npm ci
npm run check:foundation
npm run test:rules
npm audit --omit=dev
```

The rules suite requires Java 21+ and an available local port 8088. On Windows, point `JAVA_HOME` and `PATH` to an installed Java 21 runtime before running it if an older Java shim is first on PATH. It never targets the real project. `generate:settings-rules` regenerates account preference validators from the shared schemas; `check:settings-rules` detects drift without modifying files. The dedicated emulator config does not alter hosting or production Firebase configuration.

## Outstanding production release concerns

These require explicit architecture/deployment work and must not be mistaken for verified production security:

1. **Sensitive Secret Santa fields share a public document.** Exchange documents remain publicly readable and may include participant responses, participant identifiers, and legacy assignment maps. Firestore cannot redact individual fields on reads. Separating public discovery metadata from private responses/assignments requires an intentional, backed-up data migration and compatible client rollout. The existing automatic migration was removed to honor the no-data-changes constraint.
2. **Competitive results are client-authored.** Deepcuts validates score shape and ownership, but a browser can forge a valid-looking result. Gauntlet leaderboard rules are also owner-based, not server-scored. Production-grade anti-cheat requires trusted scoring endpoints and narrowly scoped rules. Changing preference controls cannot establish score integrity.
3. **Some social collections are fetched without pagination, and feed integrations lack an operational service boundary.** Add pagination/query budgets, bounded requests, telemetry, and a controlled ingestion/cache service before claiming load-tested enterprise reliability. Existing public-source data and feed behavior were preserved here.
4. **Deployment and operations were not inspected.** Validate production indexes, Auth/provider configuration, rate limits, App Check, backup/restore procedures, incident alerts, privacy/retention policy, and staging-to-production rollout separately. Review and deploy the tested rule changes together with the client update; local edits do not secure an already deployed site.
5. **Static hosting uses an SPA catch-all rewrite.** Unknown paths can return the root HTML with a 200 response. Review static-export routing and real 404 behavior in staging before changing hosting configuration.

This work establishes a consistent, tested preference/persistence foundation and fixes concrete access/concurrency defects. The concerns above remain release blockers for a claim of enterprise-grade backend assurance.
