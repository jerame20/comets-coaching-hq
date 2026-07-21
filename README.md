# Comets Coaching HQ

A dependency-free, mobile-first coaching app for the Comets roster, rotations, player coverage, coach feedback, and live substitutions.

## Privacy model

- Jeremy explicitly approved publishing names and planning data in the app.
- Public data is limited to roster names, preferred foot where known, role anchors, rotation emphasis, six-game rotations, position coverage counts, and role guidance.
- Subjective strengths, development priorities, and detailed coach observations remain in the private Google Sheet.
- Search indexing is discouraged with `noindex, nofollow`.
- The future voice-note workflow should capture the active hub tab and optional coach-selected context, never a silent screenshot.

## Game-day app

- Attendance-first check-in with large touch targets and a generated starting lineup
- Add-player flow with device-local roster persistence
- Six games and four attendance-aware planned quarters per game
- Large 2-3-1 field controls and bench buttons
- Tap field player, then bench player, to record a substitution
- One-tap next-quarter rotation loading and open-position handling
- 12-minute quarter clock, screen wake lock when available, vibration at zero, and substitution log
- Local persistence and service-worker caching for refresh/offline resilience

## Coach notes

Coach notes save locally on the device and use the browser's native share sheet, which lets a coach send the structured note into GroupMe, Messages, or email without exposing a new backend. Automated Google Form creation was attempted, but the Google Forms API is disabled on Jeremy's configured Google project.

## Local preview

```bash
python3 -m http.server 4178 --directory projects/tycho-soccer
```

Then open `http://127.0.0.1:4178`.

## Sensible next phases

1. Coach voice notes: record audio with explicit permission and attach the current hub tab, coach identity, and optional player selected by the coach. Transcribe into a private review queue for Jeremy; never silently capture the screen.
2. Shared feedback backend: typed and voice notes grouped by player, practice, or game, with Jeremy approving every change before it reaches the planner.
3. Absence auto-fill: recommend the available player with the lowest season coverage count for the open position while preserving both-half participation.
4. Practice builder: choose a theme, available time, and player count; generate a printable plan and equipment list from the coaching curriculum.
5. Schedule sync: read the official PSA schedule into a shared calendar while preserving the existing dedupe and child-name rules.

## GroupMe

GroupMe has an official API v3 and official bot callbacks, so an MCP server is optional. The safer integration is a small, scoped connector that can read only the team group and drafts suggested replies for Jeremy. Three tiny third-party GroupMe MCP repositories existed as of July 2026, but all were zero-star projects with little history; none should receive a real GroupMe token without a code audit.
