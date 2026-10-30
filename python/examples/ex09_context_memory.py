# © 2026 Riadh MNASRI. MIT License.
"""09. Context engineering: caching, compaction and long-term memory.

- Prompt caching: the stable prefix (system prompt) is cached, later turns
  pay about a tenth of the price for it. Check usage.cache_read_input_tokens.
  Prefixes below the model's minimum (a few thousand tokens) are not cached:
  the short handbook below shows the placement, a real one would be longer.
- Compaction: when the history grows, older turns are replaced by a summary
  so the context stays small and focused. (The API also offers server-side
  compaction, see docs; this is the portable version you control.)
- Memory: facts worth keeping across sessions go to a store the agent reads
  and writes through tools, not to an ever-growing prompt.

Run: uv run python examples/ex09_context_memory.py
"""

import json
from pathlib import Path

from handbook.config import FAST_MODEL, MODEL, make_client
from handbook.loop import Tool, run_agent
from handbook.messages import text_of

POLICY_HANDBOOK = """You are the support assistant of Paperleaf Books.
Refunds: 30 days after delivery, or when a parcel is lost.
Shipping: 2-4 working days in France, 5-8 in the EU. Free above 35 EUR.
Tone: warm, brief, no jargon."""


class SupportSession:
    """A multi-turn conversation that caches its prefix and compacts its history."""

    def __init__(self, client, max_messages: int = 8, keep_last: int = 4):
        self.client = client
        self.max_messages = max_messages
        self.keep_last = keep_last
        self.summary = ""
        self.history: list[dict] = []
        self.cache_reads = 0

    def send(self, text: str) -> str:
        self.history.append({"role": "user", "content": text})
        system = [{"type": "text", "text": POLICY_HANDBOOK, "cache_control": {"type": "ephemeral"}}]
        if self.summary:
            # Volatile content goes after the cached block, never before it.
            system.append({"type": "text", "text": f"Summary of the conversation so far:\n{self.summary}"})
        response = self.client.messages.create(
            model=MODEL, max_tokens=4000, system=system, messages=self.history)
        self.cache_reads += response.usage.cache_read_input_tokens or 0
        reply = text_of(response)
        self.history.append({"role": "assistant", "content": reply})
        if len(self.history) > self.max_messages:
            self._compact()
        return reply

    def _compact(self) -> None:
        old, recent = self.history[:-self.keep_last], self.history[-self.keep_last:]
        transcript = "\n".join(f"{m['role']}: {m['content']}" for m in old)
        self.summary = text_of(self.client.messages.create(
            model=FAST_MODEL, max_tokens=1000,
            messages=[{"role": "user", "content":
                       f"Previous summary:\n{self.summary or '(none)'}\n\nNew turns:\n{transcript}\n\n"
                       "Update the summary. Keep order ids, amounts, promises made and open "
                       "questions. Drop small talk. Max 120 words."}],
        ))
        self.history = recent  # recent starts with a user message: keep_last is even


class MemoryNotes:
    """Long-term memory: a JSON file of notes per customer, exposed as tools."""

    def __init__(self, path: Path):
        self.path = path

    def _load(self) -> dict:
        return json.loads(self.path.read_text()) if self.path.exists() else {}

    def remember(self, customer: str, note: str) -> str:
        notes = self._load()
        notes.setdefault(customer, []).append(note)
        self.path.write_text(json.dumps(notes, indent=2))
        return "saved"

    def recall(self, customer: str) -> list[str]:
        return self._load().get(customer, [])

    def tools(self) -> list[Tool]:
        customer = {"type": "string", "description": "Customer email"}
        return [
            Tool({"name": "recall_notes", "description": "Read what we know about a customer "
                  "from past conversations. Call it at the start of a conversation.",
                  "input_schema": {"type": "object", "properties": {"customer": customer},
                                   "required": ["customer"], "additionalProperties": False}},
                 lambda a: self.recall(a["customer"])),
            Tool({"name": "remember_note", "description": "Save a durable fact about a customer "
                  "(preference, recurring issue). Not for one-off details.",
                  "input_schema": {"type": "object", "properties": {
                      "customer": customer, "note": {"type": "string"}},
                      "required": ["customer", "note"], "additionalProperties": False}},
                 lambda a: self.remember(a["customer"], a["note"])),
        ]


def remembering_agent(client, customer: str, message: str, notes: MemoryNotes) -> str:
    return run_agent(client, system=POLICY_HANDBOOK, tools=notes.tools(),
                     prompt=f"Customer {customer} writes: {message}").text


if __name__ == "__main__":
    client = make_client()
    session = SupportSession(client)
    for question in ["Hi! How long does shipping to Spain take?", "And is it free for 30 EUR?",
                     "OK. What if my parcel gets lost?", "Thanks. Remind me the delays for France?",
                     "Perfect, last one: refund window after delivery?"]:
        print(f"> {question}\n{session.send(question)}\n")
    print(f"cached tokens read: {session.cache_reads}, summary: {session.summary!r}")
    notes = MemoryNotes(Path(".memory.json"))
    print(remembering_agent(client, "alice@example.com", "I only read e-books from now on.", notes))
