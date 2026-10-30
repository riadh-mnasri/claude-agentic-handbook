#!/usr/bin/env python3
# © 2026 Riadh MNASRI. MIT License.
"""PostToolUse hook: keep an audit trail of every file Claude edits."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

event = json.load(sys.stdin)
path = event.get("tool_input", {}).get("file_path", "?")
log = Path(event.get("cwd", ".")) / ".claude" / "edits.log"
with log.open("a") as out:
    out.write(f"{datetime.now(timezone.utc).isoformat()} {event.get('tool_name')} {path}\n")
