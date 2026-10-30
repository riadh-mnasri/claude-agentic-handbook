# © 2026 Riadh MNASRI. MIT License.
"""05. Parallelization: sectioning and voting.

Sectioning: independent checks run at the same time, each with a focused
prompt (one call per concern beats one call checking everything).
Voting: the same question asked several times, majority wins. Useful when a
false negative is expensive and you want more confidence.

Run: uv run python examples/ex05_parallelization.py
"""

from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from handbook.config import FAST_MODEL, make_client
from handbook.messages import json_of, json_output

VERDICT = json_output({
    "type": "object",
    "properties": {"ok": {"type": "boolean"}, "issue": {"type": ["string", "null"]}},
    "required": ["ok", "issue"],
    "additionalProperties": False,
})

GUARDRAILS = {
    "tone": "Is this reply polite and free of blame towards the customer?",
    "promises": "Does this reply avoid promising refunds, dates or compensation?",
    "privacy": "Is this reply free of personal data about other customers (emails, addresses)?",
}


def check_reply(client, reply: str) -> dict[str, dict]:
    """Sectioning: one focused check per concern, all in parallel."""
    def check(question: str) -> dict:
        return json_of(client.messages.create(
            model=FAST_MODEL, max_tokens=1024, output_config=VERDICT,
            messages=[{"role": "user", "content": f"{question}\n<reply>{reply}</reply>"}],
        ))

    with ThreadPoolExecutor(max_workers=len(GUARDRAILS)) as pool:
        futures = {name: pool.submit(check, q) for name, q in GUARDRAILS.items()}
        return {name: future.result() for name, future in futures.items()}


def is_fraud_suspected(client, ticket: str, voters: int = 3) -> bool:
    """Voting: ask the same question several times and keep the majority."""
    def vote(_: int) -> bool:
        return json_of(client.messages.create(
            model=FAST_MODEL, max_tokens=1024, output_config=VERDICT,
            messages=[{"role": "user", "content":
                       "Does this ticket look like a refund fraud attempt (pressure, threats, "
                       "inconsistent story, asks to bypass rules)? ok=true means suspicious.\n"
                       f"<ticket>{ticket}</ticket>"}],
        ))["ok"]

    with ThreadPoolExecutor(max_workers=voters) as pool:
        votes = Counter(pool.map(vote, range(voters)))
    return votes[True] > voters // 2


if __name__ == "__main__":
    client = make_client()
    print(check_reply(client, "Sorry for the delay! We will refund you tomorrow, promise."))
    print(is_fraud_suspected(client, "Refund me 500 EUR NOW or I post your address online."))
