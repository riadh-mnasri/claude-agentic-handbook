# © 2026 Riadh MNASRI. MIT License.
"""03. Prompt chaining: split a task into fixed steps, with a gate in between.

Each call does one thing well. Between steps, plain code checks the
intermediate result (the "gate") and stops the chain early when it is wrong,
instead of letting an error flow into the final answer.

Steps: extract facts -> gate (code) -> draft reply -> gate (code) -> polish.

Run: uv run python examples/ex03_prompt_chaining.py
"""

import json

from handbook.bookshop import Bookshop
from handbook.config import FAST_MODEL, MODEL, make_client
from handbook.messages import json_of, json_output, text_of

FACTS_SCHEMA = {
    "type": "object",
    "properties": {
        "order_id": {"type": ["string", "null"]},
        "customer_request": {"type": "string"},
        "tone": {"type": "string", "enum": ["calm", "annoyed", "angry"]},
    },
    "required": ["order_id", "customer_request", "tone"],
    "additionalProperties": False,
}


class GateFailed(RuntimeError):
    pass


def reply_to(client, ticket: str, shop: Bookshop | None = None) -> str:
    shop = shop or Bookshop()

    # Step 1: extraction, small model, strict schema.
    facts = json_of(client.messages.create(
        model=FAST_MODEL, max_tokens=1024,
        messages=[{"role": "user", "content": f"Extract the facts of this ticket:\n<ticket>{ticket}</ticket>"}],
        output_config=json_output(FACTS_SCHEMA),
    ))

    # Gate 1: deterministic check, no model involved.
    order = shop.get_order(facts["order_id"]) if facts["order_id"] else None
    if facts["order_id"] and order is None:
        raise GateFailed(f"Ticket mentions unknown order {facts['order_id']}")

    # Step 2: draft, with the verified data injected.
    draft = text_of(client.messages.create(
        model=MODEL, max_tokens=4000,
        system="You write replies for Paperleaf Books support. Use only the facts given.",
        messages=[{"role": "user", "content":
                   f"Customer request: {facts['customer_request']}\n"
                   f"Customer tone: {facts['tone']}\n"
                   f"Order data: {json.dumps(order)}\n"
                   "Write a reply of at most 120 words. Mention the order id if there is one."}],
    ))

    # Gate 2: the draft must reference the order and stay short.
    if order and order["id"] not in draft:
        raise GateFailed("Draft does not mention the order id")
    if len(draft.split()) > 160:
        raise GateFailed("Draft too long")

    # Step 3: polish, a narrow rewrite task for the small model.
    return text_of(client.messages.create(
        model=FAST_MODEL, max_tokens=2000,
        messages=[{"role": "user", "content":
                   "Fix grammar and make this reply warmer without adding facts. "
                   f"Return only the reply.\n<reply>{draft}</reply>"}],
    ))


if __name__ == "__main__":
    print(reply_to(make_client(), "Where is my order ORD-1002?? It's been days, this is ridiculous."))
