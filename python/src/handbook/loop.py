# © 2026 Riadh MNASRI. MIT License.
"""A reusable, hardened agent loop.

Example 02 shows the bare loop. This version adds what you need before real
users touch it: a permission policy per tool, human approval for risky tools,
untrusted-data wrapping, a turn limit, repeated-call detection, refusal
handling and a token tally.
"""

import json
from dataclasses import dataclass, field
from typing import Any, Callable

from .config import MODEL
from .messages import RefusalError, check_stop

Approver = Callable[[str, dict[str, Any]], bool]


@dataclass
class Tool:
    definition: dict[str, Any]
    handler: Callable[[dict[str, Any]], Any]
    # "allow": runs directly. "ask": a human approves each call. "deny": never runs.
    permission: str = "allow"
    # Results that may contain text written by third parties (customers, web pages...).
    untrusted_output: bool = False

    @property
    def name(self) -> str:
        return self.definition["name"]


@dataclass
class AgentResult:
    text: str
    turns: int
    messages: list[dict[str, Any]]
    tool_calls: list[tuple[str, dict[str, Any]]] = field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0


class AgentStuck(RuntimeError):
    pass


def deny_all(_name: str, _args: dict[str, Any]) -> bool:
    return False


def run_agent(
    client,
    *,
    system: str,
    prompt: str,
    tools: list[Tool],
    model: str = MODEL,
    max_turns: int = 10,
    max_identical_calls: int = 2,
    approve: Approver = deny_all,
    on_event: Callable[[str], None] = lambda _e: None,
) -> AgentResult:
    by_name = {tool.name: tool for tool in tools}
    messages: list[dict[str, Any]] = [{"role": "user", "content": prompt}]
    result = AgentResult(text="", turns=0, messages=messages)
    seen: dict[str, int] = {}

    for turn in range(1, max_turns + 1):
        response = client.messages.create(
            model=model,
            max_tokens=16000,
            # Cache the stable prefix (tools + system) across turns.
            cache_control={"type": "ephemeral"},
            system=system,
            tools=[tool.definition for tool in tools],
            messages=messages,
        )
        result.turns = turn
        result.input_tokens += response.usage.input_tokens
        result.output_tokens += response.usage.output_tokens
        if response.stop_reason == "refusal":
            raise RefusalError(str(response.stop_details))
        # Append the full content (not just text): tool_use ids must round-trip.
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            check_stop(response)
            result.text = "".join(b.text for b in response.content if b.type == "text")
            return result

        # All results of one turn go back in a single user message.
        results = []
        for call in (b for b in response.content if b.type == "tool_use"):
            result.tool_calls.append((call.name, call.input))
            on_event(f"tool {call.name} {json.dumps(call.input)}")
            key = call.name + json.dumps(call.input, sort_keys=True)
            seen[key] = seen.get(key, 0) + 1
            results.append(_execute(by_name, call, seen[key] > max_identical_calls, approve, on_event))
        messages.append({"role": "user", "content": results})

    raise AgentStuck(f"No final answer after {max_turns} turns")


def _execute(by_name, call, repeated: bool, approve: Approver, on_event) -> dict[str, Any]:
    def error(text: str) -> dict[str, Any]:
        on_event(f"  -> error: {text}")
        return {"type": "tool_result", "tool_use_id": call.id, "content": text, "is_error": True}

    tool = by_name.get(call.name)
    if tool is None:
        return error(f"Unknown tool {call.name}")
    if repeated:
        return error("Same call already made twice. Use the previous result or change approach.")
    if tool.permission == "deny":
        return error(f"Tool {call.name} is disabled by policy")
    if tool.permission == "ask" and not approve(call.name, call.input):
        return error("A human reviewer rejected this action. Explain it to the customer.")
    try:
        output = tool.handler(call.input)
    except (ValueError, KeyError) as exc:
        # Errors are information for the model: send them back, do not crash.
        return error(str(exc))
    content = output if isinstance(output, str) else json.dumps(output)
    if tool.untrusted_output:
        content = f"<untrusted_data>\n{content}\n</untrusted_data>"
    return {"type": "tool_result", "tool_use_id": call.id, "content": content}
