# © 2026 Riadh MNASRI. MIT License.
"""A scripted stand-in for anthropic.Anthropic, so every example runs offline.

It returns real SDK `Message` objects, so the code under test is exactly the
code that runs against the API. Each test decides what "Claude" answers.
"""

import itertools
import json
import threading
from typing import Any, Callable

from anthropic.types import Message

_ids = itertools.count(1)


def message(content: list[dict], stop_reason: str = "end_turn", cache_read: int = 0) -> Message:
    return Message.model_validate({
        "id": f"msg_{next(_ids)}", "type": "message", "role": "assistant",
        "model": "fake", "content": content, "stop_reason": stop_reason,
        "stop_sequence": None,
        "usage": {"input_tokens": 100, "output_tokens": 20,
                  "cache_read_input_tokens": cache_read, "cache_creation_input_tokens": 0},
    })


def text(value: str, **kwargs) -> Message:
    return message([{"type": "text", "text": value}], **kwargs)


def as_json(value: Any) -> Message:
    return text(json.dumps(value))


def tools(*calls: tuple[str, dict]) -> Message:
    return message([{"type": "tool_use", "id": f"toolu_{next(_ids)}", "name": name, "input": args}
                    for name, args in calls], stop_reason="tool_use")


def refusal() -> Message:
    return message([], stop_reason="refusal")


class FakeClient:
    """Answers with a fixed script (list) or a function of the request (parallel code)."""

    def __init__(self, script: list[Message] | Callable[[dict], Message]):
        self._script = list(script) if isinstance(script, list) else None
        self._responder = script if callable(script) else None
        self._lock = threading.Lock()
        self.calls: list[dict] = []
        self.messages = self  # so that client.messages.create(...) works

    def create(self, **params) -> Message:
        with self._lock:
            # Snapshot the messages: the caller keeps mutating its list.
            self.calls.append({**params, "messages": list(params.get("messages", []))})
            if self._responder:
                return self._responder(params)
            if not self._script:
                raise AssertionError(f"Unexpected extra call: {params.get('messages')}")
            return self._script.pop(0)


def prompt_of(params: dict) -> str:
    """The text of the last user message of a request, for routing fake answers."""
    content = params["messages"][-1]["content"]
    return content if isinstance(content, str) else json.dumps(content, default=str)
