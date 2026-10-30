# © 2026 Riadh MNASRI. MIT License.
"""12. Claude Agent SDK: the Claude Code harness as a library.

You get the built-in tools (Read, Grep, Glob, Bash, Edit...), context
management, subagents, hooks and MCP, without writing the loop. Here, a
read-only code auditor:
- built-in tools restricted to read-only ones;
- a PreToolUse hook that blocks any command touching secrets;
- a specialised subagent for test quality;
- the MCP server of example 11 attached over stdio;
- hard limits on turns and budget.

Needs the Claude Code CLI installed (npm i -g @anthropic-ai/claude-code).
Run: uv run python examples/ex12_agent_sdk.py ../
"""

import asyncio
import sys
from pathlib import Path

from claude_agent_sdk import (AgentDefinition, ClaudeAgentOptions, HookMatcher, ResultMessage,
                              query)

SECRET_MARKERS = (".env", "id_rsa", "credentials", "secrets")


async def block_secrets(input_data, tool_use_id, context):
    """PreToolUse hook: deny reads of files that look like secrets."""
    tool_input = input_data.get("tool_input", {})
    target = " ".join(str(v) for v in tool_input.values())
    if any(marker in target for marker in SECRET_MARKERS):
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": "Reading secret files is not allowed for this agent.",
        }}
    return {}


def build_options(repo: Path) -> ClaudeAgentOptions:
    examples = Path(__file__).parent
    return ClaudeAgentOptions(
        cwd=str(repo),
        system_prompt="You audit codebases. You never modify files. Cite file paths for each finding.",
        allowed_tools=["Read", "Grep", "Glob", "Agent", "mcp__paperleaf__search_catalog"],
        disallowed_tools=["Write", "Edit", "Bash"],
        max_turns=30,
        max_budget_usd=1.0,
        hooks={"PreToolUse": [HookMatcher(matcher="Read|Grep|Glob", hooks=[block_secrets])]},
        agents={
            "test-reviewer": AgentDefinition(
                description="Reviews test quality: coverage of edge cases, assertions, flakiness. "
                            "Use it for anything about tests.",
                prompt="You review automated tests. Report missing edge cases and weak assertions.",
                tools=["Read", "Grep", "Glob"],
                model="haiku",
            )
        },
        mcp_servers={"paperleaf": {
            "command": "uv",
            "args": ["run", "--directory", str(examples.parent), "python",
                     str(examples / "ex11_mcp_server.py")],
        }},
    )


async def audit(repo: Path) -> None:
    prompt = ("Give a short architecture overview of this repository, then delegate a review "
              "of the Python tests to the test-reviewer subagent. Finish with 3 improvements. "
              "Bonus: suggest one book from the paperleaf catalog relevant to the findings.")
    async for message in query(prompt=prompt, options=build_options(repo)):
        if isinstance(message, ResultMessage):
            print(message.result)
            print(f"\n[{message.num_turns} turns, {message.total_cost_usd or 0:.4f} USD]")


if __name__ == "__main__":
    asyncio.run(audit(Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()))
