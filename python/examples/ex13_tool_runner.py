# © 2026 Riadh MNASRI. MIT License.
"""13. The Tool Runner: the same agent as example 02, without writing the loop.

The SDK turns typed, documented functions into tool definitions (the docstring
becomes the description, the signature becomes the JSON schema) and runs the
request, execute, send back cycle for you. You still see every turn.

Run: uv run python examples/ex13_tool_runner.py "Where is ORD-1003?"
"""

import json
import sys

from anthropic import beta_tool

from handbook.bookshop import Bookshop
from handbook.config import MODEL, make_client

shop = Bookshop()


@beta_tool
def get_order(order_id: str) -> str:
    """Look up one order: status, items, dates, total. Use it before answering about an order.

    Args:
        order_id: Order id, format ORD-1234.
    """
    order = shop.get_order(order_id)
    return json.dumps(order) if order else f"No order {order_id}"


@beta_tool
def search_catalog(query: str, max_results: int = 5) -> str:
    """Search the book catalog by keywords. Stock 0 means out of stock.

    Args:
        query: Keywords about title, author or topic.
        max_results: How many books to return, 1 to 10.
    """
    return json.dumps(shop.search_catalog(query, max_results))


TOOLS = [get_order, search_catalog]


def answer(client, question: str) -> str:
    runner = client.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=16000,
        system="You are the support assistant of Paperleaf Books. Check facts with the tools.",
        tools=TOOLS,
        messages=[{"role": "user", "content": question}],
        max_iterations=8,  # the runner's turn limit
    )
    final = None
    for message in runner:  # one iteration per model turn: log, inspect, stop early...
        calls = [b.name for b in message.content if b.type == "tool_use"]
        if calls:
            print(f"[turn] tools: {calls}", file=sys.stderr)
        final = message
    return "".join(b.text for b in final.content if b.type == "text")


if __name__ == "__main__":
    print(answer(make_client(), " ".join(sys.argv[1:]) or "Where is ORD-1003?"))
