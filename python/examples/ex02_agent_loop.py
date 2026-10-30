# © 2026 Riadh MNASRI. MIT License.
"""02. The agent loop, written by hand.

An agent is a loop: call the model with tools, run the tools it asks for, send
the results back, stop when it answers without asking for a tool. Everything
else (frameworks, SDKs) is built on these twenty lines.

Run: uv run python examples/ex02_agent_loop.py "What is the status of ORD-1003?"
"""

import json
import sys

from handbook.bookshop import GET_ORDER, SEARCH_CATALOG, Bookshop
from handbook.config import MODEL, make_client

SYSTEM = """You are the customer support assistant of Paperleaf Books.
Use the tools to check facts before answering. Never invent an order status,
a price or a stock level. Answer in the customer's language, briefly."""


def run_tool(shop: Bookshop, name: str, args: dict) -> str:
    if name == "get_order":
        order = shop.get_order(args["order_id"])
        return json.dumps(order) if order else f"No order {args['order_id']}"
    if name == "search_catalog":
        return json.dumps(shop.search_catalog(args["query"], args.get("max_results", 5)))
    raise ValueError(f"Unknown tool {name}")


def answer(client, question: str, shop: Bookshop | None = None, max_turns: int = 8) -> str:
    shop = shop or Bookshop()
    messages = [{"role": "user", "content": question}]
    for _ in range(max_turns):  # always bound the loop
        response = client.messages.create(
            model=MODEL,
            max_tokens=16000,
            system=SYSTEM,
            tools=[GET_ORDER, SEARCH_CATALOG],
            messages=messages,
        )
        # Keep the whole assistant content: the tool_use ids must come back.
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return "".join(b.text for b in response.content if b.type == "text")

        # Claude may ask for several tools at once: answer all of them in ONE message.
        results = []
        for block in response.content:
            if block.type == "tool_use":
                try:
                    output, is_error = run_tool(shop, block.name, block.input), False
                except (ValueError, KeyError) as exc:
                    output, is_error = str(exc), True  # errors go back to the model
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": output, "is_error": is_error})
        messages.append({"role": "user", "content": results})
    raise RuntimeError(f"No answer after {max_turns} turns")


if __name__ == "__main__":
    question = " ".join(sys.argv[1:]) or "Where is ORD-1003, and do you have books on AI evals?"
    print(answer(make_client(), question))
