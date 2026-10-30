# Paperleaf Books: project memory for Claude Code

This file is loaded at the start of every Claude Code session in this folder.
Keep it short: what a new senior teammate needs on day one, nothing more.

## Stack
- Python 3.12 (uv), TypeScript (Node 24, vitest), Kotlin (Gradle, JUnit 5).
- Shared test data in `../shared/`. Never edit it to make a test pass.

## Commands
- Python tests: `cd ../python && uv run pytest -q`
- TypeScript tests: `cd ../typescript && npm test && npm run typecheck`
- Kotlin tests: `cd ../kotlin && ./gradlew test`

## Rules
- Business rules (refund limits, windows) live in code, never only in a prompt.
- Every new example ships with an offline test using the fake client.
- Commit messages: Angular format, `type(scope): subject`.
- Never read or print `.env` files or API keys.

## Where things are
- Examples: `../python/examples`, `../typescript/src/examples`, `../kotlin/src/main/kotlin/handbook/examples`
- Hardened agent loop: `loop.py`, `loop.ts`, `Agent.kt`
