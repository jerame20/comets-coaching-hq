#!/usr/bin/python3
"""Relay new Comets coach-note Sheet rows into the private Discord coaching channel."""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path


PROJECT_DIR = Path("/Users/darwin/.openclaw/workspace/projects/tycho-soccer")
STATE_PATH = PROJECT_DIR / "note-intake-state.json"
GOG_SAFE = "/Users/darwin/.openclaw/workspace/scripts/gog-safe"
OPENCLAW = "/opt/homebrew/bin/openclaw"
SHEET_ID = "1J8E8bbGuMhN6IkBrNk8JGgJoatv0W9YWZg-_zSYe6RA"
SHEET_RANGE = "Form Responses 1!A:E"
DISCORD_TARGET = "channel:1525223443421855855"
MAX_SEEN = 500
ERROR_ALERT_COOLDOWN_SECONDS = 3600


def load_state():
    try:
        return json.loads(STATE_PATH.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {"seen": [], "last_error_alert_at": 0}


def save_state(state):
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = STATE_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2) + "\n")
    temporary.replace(STATE_PATH)


def row_digest(row):
    payload = json.dumps(row, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def run_command(command):
    environment = os.environ.copy()
    environment["HOME"] = "/Users/darwin"
    result = subprocess.run(command, capture_output=True, text=True, env=environment, timeout=45)
    if result.returncode:
        detail = (result.stderr or result.stdout or "command failed").strip()
        raise RuntimeError(detail[-1200:])
    return result.stdout


def fetch_rows():
    output = run_command([
        GOG_SAFE, "sheets", "get", SHEET_ID, SHEET_RANGE,
        "--account", "jerame20@gmail.com", "--json", "--no-input",
    ])
    values = json.loads(output).get("values", [])
    return values[1:] if len(values) > 1 else []


def send_discord(message):
    run_command([
        OPENCLAW, "message", "send", "--channel", "discord",
        "--target", DISCORD_TARGET, "--message", message,
    ])


def clean(value, limit=1200):
    text = str(value or "").strip()
    text = text.replace("@", "@\u200b")
    return text[:limit]


def format_note(row):
    padded = list(row) + [""] * (5 - len(row))
    timestamp, coach, subject, note_type, note = padded[:5]
    subject_line = f"\n**Player/topic:** {clean(subject, 180)}" if clean(subject) else ""
    return (
        "⚽ **New Comets coach note**\n"
        f"**From:** {clean(coach, 120)}\n"
        f"**Type:** {clean(note_type, 120)}{subject_line}\n"
        f"**Submitted:** {clean(timestamp, 120)}\n\n"
        f"{clean(note)}"
    )


def alert_failure(state, error):
    now = int(time.time())
    if now - int(state.get("last_error_alert_at", 0)) < ERROR_ALERT_COOLDOWN_SECONDS:
        return
    try:
        send_discord(f"⚠️ Comets note intake monitor failed: {clean(error, 600)}")
        state["last_error_alert_at"] = now
        save_state(state)
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bootstrap", action="store_true", help="Mark current rows seen without notifying")
    arguments = parser.parse_args()
    state = load_state()
    try:
        rows = fetch_rows()
        seen = set(state.get("seen", []))
        if arguments.bootstrap:
            seen.update(row_digest(row) for row in rows)
        else:
            for row in rows:
                digest = row_digest(row)
                if digest in seen:
                    continue
                send_discord(format_note(row))
                seen.add(digest)
        state["seen"] = list(seen)[-MAX_SEEN:]
        state["last_success_at"] = int(time.time())
        state["last_error"] = ""
        save_state(state)
        return 0
    except Exception as error:
        state["last_error"] = str(error)[-1200:]
        state["last_error_at"] = int(time.time())
        save_state(state)
        alert_failure(state, error)
        print(f"note intake failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
