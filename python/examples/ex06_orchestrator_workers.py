# © 2026 Riadh MNASRI. MIT License.
"""06. Orchestrator-workers: a lead model plans, workers execute, the lead synthesises.

Unlike parallelization, the sub-tasks are not known in advance: the
orchestrator decides them from the input. Workers get a small, focused context
(their sub-task plus the data they need), which keeps them cheap and accurate.

Run: uv run python examples/ex06_orchestrator_workers.py
"""

import json
from concurrent.futures import ThreadPoolExecutor

from handbook.bookshop import Bookshop
from handbook.config import FAST_MODEL, MODEL, make_client
from handbook.messages import json_of, json_output, text_of

PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "subtasks": {
            "type": "array",
            "minItems": 1,
            "maxItems": 4,
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "search_query": {"type": "string", "description": "Catalog keywords"},
                    "instructions": {"type": "string"},
                },
                "required": ["title", "search_query", "instructions"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["subtasks"],
    "additionalProperties": False,
}


def reading_plan(client, request: str, shop: Bookshop | None = None) -> str:
    shop = shop or Bookshop()

    # 1. Orchestrator: break the request down. Main model, structured plan.
    plan = json_of(client.messages.create(
        model=MODEL, max_tokens=4000, output_config=json_output(PLAN_SCHEMA),
        system="You plan reading programmes for Paperleaf Books customers. Split the request "
               "into at most 4 independent sections, each answerable from a catalog search.",
        messages=[{"role": "user", "content": request}],
    ))

    # 2. Workers: one per sub-task, in parallel, each with only its own data.
    def work(subtask: dict) -> str:
        books = shop.search_catalog(subtask["search_query"])
        return text_of(client.messages.create(
            model=FAST_MODEL, max_tokens=2000,
            messages=[{"role": "user", "content":
                       f"Section: {subtask['title']}\nInstructions: {subtask['instructions']}\n"
                       f"Books available (only recommend these): {json.dumps(books)}\n"
                       "Write the section in under 100 words."}],
        ))

    with ThreadPoolExecutor(max_workers=4) as pool:
        sections = list(pool.map(work, plan["subtasks"]))

    # 3. Synthesis: the orchestrator assembles the final answer.
    joined = "\n\n".join(f"## {s['title']}\n{body}" for s, body in zip(plan["subtasks"], sections))
    return text_of(client.messages.create(
        model=MODEL, max_tokens=4000,
        messages=[{"role": "user", "content":
                   f"Request: {request}\n\nDraft sections:\n{joined}\n\n"
                   "Merge into one coherent reading plan. Remove duplicates, keep the books "
                   "exactly as named, add a two-line introduction."}],
    ))


if __name__ == "__main__":
    print(reading_plan(make_client(), "Our dev team wants to start building AI agents properly: "
                                      "where should we start, and how do we test them?"))
