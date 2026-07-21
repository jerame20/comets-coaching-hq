#!/usr/bin/python3
"""Relay new Comets coach-note Sheet rows into the private Discord coaching channel."""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
from urllib.parse import unquote
from pathlib import Path


PROJECT_DIR = Path("/Users/darwin/.openclaw/workspace/projects/tycho-soccer")
STATE_PATH = PROJECT_DIR / "note-intake-state.json"
BOARD_PATH = PROJECT_DIR / "board.json"
PLAYER_PROFILES_PATH = PROJECT_DIR / "player-profiles.json"
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


def coach_name(value):
    name = clean(value, 80)
    return "Bryan" if name == "Brian" else name


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


def parse_board_row(row):
    padded = list(row) + [""] * (5 - len(row))
    timestamp, coach, subject, note_type, note = padded[:5]
    if str(subject).startswith("BOARD_POST|"):
        parts = str(subject).split("|", 3)
        if len(parts) != 4:
            return None
        return {
            "kind": "post",
            "id": clean(parts[1], 180),
            "author": coach_name(coach),
            "title": clean(unquote(parts[2]), 120),
            "category": clean(unquote(parts[3]), 80),
            "body": clean(note, 3000),
            "created": clean(timestamp, 120),
        }
    if str(subject).startswith("BOARD_COMMENT|"):
        parts = str(subject).split("|", 3)
        if len(parts) != 3:
            return None
        return {
            "kind": "comment",
            "parentId": clean(parts[1], 180),
            "id": clean(parts[2], 180),
            "author": coach_name(coach),
            "body": clean(note, 1500),
            "created": clean(timestamp, 120),
        }
    return None


def parse_player_profile_row(row):
    padded = list(row) + [""] * (5 - len(row))
    timestamp, coach, subject, note_type, note = padded[:5]
    if not str(subject).startswith("PLAYER_PROFILE|"):
        return None
    profile_id = clean(str(subject).split("|", 1)[1], 180)
    if not profile_id.startswith(("seed-", "custom-")):
        return None
    try:
        payload = json.loads(str(note))
    except (TypeError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict) or clean(payload.get("id"), 180) != profile_id:
        return None
    return {
        "id": profile_id,
        "name": clean(payload.get("name"), 80),
        "anchors": clean(payload.get("anchors"), 120),
        "foot": clean(payload.get("foot"), 40),
        "emphasis": clean(payload.get("emphasis"), 300),
        "custom": bool(payload.get("custom")),
        "archived": bool(payload.get("archived")),
        "updatedAt": clean(payload.get("updatedAt"), 80) or clean(timestamp, 80),
    }


def build_board(rows):
    posts = []
    posts_by_id = {}
    comments = []
    latest = ""
    for row in rows:
        item = parse_board_row(row)
        if not item:
            continue
        latest = item.get("created", latest)
        if item["kind"] == "post":
            post = {key: value for key, value in item.items() if key != "kind"}
            post["comments"] = []
            posts.append(post)
            posts_by_id[post["id"]] = post
        else:
            comments.append(item)
    for item in comments:
        parent = posts_by_id.get(item["parentId"])
        if parent:
            parent["comments"].append({key: value for key, value in item.items() if key not in ("kind", "parentId")})
    posts.reverse()
    return {"updatedAt": latest, "posts": posts}


def publish_board(rows):
    payload = json.dumps(build_board(rows), ensure_ascii=False, indent=2) + "\n"
    if BOARD_PATH.exists() and BOARD_PATH.read_text() == payload:
        return
    temporary = BOARD_PATH.with_suffix(".tmp")
    temporary.write_text(payload)
    temporary.replace(BOARD_PATH)
    run_command(["git", "-C", str(PROJECT_DIR), "add", "board.json"])
    staged = subprocess.run(["git", "-C", str(PROJECT_DIR), "diff", "--cached", "--quiet", "--", "board.json"])
    if staged.returncode == 0:
        return
    run_command(["git", "-C", str(PROJECT_DIR), "commit", "-m", "Update coach bulletin board"])
    run_command(["git", "-C", str(PROJECT_DIR), "push", "origin", "main"])


def build_player_profiles(rows):
    profiles = {}
    latest = ""
    for row in rows:
        profile = parse_player_profile_row(row)
        if not profile:
            continue
        profiles[profile["id"]] = profile
        latest = profile["updatedAt"]
    return {"updatedAt": latest, "profiles": profiles}


def publish_player_profiles(rows):
    payload = json.dumps(build_player_profiles(rows), ensure_ascii=False, indent=2) + "\n"
    if PLAYER_PROFILES_PATH.exists() and PLAYER_PROFILES_PATH.read_text() == payload:
        return
    temporary = PLAYER_PROFILES_PATH.with_suffix(".tmp")
    temporary.write_text(payload)
    temporary.replace(PLAYER_PROFILES_PATH)
    run_command(["git", "-C", str(PROJECT_DIR), "add", "player-profiles.json"])
    staged = subprocess.run(["git", "-C", str(PROJECT_DIR), "diff", "--cached", "--quiet", "--", "player-profiles.json"])
    if staged.returncode == 0:
        return
    run_command(["git", "-C", str(PROJECT_DIR), "commit", "-m", "Update shared player profiles"])
    run_command(["git", "-C", str(PROJECT_DIR), "push", "origin", "main"])


def format_app_idea(item):
    return (
        "💡 **New Comets app idea from the coach board**\n"
        f"**From:** {clean(item['author'], 80)}\n"
        f"**Idea:** {clean(item['title'], 120)}\n\n"
        f"{clean(item['body'], 1200)}"
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
        publish_board(rows)
        publish_player_profiles(rows)
        seen = set(state.get("seen", []))
        if arguments.bootstrap:
            seen.update(row_digest(row) for row in rows)
        else:
            for row in rows:
                digest = row_digest(row)
                if digest in seen:
                    continue
                board_item = parse_board_row(row)
                player_item = parse_player_profile_row(row)
                if board_item and board_item["kind"] == "post" and board_item.get("category") == "App idea":
                    send_discord(format_app_idea(board_item))
                elif not board_item and not player_item:
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
