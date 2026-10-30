import json
from pathlib import Path

from mcp import Client

import ex10_evals as ex10
import ex11_mcp_server as ex11
import ex12_agent_sdk as ex12
from fakes import FakeClient, as_json


def test_10_eval_reports_accuracy_and_failures():
    tickets = ex10.load_tickets()
    by_text = {t["text"]: t for t in tickets}

    def answer(params):
        ticket = by_text[params["messages"][0]["content"].split("\n")[1]]
        wrong = ticket["id"] == "t01"  # one deliberate mistake
        return as_json({"category": "other" if wrong else ticket["category"],
                        "urgency": ticket["urgency"], "order_id": None, "summary": "s"})

    report = ex10.eval_triage(FakeClient(answer), tickets)
    assert report.total == 12
    assert report.category_accuracy == 11 / 12 and report.urgency_accuracy == 1
    assert report.failures == [{"id": "t01", "expected": ("billing", "high"), "got": ("other", "high")}]


def test_10_judge_returns_score_and_reasoning():
    client = FakeClient([as_json({"reasoning": "correct", "score": 5})])
    assert ex10.judge_reply(client, "t", "r")["score"] == 5


async def test_11_mcp_server_exposes_read_only_tools_and_policy():
    async with Client(ex11.server) as client:
        names = {tool.name for tool in (await client.list_tools()).tools}
        assert names == {"get_order", "search_catalog", "check_refund_eligibility"}
        result = await client.call_tool("get_order", {"order_id": "ORD-1003"})
        assert json.loads(result.content[0].text)["status"] == "lost"
        policy = await client.read_resource("paperleaf://policy")
        assert json.loads(policy.contents[0].text)["refund_window_days"] == 30


async def test_12_hook_denies_secret_files_and_allows_the_rest():
    denied = await ex12.block_secrets({"tool_input": {"file_path": "/app/.env"}}, "id", None)
    allowed = await ex12.block_secrets({"tool_input": {"file_path": "/app/main.py"}}, "id", None)
    assert denied["hookSpecificOutput"]["permissionDecision"] == "deny"
    assert allowed == {}


def test_12_options_are_read_only_and_bounded():
    options = ex12.build_options(Path("."))
    assert "Bash" in options.disallowed_tools and "Write" in options.disallowed_tools
    assert options.max_budget_usd == 1.0 and "test-reviewer" in options.agents
