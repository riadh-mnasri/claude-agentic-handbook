#!/usr/bin/env python3
# © 2026 Riadh MNASRI. MIT License.
"""Group commits since a ref by Angular type. Used by the release-notes skill."""

import json
import re
import subprocess
import sys

since = sys.argv[1] if len(sys.argv) > 1 else ""
log_range = f"{since}..HEAD" if since else "HEAD"
lines = subprocess.run(["git", "log", "--format=%s", log_range], capture_output=True, text=True, check=True).stdout
groups: dict[str, list[str]] = {}
for subject in filter(None, lines.splitlines()):
    match = re.match(r"(\w+)(\([^)]*\))?(!)?: (.+)", subject)
    kind = ("breaking" if match.group(3) else match.group(1)) if match else "other"
    groups.setdefault(kind, []).append(match.group(4) if match else subject)
print(json.dumps(groups, indent=2))
