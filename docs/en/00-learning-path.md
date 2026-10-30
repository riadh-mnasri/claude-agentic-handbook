# 00. Learning path

This handbook takes you from "I have called the API once" to "I can design,
build, secure, evaluate and run Claude agents in production". Every concept
comes with runnable code in Python, TypeScript and Kotlin, tested offline.

## How to read it

| Step | Read | Run | You can now... |
|---|---|---|---|
| 1. Foundations | [01](01-foundations.md) | `ex01` | tell a workflow from an agent, and know when you need neither |
| 2. The landscape | [02](02-agent-types.md), [03](03-build-and-run.md) | | name every kind of agent and every way to build, launch and use one |
| 3. The loop | [04](04-agent-loop-and-tools.md) | `ex02`, `ex13` | write an agent loop by hand, use the Tool Runner, design good tools |
| 4. Workflows | [05](05-workflow-patterns.md) | `ex03` to `ex07` | pick and implement the five workflow patterns |
| 5. Context | [06](06-context-engineering.md) | `ex09` | keep long sessions cheap and focused, give agents memory |
| 6. Many agents | [07](07-multi-agent.md) | `ex06`, `ex12` | decide when several agents beat one, and wire them |
| 7. Integration | [08](08-mcp.md), [09](09-claude-code.md), [10](10-agent-sdk-and-managed-agents.md) | `ex11` to `ex14`, `claude-code/` | plug tools with MCP, configure Claude Code, use the Agent SDK |
| 8. Safety | [11](11-guardrails-and-security.md) | `ex08` | defend against prompt injection and limit the blast radius |
| 9. Quality | [12](12-evals-and-observability.md) | `ex10` | measure an agent before and after each change |
| 10. Production | [13](13-production.md) | | ship: cost, latency, errors, refusals, versioning |
| Reference | [14](14-glossary-and-resources.md) | | glossary and official sources |

## Three habits to keep from day one

1. **Start with the simplest thing that works.** One call with a good prompt
   beats a fragile agent. Add steps, tools and autonomy only when a measured
   problem calls for it.
2. **Put rules in code, not only in prompts.** A prompt is a suggestion to a
   model that can be fooled. A check in code is a guarantee.
3. **Measure.** Without an eval set, every prompt change is a guess.

## The running example

Every example uses **Paperleaf Books**, a fictional online bookshop
(`shared/bookshop.json`): orders, a catalog, a refund policy, and one order
whose gift message contains a prompt injection. Same data, same scenarios in
the three languages, so you can compare them line by line.
