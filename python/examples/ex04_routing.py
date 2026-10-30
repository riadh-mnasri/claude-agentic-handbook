# © 2026 Riadh MNASRI. MIT License.
"""04. Routing: classify first, then send the input to a specialised handler.

A single prompt that handles every case gets long and mediocre. A router
classifies, and each route gets its own prompt, tools and model: simple FAQ
on the small model, money questions on the main model.

Run: uv run python examples/ex04_routing.py "Can I change my email address?"
"""

import sys
from dataclasses import dataclass

from ex01_augmented_llm import triage
from handbook.config import FAST_MODEL, MODEL, make_client
from handbook.messages import text_of


@dataclass(frozen=True)
class Route:
    model: str
    system: str


ROUTES = {
    "billing": Route(MODEL, "You handle billing issues. Be precise about amounts. Never promise a "
                            "refund: say a specialist will confirm within 24 hours."),
    "refund": Route(MODEL, "You handle refund requests. Explain the 30-day refund policy and the "
                           "next step. Never confirm a refund yourself."),
    "shipping": Route(FAST_MODEL, "You handle delivery questions. Give the standard delays: 2-4 "
                                  "working days in France, 5-8 in the EU."),
    "product": Route(FAST_MODEL, "You recommend books from Paperleaf's catalog. Be enthusiastic, short."),
    "account": Route(FAST_MODEL, "You help with account settings. Account changes are done in "
                                 "Settings > Profile. Password resets expire after 1 hour."),
    "other": Route(FAST_MODEL, "You answer politely and briefly."),
}


def handle(client, ticket: str) -> tuple[str, str]:
    category = triage(client, ticket)["category"]
    route = ROUTES.get(category, ROUTES["other"])
    reply = text_of(client.messages.create(
        model=route.model, max_tokens=2000, system=route.system,
        messages=[{"role": "user", "content": ticket}],
    ))
    return category, reply


if __name__ == "__main__":
    category, reply = handle(make_client(), " ".join(sys.argv[1:]) or "How do I change my email?")
    print(f"[route: {category}]\n{reply}")
