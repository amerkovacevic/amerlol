# amer.lol

A playful hub of mini-apps, games and experiments. It is a statically exported Next.js 16 site on Firebase
Hosting, with Firebase Auth for accounts and Firestore for synced data.

## Getting started

Requires Node.js 22+. Firebase settings come from `NEXT_PUBLIC_FIREBASE_*` variables in `.env`.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static site in out/
```

## Project structure

```
app/
  (site)/                  Pages that share the header and background
    page.tsx               Landing page
    hub/                   App gallery with search and filters
    a/[appId]/page.tsx     Every hub app, statically generated from the registry
    about/  account/  styleguide/
  not-found.tsx            The Lost & Found 404 page
  layout.tsx               Providers: theme, auth, profile, accent colour
components/
  apps/                    One folder per app, plus the shared shell and settings panel
  auth/                    Auth and profile providers, sign-in dialog, username onboarding
  hub/  landing/  layout/  not-found/  account/  styleguide/
  ui/                      shadcn/ui primitives
lib/
  apps/                    Registry, settings schemas, lazy component map, pure app logic
  hooks/                   useAsync, useNow, useHydrated, useResettableState
  firebase/                config.ts (app + auth), db.ts (Firestore), user-facing errors
  account/  football-deepcuts/  secret-santa/  stickr/
scripts/                   Data generation and Firestore rules generation
tests/                     Vitest and node:test suites
public/data/               Static datasets (Deepcuts, countries, teams)
docs/                      Guides and known issues
```

To add an app, follow [docs/creating-new-apps.md](docs/creating-new-apps.md). Open problems are tracked in
[docs/known-issues.md](docs/known-issues.md), and Deepcuts' data pipeline is described in
[docs/football-deepcuts.md](docs/football-deepcuts.md).

## Performance notes

- Each app page downloads only its own app. Large libraries (MapLibre, html2canvas, crypto-js) stay in
  that app's chunk.
- The Firestore SDK is not part of the shared bundle. Site-wide code loads it on demand once someone signs
  in, and app chunks import it from `lib/firebase/db`.
- Page entrance animations are CSS (`.animate-enter` in `app/globals.css`), so content is visible before
  JavaScript loads. Framer Motion is only used inside apps and the 404 page.

## Data

`firestore.rules` is the source of truth for the data model. Per-user data lives under `users/{uid}`
(profile fields plus one subcollection per app); shared data lives in top-level collections such as
`games`, `colorPalettes`, `secretSantaExchanges` and the leaderboards. Settings validators in the rules are
generated from `lib/apps/settings.ts` with `npm run generate:settings-rules`.

## Checks

```bash
npm run check:foundation  # settings rules, formatting, lint, types, tests, dataset validation, build
npm run test:rules        # Firestore rules against the emulator (needs Java 21+)
npm run format            # apply Prettier
```

CI runs the same checks on pushes and pull requests (`.github/workflows/validate.yml`).

## Design system

- Colors are CSS variables in `app/globals.css`, derived from one of five accent palettes that users choose
  in Account Settings (synced to their account).
- Headings use Space Grotesk and body text Inter, loaded with `next/font`.
- Light and dark mode follow the system and can be toggled in the header.
- `/styleguide` shows the components and interaction rules.

## License

See [LICENSE](LICENSE).
