#!/usr/bin/env bash
# © 2026 Riadh MNASRI. MIT License.
# Headless Claude Code: review the current diff and fail the build on blockers.
# Usage: ./review-diff.sh [base-branch]
set -euo pipefail

base="${1:-main}"
diff="$(git diff "$base"...HEAD)"
if [[ -z "$diff" ]]; then
  echo "Nothing to review."
  exit 0
fi

# -p: one prompt, no interactive session. JSON output for scripting.
# Read-only tools and a budget: a CI job must never run away.
result="$(printf '%s' "$diff" | claude -p \
  "Review this diff. Reply with JSON only: {\"blockers\": [..], \"majors\": [..], \"summary\": \"..\"}" \
  --output-format json \
  --allowedTools "Read,Grep,Glob" \
  --max-budget-usd 0.50)"

echo "$result" | python3 -c '
import json, sys
envelope = json.load(sys.stdin)
print(f"cost: {envelope.get(\"total_cost_usd\", 0):.4f} USD")
review = json.loads(envelope["result"].strip().removeprefix("```json").removesuffix("```"))
print(review["summary"])
for item in review["blockers"]:
    print(f"BLOCKER: {item}")
sys.exit(1 if review["blockers"] else 0)
'
