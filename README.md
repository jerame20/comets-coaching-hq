# Comets Coaching HQ

A dependency-free, mobile-first launcher for the private Comets coaching planner.

## Privacy model

- The website contains no player names or private notes.
- Player data remains in the Google Sheet and follows its Google Drive permissions.
- Search indexing is discouraged with `noindex, nofollow`.
- The future voice-note workflow should capture the active hub tab and optional coach-selected context, never a silent screenshot.

## Local preview

```bash
python3 -m http.server 4178 --directory projects/tycho-soccer
```

Then open `http://127.0.0.1:4178`.

## Sensible next phases

1. Coach voice notes: record audio with explicit permission and attach the current hub tab, coach identity, and optional player selected by the coach. Transcribe into a private review queue for Jeremy; never silently capture the screen.
2. Coach feedback inbox: typed notes and voice notes grouped by player, practice, or game, with Jeremy approving every change before it reaches the planner.
3. Game-day mode: large, offline-capable rotation cards, substitution timer, attendance toggles, and one-tap “player absent” recalculation.
4. Practice builder: choose a theme, available time, and player count; generate a printable plan and equipment list from the coaching curriculum.
5. Schedule sync: read the official PSA schedule into a shared calendar while preserving the existing dedupe and child-name rules.

## GroupMe

GroupMe has an official API v3 and official bot callbacks, so an MCP server is optional. The safer integration is a small, scoped connector that can read only the team group and drafts suggested replies for Jeremy. Three tiny third-party GroupMe MCP repositories existed as of July 2026, but all were zero-star projects with little history; none should receive a real GroupMe token without a code audit.
