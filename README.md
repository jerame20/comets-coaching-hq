# Comets Coaching HQ

A dependency-free, mobile-first coaching app for the Comets roster, rotations, player coverage, coach collaboration, and live substitutions.

The soccer-ball artwork is adapted from Twemoji's `26bd.svg` under CC-BY 4.0.

## Privacy model

- Jeremy explicitly approved publishing names and planning data in the app.
- Public data is limited to roster names, preferred foot where known, role anchors, rotation emphasis, six-game rotations, position coverage counts, and role guidance.
- Subjective strengths, development priorities, and detailed coach observations remain in the private Google Sheet.
- Search indexing is discouraged with `noindex, nofollow`.
- The future voice-note workflow should capture the active hub tab and optional coach-selected context, never a silent screenshot.

## Game-day app

- Attendance-first check-in with large touch targets and a generated starting lineup
- PSA 2nd-grade defaults: indoor 9v9 with two 20-minute halves and outdoor 7v7 with four 12-minute quarters; outdoor includes 2-3-1, 3-2-1, 1-3-2, and 1-2-3 formations
- Live formation switching that preserves the current on-field group, clock, playing-time totals, and game log
- One-block Markdown export of every app-visible roster, role, coverage, rotation, game-state, and coach-board dataset
- Phone navigation keeps all six sections visible in a compact two-row grid; 16px controls and strict width containment prevent iOS focus zoom and accidental page-level horizontal scrolling
- Add-player flow with device-local roster persistence
- Player profile edits, additions, and removals sync through the private intake Sheet into a shared durable roster; local storage remains the instant/offline copy
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

## Coach board

The Coach board remembers one of three device-local identities: Jeremy, Bryan, or Dante. Coaches can create posts with links and add threaded replies. New items appear immediately as pending, submit through Jeremy's private Google Form, and are mirrored into the read-only board feed by Darwin's intake monitor.

## App versions and changelog

`changelog.js` is the canonical app-version source. User-visible releases follow semantic versioning and prepend one release entry with a date, summary, and concrete shipped changes. The app renders that history in the Changelog tab, includes it in the Markdown export, and shows the current version in the footer. Every release must also bump the affected asset query strings and service-worker cache name so installed apps receive it promptly.

The deterministic launchd monitor in `scripts/note_intake_monitor.py` checks the response Sheet once per minute, rebuilds `board.json`, and publishes changed board data. App-idea posts are also relayed to the private soccer-coaching Discord channel so Darwin can flag them for Jeremy. SHA-256 row fingerprints provide deduplication, and failures alert the channel at most once per hour.

Board messages and replies include browser voice dictation. Coach identity remains a fixed dropdown and is remembered on that device.

## Local preview

```bash
python3 -m http.server 4178 --directory projects/tycho-soccer
```

Then open `http://127.0.0.1:4178`.

## Sensible next phases

1. Push notifications: add an opt-in Web Push backend so installed iPhone PWAs can receive background alerts and update the icon badge while closed.
2. Absence auto-fill: recommend the available player with the lowest season coverage count for the open position while preserving both-half participation.
3. Practice builder: choose a theme, available time, and player count; generate a printable plan and equipment list from the coaching curriculum.
4. Schedule sync: read the official PSA schedule into a shared calendar while preserving the existing dedupe and child-name rules.

## GroupMe

GroupMe has an official API v3 and official bot callbacks, so an MCP server is optional. The safer integration is a small, scoped connector that can read only the team group and drafts suggested replies for Jeremy. Three tiny third-party GroupMe MCP repositories existed as of July 2026, but all were zero-star projects with little history; none should receive a real GroupMe token without a code audit.
