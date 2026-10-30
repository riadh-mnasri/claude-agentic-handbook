---
name: release-notes
description: Drafts release notes from the git history since the last tag, grouped by Angular commit type. Use when the user asks for release notes, a changelog entry or a summary of what shipped.
---

# Release notes

1. Find the last tag: `git describe --tags --abbrev=0` (if none, use the first commit).
2. Collect commits: run `python3 .claude/skills/release-notes/collect.py <tag>`.
   It prints the commits grouped by type as JSON.
3. Write the notes in Markdown:
   - `## Features` for `feat`, `## Fixes` for `fix`, `## Docs` for `docs`, skip `chore` and `ci`.
   - One bullet per change, in plain language for users, not commit wording.
   - Mention breaking changes first, in a `## Breaking changes` section.
4. Show the draft. Do not create the tag or the release yourself.
