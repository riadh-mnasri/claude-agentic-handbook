# © 2026 Riadh MNASRI. MIT License.
"""10. Evals: measure before you change a prompt, a model or a tool.

Two kinds of graders:
- code-based: exact match against labelled data (fast, cheap, objective);
- model-based: an LLM judge with an explicit rubric, for open-ended outputs.

The script exits with a non-zero code below the threshold, so it can gate a CI.

Run: uv run python examples/ex10_evals.py
"""

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

from ex01_augmented_llm import triage
from handbook.bookshop import shared_dir
from handbook.config import MODEL, make_client
from handbook.messages import json_of, json_output


@dataclass
class EvalReport:
    total: int
    category_accuracy: float
    urgency_accuracy: float
    failures: list[dict]


def load_tickets() -> list[dict]:
    lines = (shared_dir() / "evals" / "tickets.jsonl").read_text().splitlines()
    return [json.loads(line) for line in lines if line.strip()]


def eval_triage(client, tickets: list[dict]) -> EvalReport:
    with ThreadPoolExecutor(max_workers=6) as pool:
        predictions = list(pool.map(lambda t: triage(client, t["text"]), tickets))
    failures = [
        {"id": t["id"], "expected": (t["category"], t["urgency"]),
         "got": (p["category"], p["urgency"])}
        for t, p in zip(tickets, predictions)
        if (t["category"], t["urgency"]) != (p["category"], p["urgency"])
    ]
    n = len(tickets)
    return EvalReport(
        total=n,
        category_accuracy=sum(t["category"] == p["category"] for t, p in zip(tickets, predictions)) / n,
        urgency_accuracy=sum(t["urgency"] == p["urgency"] for t, p in zip(tickets, predictions)) / n,
        failures=failures,
    )


JUDGE = json_output({
    "type": "object",
    "properties": {
        "reasoning": {"type": "string"},
        "score": {"type": "integer", "minimum": 1, "maximum": 5},
    },
    "required": ["reasoning", "score"],
    "additionalProperties": False,
})


def judge_reply(client, ticket: str, reply: str) -> dict:
    """LLM-as-judge. Reasoning comes before the score, and the rubric is explicit."""
    return json_of(client.messages.create(
        model=MODEL, max_tokens=2000, output_config=JUDGE,
        messages=[{"role": "user", "content":
                   "Score this support reply from 1 to 5.\n"
                   "5: answers the question, correct, polite, no invented facts.\n"
                   "3: partly answers or vague.\n1: wrong, rude or invents facts.\n"
                   f"<ticket>{ticket}</ticket>\n<reply>{reply}</reply>"}],
    ))


if __name__ == "__main__":
    report = eval_triage(make_client(), load_tickets())
    print(f"category accuracy: {report.category_accuracy:.0%}")
    print(f"urgency accuracy:  {report.urgency_accuracy:.0%}")
    for failure in report.failures:
        print(f"  {failure}")
    sys.exit(0 if report.category_accuracy >= 0.8 else 1)
