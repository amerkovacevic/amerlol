# Frontend design and interaction audit

Date: October 16, 2026

Reference: `/styleguide`, shared `components/ui` primitives, global theme tokens, and the README design system. Existing uncommitted work was preserved.

## Changes made

- The shared app shell owns the app title and description. Removed repeated introductions from seven apps and the search-link generator; replaced duplicate H1s in Gauntlet and STL Monitor with task headings. Added an assertion for one H1 matching the registry name in every app's integration test.
- Added the same quiet account-benefit reminder on home, hub, about, and all app shells. It opens the existing authentication dialog, hides during auth loading and for registered accounts, and remains visible for anonymous game identities. Four tests cover this behavior.
- Hub search and category filters now intersect. Featured ordering actually prioritizes featured apps. Replaced unsupported New/Popular choices with alphabetical sorting. Added accessible search/sort names, pressed states, and a result count. Public app discovery no longer waits for authentication.
- Shared cards start flat, reset after hover, keep equal heights, have visible keyboard focus, and respect reduced motion. Removed render-time reads of DOM refs.
- Improved filled-primary and hovered-accent foreground contrast while retaining the brand blue. Sign-in text links use the readable foreground color with an underline.
- App navigation wraps on small screens. Encoding-tool tabs wrap into two columns on mobile. Long dialogs scroll within the viewport and retain outer spacing.
- Added accessible field names in Diff Checker, Next Watch, encryption tools, Pickup Soccer, Secret Santa, and Color Crafter. Diff file uploads are keyboard accessible; copy buttons have names.
- About build-log titles and dates stack on mobile. Home update descriptions no longer split at abbreviations such as St. Louis or label every change as a new app. The secondary home CTA now says where it goes.
- Navigation exposes the current page. Theme switching uses the resolved system theme, so the first click reliably changes the visible theme.
- Added a shared reduced-motion configuration and disabled smooth scrolling for reduced-motion users. The smooth-scroll frame loop is canceled on unmount.
- Added interaction rules to the living style guide.

## Validation

Browser checks used 390 × 844 and 1440 × 1000 viewports. All 14 app entry screens rendered one H1 and had no document-level horizontal overflow at both sizes:

| App | Mobile | Desktop |
| --- | --- | --- |
| Deepcuts | Pass | Pass |
| Atlas Sprint | Pass | Pass |
| Next Watch | Pass | Pass |
| STL Monitor | Pass | Pass |
| Let Me Google That | Pass | Pass |
| Encryption Platform | Pass | Pass |
| Diff Checker | Pass | Pass |
| Time Zone Converter | Pass | Pass |
| Pickup Soccer | Pass | Pass |
| Secret Santa | Pass | Pass |
| Football Manager Team Picker | Pass | Pass |
| Color Crafter | Pass | Pass |
| Amer Gauntlet | Pass | Pass |
| Stickr | Pass | Pass |

Home, hub, and about were inspected in the browser. Verified combined category/search empty results, alphabetical sorting, mobile navigation opening, reminder opening the authentication dialog, and light/dark switching. These are entry-screen and selected interaction checks, not exhaustive game or account lifecycle tests.

- `npm run test:foundation`: 65 tests pass across 3 files, including settings interaction coverage for every app.
- `npx tsc --noEmit`: passes.
- `npm run build`: passes; all 21 static pages generated.
- Focused ESLint checks pass for the new reminder, motion provider, shared dialog/button, hub filter, landing/about/styleguide components, app shell, and reminder tests.
- Full ESLint remains failing: 53 errors and 18 warnings. Remaining errors concern state updates in effects (31), use of functions before declaration (18), and impure calls during render (4). Dependency warnings account for the 18 warnings. These existing logic patterns span apps, navigation/theme hydration, the iOS banner, and 404 interactions. They require separate logic refactoring and regression verification; this audit does not certify a clean repository-wide lint result.

## Limits and follow-up validation

No real account was created and no production groups, exchanges, palettes, or scores were submitted. Registered-account reminder hiding is covered with mocked auth; real signed-in, multi-user, network-failure, import/export, timer completion, and permission-denied flows were not exhaustively exercised in the browser. Real-device testing, a screen-reader pass, complete contrast measurement, and human usability sessions are still needed before claiming full accessibility compliance or ideal human interaction. App-specific maps, games, wheels, and sticker tools intentionally retain controls appropriate to their task inside the consistent shell.
