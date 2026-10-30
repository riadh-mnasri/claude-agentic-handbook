# © 2026 Riadh MNASRI. MIT License.
"""07. Evaluator-optimizer: one model writes, another grades, loop until it passes.

Works when you can state clear evaluation criteria and when feedback actually
improves the next draft. Always cap the number of rounds.

Run: uv run python examples/ex07_evaluator_optimizer.py
"""

from dataclasses import dataclass, field

from handbook.config import FAST_MODEL, MODEL, make_client
from handbook.messages import json_of, json_output, text_of

RUBRIC = """1. Between 40 and 80 words.
2. Mentions the title and the author exactly.
3. Says who the book is for.
4. No superlatives such as "best", "ultimate", "must-read".
5. Ends with a call to action."""

EVALUATION = json_output({
    "type": "object",
    "properties": {
        "passed": {"type": "boolean"},
        "failed_criteria": {"type": "array", "items": {"type": "integer"}},
        "feedback": {"type": "string"},
    },
    "required": ["passed", "failed_criteria", "feedback"],
    "additionalProperties": False,
})


@dataclass
class Outcome:
    text: str
    passed: bool
    rounds: int
    history: list[dict] = field(default_factory=list)


def write_blurb(client, book: dict, max_rounds: int = 3) -> Outcome:
    feedback = ""
    draft = ""
    history = []
    for round_number in range(1, max_rounds + 1):
        draft = text_of(client.messages.create(
            model=MODEL, max_tokens=2000,
            system=f"You write catalog blurbs for Paperleaf Books. Rules:\n{RUBRIC}",
            messages=[{"role": "user", "content":
                       f"Book: {book}\n"
                       + (f"Previous draft:\n{draft}\nReviewer feedback:\n{feedback}\n" if feedback else "")
                       + "Return only the blurb."}],
        ))
        # A different, cheaper model grades against the same explicit rubric.
        verdict = json_of(client.messages.create(
            model=FAST_MODEL, max_tokens=1024, output_config=EVALUATION,
            messages=[{"role": "user", "content":
                       f"Grade this blurb strictly against the rubric.\nRubric:\n{RUBRIC}\n"
                       f"Book: {book}\n<blurb>{draft}</blurb>"}],
        ))
        history.append({"draft": draft, **verdict})
        if verdict["passed"]:
            return Outcome(draft, True, round_number, history)
        feedback = verdict["feedback"]
    return Outcome(draft, False, max_rounds, history)


if __name__ == "__main__":
    book = {"title": "Evals Before Vibes", "author": "Omar Benali", "tags": ["ai", "testing"]}
    outcome = write_blurb(make_client(), book)
    print(f"passed={outcome.passed} after {outcome.rounds} round(s)\n{outcome.text}")
