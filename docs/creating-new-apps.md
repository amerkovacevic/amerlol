# Creating a New App

Every hub app is three pieces of code: metadata in the registry, a settings schema, and a main component. The
app shell, the Settings tab, routing, code splitting and settings persistence are shared and need no
per-app work.

TypeScript enforces the wiring: the build fails until an app id appears in `SETTINGS`, `APP_REGISTRY`
and `APP_COMPONENTS`.

## 1. Describe its settings

Add an entry to `SETTINGS` in `lib/apps/settings.ts`. The key is the app id (kebab-case).

```ts
calculator: {
  collection: "calculatorSettings", // omit to keep settings on the device only
  schema: z.object({
    precision: integer(0, 10).default(2),
    showHistory: bool.default(true),
  }),
},
```

- Every field needs a `.default()`; `defaultSettings()` and the Reset button use them.
- Add a human label for each field to `SETTING_LABELS` in the same file. The Settings tab is generated from the
  schema: booleans become checkboxes, enums become selects, numbers and strings become inputs.
- `legacyKey` is only for apps that already stored settings in localStorage under an older key.

If the app has a `collection`, add an empty block for it inside `match /users/{userId}` in `firestore.rules`:

```
      match /calculatorSettings/{settingsId} {
      }
```

Then run `npm run generate:settings-rules`, which fills the block with validation that matches the schema.
`npm run check:settings-rules` (part of `check:foundation`) fails if the rules and schemas drift apart.

## 2. Add the registry entry

Add metadata to `APP_REGISTRY` in `lib/apps/registry.ts`. It drives the hub, search, featured apps and page
metadata.

```ts
{
  appId: "calculator",
  name: "Calculator",
  description: "A calculator that remembers your history",
  category: "Utilities", // "Utilities" | "Games" | "Experiments" | "Social" | "Visual"
  tags: ["math", "calculator"],
  status: "live", // "live" | "beta" | "comingSoon"
  accent: "from-blue-500 to-cyan-500", // Tailwind gradient used on hover
  featured: false,
}
```

Keep entries serialisable (strings, numbers, booleans): app pages are statically generated on the server.

## 3. Build the main component

Create `components/apps/calculator/calculator-main.tsx`:

```tsx
"use client"

import { useAppSettings } from "@/components/apps/settings-provider"

export function CalculatorMain() {
  const settings = useAppSettings("calculator") // typed from the schema, already validated
  return <div className="space-y-6">{/* ... */}</div>
}
```

The shell renders the app name as the page's only `h1`, so headings inside the app start at `h2`.

Register it in `lib/apps/components.tsx`:

```ts
calculator: {
  Main: lazy(() => import("@/components/apps/calculator/calculator-main").then((m) => m.CalculatorMain)),
},
```

Each app is its own chunk, so large dependencies only load on that app's page. Optional fields:

- `Settings`: a custom settings component, only when the generated panel cannot express the settings (Stickr
  stores preferences inside its collection document).
- `additionalTabs`: extra tabs beside Overview and Settings (Deepcuts adds a leaderboard).

## Conventions

These keep apps consistent and avoid the bugs fixed in the October 2026 cleanup.

**Accounts.** Use `account` from `useAuth()` for anything that requires being signed in. `user` also includes
the anonymous identity created for Deepcuts guests, who should be treated as signed out.

**Loading data.** Load Firestore data with `useAsync(key, loader)` from `lib/hooks/use-async`. Put the loader at
module level and include the user id in the key, so a slow response for a previous account is never shown.
Call `reload()` after a write. Don't call `setState` synchronously inside an effect, and don't call functions
that are declared later in the component from an effect; `npm run lint` rejects both.

**Derived state.** If state should follow a saved setting until the user changes it, use
`useResettableState(initial, resetKey)` instead of an effect that copies props into state. Values the server
cannot know (the current time, `localStorage`, random ids) must not change the first render: use `useNow`,
`useHydrated` or read them in a state initialiser for content that only appears after loading.

**Writes that depend on current data** (joining, counters, stats, leaderboards) belong in a
`runTransaction` that re-reads the documents. Firestore cannot store nested arrays.

**Errors.** Catch `unknown`, not `any`. Show `getDataErrorMessage(error, "join the game")` or
`getAuthErrorMessage(error)` from `lib/firebase/user-facing-errors`, never `error.message` from Firebase, and
log with `logUnexpectedError` (development only).

**Browser APIs.** Use `copyText` and `downloadText`/`downloadBlob` from `lib/browser` and the helpers in
`lib/storage`, which handle denied clipboard access and unavailable storage.

**Pure logic.** Put rules, parsing and scoring in `lib/apps/<name>.ts` with a test in `tests/`. See
`codecs.ts`, `gauntlet.ts` and `team-picker.ts`.

**Honest data.** Anything generated or simulated must be labelled as such in the UI. Never present sample
data as live or official.

## Checks

```bash
npm run check:foundation   # rules sync, formatting, lint, types, unit tests, dataset validation, build
npm run test:rules         # Firestore rules in the emulator (needs Java 21+)
```

`tests/hub-apps.test.tsx` renders every registered app automatically and fails if one writes data on load,
lacks a single `h1`, or has no usable Settings tab. Add app-specific behaviour tests to the same file.

## Troubleshooting

- **Type error in `components.tsx` or `registry.ts`**: the app id is missing from one of `SETTINGS`,
  `APP_REGISTRY` or `APP_COMPONENTS`.
- **"Functions cannot be passed directly to Client Components" during build**: a registry entry contains a
  non-serialisable value such as a component or function.
- **`check:settings-rules` fails**: run `npm run generate:settings-rules` and commit `firestore.rules`.
- **Permission denied when saving**: deploy the updated rules; for settings, confirm the rules block exists.
