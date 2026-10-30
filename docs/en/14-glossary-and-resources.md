# 14. Glossary and resources

## Glossary

| Term | Meaning |
|---|---|
| **Agent** | A system where the model decides its next steps and tool calls in a loop, until the goal is reached |
| **Agentic loop** | Call the model, run requested tools, send results back, repeat |
| **Workflow** | Model calls orchestrated by your code along predefined paths |
| **Augmented LLM** | A model call enriched with retrieval, tools and memory |
| **Tool / function calling** | The model asks your code to run a function with JSON arguments |
| **Server tool** | A tool executed by Anthropic (web search, code execution) |
| **Structured outputs** | Responses constrained to a JSON schema (`output_config.format`) |
| **Stop reason** | Why the model stopped: `end_turn`, `tool_use`, `max_tokens`, `refusal`... |
| **Effort** | How much the model thinks and works per response (`low` to `max`) |
| **Adaptive thinking** | The model decides when and how much to reason |
| **Prompt caching** | Reusing a processed prompt prefix at a fraction of the price |
| **Compaction** | Replacing old context with a summary to stay within budget |
| **Context editing** | Clearing old tool results or thinking from the context |
| **Memory** | Information persisted across sessions, read and written through tools |
| **Subagent** | An agent with its own context, called by a parent agent |
| **Orchestrator** | The component that plans and delegates sub-tasks |
| **Evaluator / judge** | A model that grades outputs against a rubric |
| **Router** | A classifier that sends inputs to specialised handlers |
| **MCP** | Model Context Protocol, a standard for exposing tools, resources and prompts to agents |
| **Skill** | A folder of instructions and scripts an agent loads when relevant |
| **Hook** | Code run automatically on agent events (before a tool call, at the end of a turn...) |
| **Prompt injection** | Instructions hidden in data the agent reads, trying to hijack it |
| **Human in the loop** | A person approves or corrects some actions |
| **Headless** | Running an agent without an interactive UI (`claude -p`) |
| **Tool Runner** | SDK helper that runs the agent loop over your typed tools |
| **Agent SDK** | The Claude Code harness as a Python or TypeScript library |
| **Managed Agents** | Anthropic-hosted agents with a sandbox per session |
| **Eval** | A repeatable test of model or agent behaviour with a grader |

## Official resources

- Anthropic engineering, "Building effective agents": https://www.anthropic.com/engineering/building-effective-agents
- Anthropic engineering, "Effective context engineering for AI agents": https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic engineering, "Writing effective tools for agents": https://www.anthropic.com/engineering/writing-tools-for-agents
- Anthropic engineering, "How we built our multi-agent research system": https://www.anthropic.com/engineering/multi-agent-research-system
- Claude API documentation: https://platform.claude.com/docs
- Tool use: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Prompt caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Claude Code documentation: https://code.claude.com/docs
- Claude Agent SDK: https://code.claude.com/docs/en/agent-sdk
- Model Context Protocol: https://modelcontextprotocol.io
- Anthropic cookbooks: https://github.com/anthropics/claude-cookbooks
- SDKs: https://github.com/anthropics (anthropic-sdk-python, anthropic-sdk-typescript, anthropic-sdk-java...)

Back to the [learning path](00-learning-path.md).
