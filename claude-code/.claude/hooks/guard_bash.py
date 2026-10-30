#!/usr/bin/env python3
# © 2026 Riadh MNASRI. MIT License.
"""PreToolUse hook for Claude Code: block dangerous shell commands.

Claude Code sends the pending tool call as JSON on stdin. Exit code 2 blocks the
call and the message on stderr is shown to Claude, which can then adapt.
Exit code 0 lets the call through. Permissions in settings.json already deny
some patterns; a hook catches what simple patterns cannot (pipes, chains).
"""

import json
import re
import sys

RULES = [
    (re.compile(r"\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r"), "recursive force delete"),
    (re.compile(r"git\s+push\s+.*(--force|-f)\b"), "force push"),
    (re.compile(r"(curl|wget)[^|]*\|\s*(ba|z)?sh"), "piping a download into a shell"),
    (re.compile(r"\.env\b|id_rsa|ANTHROPIC_API_KEY"), "access to secrets"),
    (re.compile(r"\bDROP\s+(TABLE|DATABASE)\b", re.IGNORECASE), "destructive SQL"),
]


def verdict(command: str) -> str | None:
    for pattern, reason in RULES:
        if pattern.search(command):
            return reason
    return None


def main() -> int:
    event = json.load(sys.stdin)
    command = event.get("tool_input", {}).get("command", "")
    reason = verdict(command)
    if reason:
        print(f"Blocked by project policy ({reason}): {command}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
