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
