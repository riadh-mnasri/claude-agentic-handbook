# © 2026 Riadh MNASRI. MIT License.
"""The fictional Paperleaf bookshop used by every example.

Plain functions over the shared JSON file, plus their tool definitions.
Business rules (refund window, amount limits) live here, in code, never only
in a prompt: the model can be talked into anything, the code cannot.
"""

import json
from datetime import date
from pathlib import Path
from typing import Any


def shared_dir() -> Path:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "shared"
        if (candidate / "bookshop.json").exists():
            return candidate
    raise FileNotFoundError("shared/bookshop.json not found above " + __file__)


class Bookshop:
    def __init__(self, data: dict[str, Any] | None = None):
        self.data = data or json.loads((shared_dir() / "bookshop.json").read_text())
        self.refunds: list[dict[str, Any]] = []

    @property
    def policy(self) -> dict[str, Any]:
        return self.data["policy"]

    def get_order(self, order_id: str) -> dict[str, Any] | None:
        return next((o for o in self.data["orders"] if o["id"] == order_id.upper()), None)

    def search_catalog(self, query: str, max_results: int = 5) -> list[dict[str, Any]]:
        words = [w for w in query.lower().split() if len(w) > 2]

        def score(book: dict[str, Any]) -> int:
            haystack = " ".join([book["title"], book["author"], *book["tags"]]).lower()
            return sum(word in haystack for word in words)

        ranked = sorted(self.data["catalog"], key=score, reverse=True)
        return [b for b in ranked if score(b) > 0][:max_results]

    def refund_eligibility(self, order_id: str) -> dict[str, Any]:
        order = self.get_order(order_id)
        if order is None:
            return {"eligible": False, "reason": f"Unknown order {order_id}"}
        if order["status"] not in self.policy["refundable_statuses"]:
            return {"eligible": False, "reason": f"Order is {order['status']}, not refundable yet"}
        reference = date.fromisoformat(self.data["reference_date"])
        since = date.fromisoformat(order["delivered_on"] or order["placed_on"])
        if (reference - since).days > self.policy["refund_window_days"]:
            return {"eligible": False, "reason": "Outside the refund window"}
        already = sum(r["amount"] for r in self.refunds if r["order_id"] == order["id"])
        return {"eligible": True, "max_amount": order["total"] - already,
                "needs_human_approval": order["total"] > self.policy["auto_refund_limit"]}

    def issue_refund(self, order_id: str, amount: float, reason: str) -> dict[str, Any]:
        check = self.refund_eligibility(order_id)
        if not check["eligible"]:
            raise ValueError(check["reason"])
        if amount <= 0 or amount > check["max_amount"]:
            raise ValueError(f"Amount must be between 0 and {check['max_amount']}")
        refund = {"refund_id": f"RF-{len(self.refunds) + 1:04d}", "order_id": order_id.upper(),
                  "amount": amount, "reason": reason}
        self.refunds.append(refund)
        return refund


# Tool definitions. Descriptions are prompts: say what, when, and what comes back.
GET_ORDER = {
    "name": "get_order",
    "description": "Look up one order by its id (format ORD-1234). Returns status, items, "
                   "dates, total and the customer's gift message. Use it before answering "
                   "any question about a specific order.",
    "input_schema": {
        "type": "object",
        "properties": {"order_id": {"type": "string", "description": "Order id, e.g. ORD-1001"}},
        "required": ["order_id"],
        "additionalProperties": False,
    },
}

SEARCH_CATALOG = {
    "name": "search_catalog",
    "description": "Search the book catalog by keywords (title, author or topic). Returns up "
                   "to max_results books with price and stock. Stock 0 means out of stock.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Keywords, e.g. 'ai evals beginners'"},
            "max_results": {"type": "integer", "minimum": 1, "maximum": 10},
        },
        "required": ["query"],
        "additionalProperties": False,
    },
}

CHECK_REFUND = {
    "name": "check_refund_eligibility",
    "description": "Check whether an order can be refunded under the shop policy and the "
                   "maximum refundable amount. Always call it before issue_refund.",
    "input_schema": {
        "type": "object",
        "properties": {"order_id": {"type": "string"}},
        "required": ["order_id"],
        "additionalProperties": False,
    },
}

ISSUE_REFUND = {
    "name": "issue_refund",
    "description": "Refund an amount in EUR on an eligible order. Irreversible: only call it "
                   "when the customer asked for a refund and eligibility was checked.",
    "input_schema": {
        "type": "object",
        "properties": {
            "order_id": {"type": "string"},
            "amount": {"type": "number", "description": "Amount in EUR"},
            "reason": {"type": "string", "description": "Short reason shown to the customer"},
        },
        "required": ["order_id", "amount", "reason"],
        "additionalProperties": False,
    },
}
