# Deepcuts architecture

Deepcuts currently runs as a playable static daily game. The stricter verified-data/server architecture remains separate from this provisional mode.

## Firestore namespace

All game-owned data is rooted at `footballDeepcuts/{document}`. The root document is a namespace marker; child collections hold `clubs`, `players`, `appearances`, `questionBank`, `dailyChallenges`, and server-derived `leaderboards`. Private user state lives under `users/{uid}/footballDeepcutsResults/{utcDate}` and `users/{uid}/footballDeepcutsStats/summary`.

Published challenge documents must contain public club/question metadata only. Frozen answers are server-only and must never be embedded in a client-readable challenge document. The current rules deny all client access to the game namespace and user game writes until a trusted backend exists.

## Data ingestion and verification

`FootballDataProvider` separates upstream imports from normalization and validation. Unknown appearance counts remain `undefined`; they are never converted to zero. Records are eligible only when both player-club rows have a positive competitive-appearance count and `verified` status.

The initial `WikidataProvider` accepts an explicit club-QID allowlist and imports player identities, club identities, membership periods, and any available `number of matches played` qualifier. Every imported player and relationship remains `pending`: Wikidata membership is an identity lead, not proof that the player made an eligible senior competitive appearance. The verification gate additionally requires a positive integer total, complete attribution, and a verification date.

## Interim static game

Until a trusted API is selected, `scripts/generate-deepcuts-database.mjs` builds `public/data/deepcuts/database.json` from an allowlist of 20 validated major European clubs. An eligible provisional relationship must belong to an association-football player and have a positive Wikidata `number of matches played` (`P1350`) qualifier on the club-membership (`P54`) statement. The static generator creates two-club, club-and-citizenship, and three-club career-path questions. Era questions are disabled because membership dates do not prove appearances in a decade. Citizenship questions explicitly use citizenship, not national-team representation.

The browser selects the same five questions for everyone from the UTC date, searches the entire player catalog, allows three distinct guesses per question, and stores completion locally. This is an interim mode: the downloaded JSON necessarily exposes answers, users can alter local results, Wikidata match counts can represent league rather than total competitive appearances, and results are not suitable for verified leaderboards. Refresh current squads with `npm run refresh:deepcuts-rosters`, then run `npm run validate:deepcuts-data`. A full Wikidata rebuild uses `npm run generate:deepcuts-data` and must be followed by the roster refresh. Do not present this dataset as fully verified production data.

Guest play uses Firebase Anonymous Authentication silently, so no registration screen is required. Completed games are immutable at `users/{uid}/deepcutsResults/{utcDate}`. Players may optionally publish one immutable entry at `deepcutsDailyLeaderboard/{utcDate}_{uid}` after choosing a 2–24 character display name. Registered users additionally maintain `users/{uid}/deepcutsStats/summary`. Anonymous Authentication must be enabled in the Firebase console before guest leaderboard publishing will work.

Firestore rules enforce UID ownership, one create per date, immutable results and leaderboard entries, score bounds, five question scores, and total consistency. Since accepted answers live in public static JSON, client-derived scores remain tamperable; the leaderboard must be considered provisional until score validation moves to a trusted backend.

Wikidata is a useful open source for stable QIDs, aliases, dates, nationalities, and club membership leads under CC0. It does not consistently establish senior competitive appearances, so membership statements alone are insufficient. A production importer needs a second source with explicit competitive totals and commercial-reuse terms, plus an admin verification queue and retained attribution. The static answer dataset is included in `public/data/deepcuts/database.json`.

## Scoring and generation

Scoring is centralized in `lib/football-deepcuts/scoring.ts`. Version `min-appearances-v1` uses `min(club A appearances, club B appearances)` and maps 1–4 to 100, 5–19 to 85, 20–49 to 60, 50–99 to 30, and 100+ to 10. Generated answers store counts, score, timestamp, and scoring version so history cannot drift.

The pure candidate generator intersects verified player-club rows, rejects duplicates and inadequate answer sets, calculates frozen answers, and reports tier distribution. Scheduling five daily questions, 90-day pair exclusion, difficulty balancing, manual review, and publishing belong in a trusted server/admin layer.

The deterministic daily selector now filters to approved questions, accepts the 90-day exclusion set, prefers the configured 15–40 answer range and broader tier coverage, and penalizes repeated clubs within the same five-question slate. It throws instead of silently publishing an undersized challenge.

Question-bank generation discovers every club pair represented by verified appearance rows, evaluates each pair through the quality gate, and returns accepted/rejected groups plus aggregate scoring-tier totals for inspection. The player-search index is built separately from questions, normalizes diacritics and aliases, and provides nationality/birth-year disambiguation without receiving accepted-answer data.

## Required production backend

The repository currently uses Next.js static export and Firebase Hosting, with no server runtime. For authoritative score validation, add a trusted backend (for example callable HTTPS Cloud Functions or a separately hosted API) that verifies Firebase ID tokens, rate-limits search/submission, keeps answer lists private, performs atomic idempotent writes, and derives totals/statistics. Deployment and production infrastructure changes require explicit approval.

## Roster refresh and attempts

The October 16, 2026 roster snapshot covers all 20 clubs using ESPN current 2026–27 league rosters, retaining source URL, retrieval date, season, player IDs and observed appearance counts. Wikidata P3681 reconciles provider identities; English aliases and citizenship labels are imported for roster players. Players with no recorded appearances remain searchable but roster registration alone never makes them accepted answers. Current-season appearance evidence fills missing club relationships, retaining its season scope rather than claiming a career total. Historical Wikidata records retain their original retrieval dates. These sources are not a complete independently audited match database, and their counts have different scopes.

The shared question builder produces the answer bank. Validation checks every accepted answer against its player/club relationships, verifies citizenship criteria and scores, and detects omitted source-eligible answers. The roster refresh validates the entire result before writing and fails if any roster, provider identity, or season is invalid. It does not silently publish a partial refresh.

Wrong guesses remain on the same question until the third miss, which automatically advances with zero points. A correct guess ends the question immediately and shows its source-scoped match counts before continuing. Repeated players are excluded from suggestions and rejected by the attempt helper. Draft attempts survive reloads in local storage; completed results retain guess history and remain compatible with existing result documents. Gameplay starts without waiting for Firebase identity initialization.
