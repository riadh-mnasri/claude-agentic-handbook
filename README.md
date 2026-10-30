# Claude Agentic Handbook

A reference for building **Claude agents and agentic workflows**: a guide that
goes from foundations to production, with runnable examples in **Python,
TypeScript and Kotlin**. Every example is tested offline with a scripted fake
client, so the whole repo runs without an API key.

French version: [README.fr.md](README.fr.md) (in progress).

## Contents

| Folder | What is inside |
|---|---|
| [`docs/en`](docs/en/00-learning-path.md) | 15-chapter guide: agent types, every way to build, launch and use an agent, loop and tools, workflow patterns, context, multi-agent, MCP, Claude Code, Agent SDK, Managed Agents, security, evals, production |
| [`python/`](python) | Examples 01 to 14 (API, Tool Runner, MCP server, Agent SDK, Managed Agents) |
| [`typescript/`](typescript) | Examples 01 to 12 |
| [`kotlin/`](kotlin) | Examples 01 to 10, hexagonal port and adapter over the Java SDK |
| [`claude-code/`](claude-code) | CLAUDE.md, subagents, a skill, hooks, headless script, GitHub Action |
| [`shared/`](shared) | Paperleaf Books dataset and the eval set used by all languages |

## Quick start

```bash
# Python (uv)
cd python && uv sync && uv run pytest -q
uv run python examples/ex02_agent_loop.py "Where is ORD-1003?"   # needs ANTHROPIC_API_KEY

# TypeScript (Node 24)
cd typescript && npm install && npm test && npm run typecheck
npx tsx src/examples/02-agent-loop.ts "Where is ORD-1003?"

# Kotlin (JDK 17+)
cd kotlin && ./gradlew test
./gradlew run -Pexample=Ex02AgentLoop --args="Where is ORD-1003?"
```

Environment variables: `ANTHROPIC_API_KEY` (real runs only), optional
`HANDBOOK_MODEL` (default `claude-opus-5-5`) and `HANDBOOK_FAST_MODEL`
(default `claude-haiku-5-5`).

## Status

- Done: Python, TypeScript and Kotlin examples with offline tests; English guide; Claude Code setup.
- In progress: French guide (chapters 00 to 02 done), CI workflow, per-language READMEs.

## License

MIT. © 2026 Riadh MNASRI.
