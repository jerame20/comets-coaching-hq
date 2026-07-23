window.COMETS_APP = {
  version: "1.4.3",
  releases: [
    {
      version: "1.4.3",
      date: "July 23, 2026",
      title: "Avyaan’s name, corrected",
      summary: "The roster now uses Avyaan’s correct name everywhere while keeping existing saved game data intact.",
      changes: [
        "Updated Avyaan’s name across player cards, rotations, coverage, and exports.",
        "Migrated stale local and shared profiles to Avyaan.",
        "Preserved the existing player ID so saved attendance, lineups, and game history continue to work."
      ]
    },
    {
      version: "1.4.2",
      date: "July 21, 2026",
      title: "Navigation that stays out of the way",
      summary: "The full app navigation now remains accessible without colliding with iPhone system UI.",
      changes: [
        "Kept the tab bar sticky and visible across every app page.",
        "Added iPhone safe-area spacing to the header, tab bar, and live-game clock.",
        "Locked the Game Day dot and label onto one line."
      ]
    },
    {
      version: "1.4.1",
      date: "July 21, 2026",
      title: "Clearer mobile Board replies",
      summary: "Voice dictation no longer covers the reply field on narrow screens.",
      changes: [
        "Moved the reply microphone beside the text field instead of overlaying it.",
        "Kept the text field, microphone, and Reply button as separate full-size mobile controls."
      ]
    },
    {
      version: "1.4.0",
      date: "July 21, 2026",
      title: "Versions you can actually see",
      summary: "A permanent release history now shows what changed and when it shipped.",
      changes: [
        "Added the Changelog tab and visible app version.",
        "Grouped completed work into readable releases instead of leaving app ideas in limbo."
      ]
    },
    {
      version: "1.3.0",
      date: "July 21, 2026",
      title: "Shared data and flexible game day",
      summary: "Coach edits now travel with the team, and Game Day handles more real-world changes.",
      changes: [
        "Synced player profile edits across coaches and devices.",
        "Added 1-3-2 and 1-2-3 formations plus mid-game formation switching.",
        "Added a complete Markdown export of app-visible data.",
        "Made all navigation visible on phones and removed horizontal overflow.",
        "Fixed the installed-app icon so the soccer ball appears reliably."
      ]
    },
    {
      version: "1.2.0",
      date: "July 21, 2026",
      title: "Coach Board",
      summary: "Jeremy, Bryan, and Dante gained a shared place for practice ideas, links, questions, and replies.",
      changes: [
        "Added remembered coach identity per installed app.",
        "Added shared posts, categories, YouTube links, threaded replies, and unread badges.",
        "Added voice input for Board messages."
      ]
    },
    {
      version: "1.1.0",
      date: "July 21, 2026",
      title: "Sideline controls",
      summary: "Game Day became faster, clearer, and more useful during an actual match.",
      changes: [
        "Added PSA timing presets, recommended starters, two-way substitutions, and ranked bench recommendations.",
        "Added cumulative playing-time tracking and urgency colors.",
        "Made player profiles editable and improved night-mode contrast."
      ]
    },
    {
      version: "1.0.0",
      date: "July 20, 2026",
      title: "Comets Coaching HQ launches",
      summary: "The first usable coaching app shipped with rotations, roles, coverage, and a live game planner.",
      changes: [
        "Added indoor and outdoor formations, offline support, and persistent game state.",
        "Added voice dictation, live substitutions, and per-player playing time.",
        "Established the Comets blue-and-black mobile design system."
      ]
    }
  ]
};
