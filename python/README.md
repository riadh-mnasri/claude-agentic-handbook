# Python examples

Examples 01 to 14 of the [Claude Agentic Handbook](../README.md), on the
official `anthropic` SDK, `claude-agent-sdk` and `mcp`.

## Setup

```bash
uv sync                      # installs dependencies into .venv
uv run pytest -q             # offline tests, no API key needed
export ANTHROPIC_API_KEY=... # only for real runs
uv run python examples/ex02_agent_loop.py "Where is ORD-1003?"
```

## Layout

| Path | Content |
|---|---|
| `src/handbook/config.py` | Model ids (`HANDBOOK_MODEL`, `HANDBOOK_FAST_MODEL`) and client factory |
| `src/handbook/bookshop.py` | Paperleaf domain, business rules, tool definitions |
| `src/handbook/loop.py` | Hardened agent loop: permissions, approval, untrusted data, limits |
| `src/handbook/messages.py` | Response helpers, refusal handling, JSON output config |
| `examples/exNN_*.py` | One runnable example per topic |
| `tests/fakes.py` | Scripted fake client returning real SDK `Message` objects |

Example 12 also needs the Claude Code CLI; example 14 uses the Managed Agents
beta (`setup` once, then `run`).

---

# Exemples Python

Les exemples 01 à 14 du [Claude Agentic Handbook](../README.fr.md), sur le SDK
officiel `anthropic`, `claude-agent-sdk` et `mcp`.

```bash
uv sync                      # installe les dépendances dans .venv
uv run pytest -q             # tests hors ligne, sans clé d'API
export ANTHROPIC_API_KEY=... # uniquement pour les exécutions réelles
uv run python examples/ex02_agent_loop.py "Where is ORD-1003?"
```

L'exemple 12 nécessite aussi la CLI Claude Code ; l'exemple 14 utilise la beta
Managed Agents (`setup` une fois, puis `run`).

© 2026 Riadh MNASRI. MIT.
