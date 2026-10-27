# Known issues

Open problems that need product or architecture decisions. Remove an entry when it is resolved.

## Security and data integrity

- **Secret Santa responses are publicly readable.** Exchange documents in `secretSantaExchanges` are
  readable by anyone and can contain participant responses, participant ids and legacy assignment maps.
  Firestore cannot hide individual fields, so fixing this means moving private data into a separate,
  owner-readable document. That needs a backed-up data migration and a matching client release.
- **Game results are written by the browser.** Deepcuts and Amer Gauntlet rules check the shape and ownership
  of a result, not whether it was really earned, so leaderboards can be forged. Trustworthy leaderboards need
  scoring on a server.
- **Usernames are not unique.** Two accounts can choose the same @username. Enforcing uniqueness needs a
  `usernames/{name}` index written in the same transaction as the profile.

## Product

- **STL Monitor has three live sources**: MoDOT traffic, NWS weather alerts and local news. Illinois (IDOT)
  traffic, Metro Transit alerts and crime statistics are not connected, so those categories are hidden. The
  `transit` and `crime` keys remain in the settings schema so existing saved settings stay valid.
- **STL Monitor news uses public CORS proxies**, which can be slow, rate-limited or go away.

## Scale and operations

- Social collections (`games`, `colorPalettes`, `secretSantaExchanges`) are read without pagination.
- Production indexes, Auth provider settings, App Check, backups and alerting have not been reviewed.
- The site runs React 18, which Next.js 16 has deprecated. Upgrading to React 19 is a separate change.
