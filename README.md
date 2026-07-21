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
- PSA 2nd-grade defaults: indoor 9v9 with two 20-minute halves and outdoor 7v7 with four 12-minute quarters, with two formations per format
- Add-player flow with device-local roster persistence
- Six games with attendance-aware plans for either halves or quarters
- Large 2-3-1 field controls and bench buttons
- Tap field player, then bench player, to record a substitution
- Mid-period substitutions settle the game clock instantly and preserve structured in/out timestamps
- Live per-player playing-time totals persist across periods, refreshes, pauses, and brief screen locks
- One-tap next-period rotation loading and open-position handling
- PSA timing presets (4×10, 4×12, 2×25, 2×30, and 2×35) plus custom halves/quarters and period length
- Field-player colors use cumulative game minutes: red at the planned rotation target (25% of the game), purple at 50%, and pink at 75%
- Configurable clock, screen wake lock when available, vibration at zero, and substitution log
- Local persistence and service-worker caching for refresh/offline resilience

## Coach notes

Coach notes save locally on the device and submit to a private Google Form owned by Jeremy. Responses land in a linked private Sheet for Darwin's intake monitor; native sharing remains available as a fallback. Failed sends stay visibly marked on the device and can be retried.

The deterministic launchd monitor in `scripts/note_intake_monitor.py` checks the response Sheet once per minute and relays unseen rows to the private soccer-coaching Discord channel. Minute-level freshness is intentional because notes may be submitted during games; a slower interval would leave coaches thinking the submission disappeared. SHA-256 row fingerprints provide deduplication, and failures alert the channel at most once per hour.

Every text-entry field includes inline browser voice dictation. Tap the mic to start, speak, and tap again to stop. Dictation uses the browser's explicit microphone permission and inserts the transcript directly into the active field; no audio is stored by the app.

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
