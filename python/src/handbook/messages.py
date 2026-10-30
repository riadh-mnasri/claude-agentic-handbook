# © 2026 Riadh MNASRI. MIT License.
"""Small helpers to read Claude responses without repeating the same loops."""

import json
from typing import Any


class RefusalError(RuntimeError):
    """Raised when Claude declines a request (stop_reason == "refusal")."""


def check_stop(message) -> None:
    """Fail loudly on the stop reasons that make the content unusable."""
    if message.stop_reason == "refusal":
        raise RefusalError(f"Claude declined the request: {message.stop_details}")
    if message.stop_reason == "max_tokens":
        raise RuntimeError("Response truncated by max_tokens: raise the limit or stream")


def text_of(message) -> str:
    """Concatenate every text block of a response."""
    check_stop(message)
    return "".join(block.text for block in message.content if block.type == "text")


def json_of(message) -> Any:
    """Parse a response produced with a JSON schema output format."""
    return json.loads(text_of(message))


def json_output(schema: dict) -> dict:
    """Build the `output_config` that constrains the answer to a JSON schema."""
    return {"format": {"type": "json_schema", "schema": schema}}


def tool_uses(message) -> list:
    return [block for block in message.content if block.type == "tool_use"]
