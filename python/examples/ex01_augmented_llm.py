# © 2026 Riadh MNASRI. MIT License.
"""01. The augmented LLM: one call, a clear instruction, a guaranteed JSON shape.

Before building an agent, check that a single well-specified call is not
enough. Here Claude triages a support ticket and the JSON schema output format
guarantees we can parse the answer, no regex, no retry on malformed JSON.

Run: uv run python examples/ex01_augmented_llm.py "My parcel ORD-1002 is late"
"""

import sys

from handbook.config import FAST_MODEL, make_client
from handbook.messages import json_of, json_output

CATEGORIES = ["billing", "shipping", "refund", "product", "account", "other"]

TRIAGE_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": CATEGORIES},
        "urgency": {"type": "string", "enum": ["low", "medium", "high"]},
        "order_id": {"type": ["string", "null"], "description": "ORD-xxxx if mentioned"},
        "summary": {"type": "string", "description": "One sentence, in English"},
    },
    "required": ["category", "urgency", "order_id", "summary"],
    "additionalProperties": False,
}

SYSTEM = """You triage customer support tickets for Paperleaf Books, an online bookshop.
Urgency is high when money was taken wrongly, a parcel is lost or a deadline is today;
medium when the customer is blocked or waiting; low for questions and feedback."""


def triage(client, ticket: str) -> dict:
    response = client.messages.create(
        model=FAST_MODEL,  # narrow, high-volume task: the small model is enough
        max_tokens=1024,
        system=SYSTEM,
        messages=[{"role": "user", "content": f"<ticket>\n{ticket}\n</ticket>"}],
        output_config=json_output(TRIAGE_SCHEMA),
    )
    return json_of(response)


if __name__ == "__main__":
    ticket = " ".join(sys.argv[1:]) or "I was charged twice for ORD-1001, please fix it."
    print(triage(make_client(), ticket))
