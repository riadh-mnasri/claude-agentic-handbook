# Claude Agentic Handbook

**A reference for building Claude agents and agentic workflows**, from the
first API call to production: a 15-chapter guide plus runnable examples in
**Python, TypeScript and Kotlin**. Every example is tested offline with a
scripted fake client, so the whole repository runs and is verified without an
API key; the same code runs against the real API when you set one.

[Version française](README.fr.md)

## What you will learn

- **Every type of agent**: by autonomy, interaction mode, role, domain, hosting and memory ([chapter 02](docs/en/02-agent-types.md)).
- **Every way to create, launch and use one**: Claude apps, Claude Code config, manual loop, Tool Runner, Agent SDK, Managed Agents, MCP; interactive, headless, background, CI, scheduled, event-driven, batch ([chapter 03](docs/en/03-build-and-run.md)).
- The agent loop and tool design, the five workflow patterns, context engineering, multi-agent systems, MCP, Claude Code, security, evals and production.

Start here: [docs/en/00-learning-path.md](docs/en/00-learning-path.md).

## Guide

| # | Chapter |
|---|---|
| 00 | [Learning path](docs/en/00-learning-path.md) |
| 01 | [Foundations: from one call to an agent](docs/en/01-foundations.md) |
| 02 | [Agent types: a complete map](docs/en/02-agent-types.md) |
| 03 | [Every way to create, launch and use an agent](docs/en/03-build-and-run.md) |
| 04 | [The agent loop and tool design](docs/en/04-agent-loop-and-tools.md) |
| 05 | [The five workflow patterns](docs/en/05-workflow-patterns.md) |
| 06 | [Context engineering: caching, compaction, memory](docs/en/06-context-engineering.md) |
| 07 | [Multi-agent systems](docs/en/07-multi-agent.md) |
| 08 | [MCP](docs/en/08-mcp.md) |
| 09 | [Claude Code as an agent platform](docs/en/09-claude-code.md) |
| 10 | [Agent SDK and Managed Agents](docs/en/10-agent-sdk-and-managed-agents.md) |
| 11 | [Guardrails and security](docs/en/11-guardrails-and-security.md) |
| 12 | [Evals and observability](docs/en/12-evals-and-observability.md) |
| 13 | [Production](docs/en/13-production.md) |
| 14 | [Glossary and resources](docs/en/14-glossary-and-resources.md) |

## Examples

All examples share one fictional business, **Paperleaf Books** (`shared/`):
orders, a catalog, a refund policy, an eval set, and one order whose gift
message hides a prompt injection.

| # | Topic | Python | TypeScript | Kotlin |
|---|---|---|---|---|
| 01 | Augmented LLM, structured output | [py](python/examples/ex01_augmented_llm.py) | [ts](typescript/src/examples/01-augmented-llm.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex01AugmentedLlm.kt) |
| 02 | Agent loop written by hand | [py](python/examples/ex02_agent_loop.py) | [ts](typescript/src/examples/02-agent-loop.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex02AgentLoop.kt) |
| 03 | Prompt chaining with gates | [py](python/examples/ex03_prompt_chaining.py) | [ts](typescript/src/examples/03-prompt-chaining.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex03PromptChaining.kt) |
| 04 | Routing | [py](python/examples/ex04_routing.py) | [ts](typescript/src/examples/04-routing.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex04Routing.kt) |
| 05 | Parallelization: sectioning and voting | [py](python/examples/ex05_parallelization.py) | [ts](typescript/src/examples/05-parallelization.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex05Parallelization.kt) |
| 06 | Orchestrator-workers | [py](python/examples/ex06_orchestrator_workers.py) | [ts](typescript/src/examples/06-orchestrator-workers.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex06OrchestratorWorkers.kt) |
| 07 | Evaluator-optimizer | [py](python/examples/ex07_evaluator_optimizer.py) | [ts](typescript/src/examples/07-evaluator-optimizer.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex07EvaluatorOptimizer.kt) |
| 08 | Guardrails, human in the loop, prompt injection | [py](python/examples/ex08_guardrails_hitl.py) | [ts](typescript/src/examples/08-guardrails-hitl.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex08GuardrailsHitl.kt) |
| 09 | Caching, compaction, long-term memory | [py](python/examples/ex09_context_memory.py) | [ts](typescript/src/examples/09-context-memory.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex09ContextMemory.kt) |
| 10 | Evals: code grader and LLM judge | [py](python/examples/ex10_evals.py) | [ts](typescript/src/examples/10-evals.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex10Evals.kt) |
| 11 | MCP server | [py](python/examples/ex11_mcp_server.py) | [ts](typescript/src/examples/11-mcp-server.ts) | |
| 12 | Claude Agent SDK: hooks, subagent, MCP | [py](python/examples/ex12_agent_sdk.py) | [ts](typescript/src/examples/12-agent-sdk.ts) | |
| 13 | Tool Runner | [py](python/examples/ex13_tool_runner.py) | | |
| 14 | Managed Agents | [py](python/examples/ex14_managed_agents.py) | | |

Plus [`claude-code/`](claude-code): a ready-to-copy Claude Code setup
(`CLAUDE.md`, subagents, a skill, permissions, hooks, headless review script,
GitHub Action). The Agent SDK has no JVM version, which is why examples 11 and
12 are not in Kotlin.

The reusable **hardened agent loop** (permissions, human approval, untrusted
data, limits): [`loop.py`](python/src/handbook/loop.py),
[`loop.ts`](typescript/src/core/loop.ts), [`Agent.kt`](kotlin/src/main/kotlin/handbook/core/Agent.kt).

## Quick start

| | Requirements | Tests | Run an example (needs `ANTHROPIC_API_KEY`) |
|---|---|---|---|
| Python | Python 3.12+, [uv](https://docs.astral.sh/uv/) | `cd python && uv sync && uv run pytest -q` | `uv run python examples/ex02_agent_loop.py "Where is ORD-1003?"` |
| TypeScript | Node 24+ | `cd typescript && npm install && npm test && npm run typecheck` | `npx tsx src/examples/02-agent-loop.ts "Where is ORD-1003?"` |
| Kotlin | JDK 17+ | `cd kotlin && ./gradlew test` | `./gradlew run -Pexample=Ex02AgentLoop --args="Where is ORD-1003?"` |

Examples 12 (Agent SDK) also need the Claude Code CLI installed.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | Real API calls (tests never need it) |
| `HANDBOOK_MODEL` | `claude-opus-5-5` | Main model: planning, agents, judgment |
| `HANDBOOK_FAST_MODEL` | `claude-haiku-5-5` | Small model: routing, workers, judges |

## How the tests work

Each language has a fake client returning real SDK message objects
(`python/tests/fakes.py`, `typescript/tests/fakes.ts`,
`kotlin/src/test/kotlin/handbook/Fakes.kt`). Tests script what "Claude"
answers and assert on behaviour: which calls were made, what data reached the
model, which guardrails fired. Tests are written as Given / When / Then. CI
runs the three suites on every push.

## Status and roadmap

- [x] Guide in English and French (15 chapters)
- [x] Python examples 01 to 14, TypeScript 01 to 12, Kotlin 01 to 10, all tested offline
- [x] Claude Code configuration examples
- [ ] Recorded outputs from real API runs
- [ ] Kotlin MCP server with the official Kotlin MCP SDK
- [ ] TypeScript Tool Runner and Managed Agents examples

## License

[MIT](LICENSE). © 2026 Riadh MNASRI.

This is an independent guide, not affiliated with or endorsed by Anthropic.
"Claude" is a trademark of Anthropic, PBC.
