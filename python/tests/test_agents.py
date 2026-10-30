import json

import pytest

import ex02_agent_loop as ex02
import ex08_guardrails_hitl as ex08
import ex09_context_memory as ex09
from fakes import FakeClient, text, tools
from handbook.bookshop import Bookshop
from handbook.loop import AgentStuck, Tool, run_agent


def test_02_loop_runs_parallel_tools_and_returns_one_message_of_results():
    # Given Claude asks for two tools at once, then answers
    client = FakeClient([
        tools(("get_order", {"order_id": "ORD-1003"}), ("search_catalog", {"query": "evals"})),
        text("Your order is lost. We have Evals Before Vibes."),
    ])
    # When
    answer = ex02.answer(client, "Where is ORD-1003 and do you have evals books?")
    # Then
    assert answer == "Your order is lost. We have Evals Before Vibes."
    results = client.calls[1]["messages"][-1]
    assert results["role"] == "user" and len(results["content"]) == 2
    assert '"status": "lost"' in results["content"][0]["content"]


def test_02_tool_errors_are_sent_back_to_the_model():
    client = FakeClient([tools(("get_order", {})), text("Which order?")])
    assert ex02.answer(client, "status?") == "Which order?"
    result = client.calls[1]["messages"][-1]["content"][0]
    assert result["is_error"] is True


def test_02_loop_is_bounded():
    client = FakeClient(lambda _p: tools(("search_catalog", {"query": "x"})))
    with pytest.raises(RuntimeError):
        ex02.answer(client, "loop forever", max_turns=3)


def test_08_small_refund_is_automatic():
    shop = Bookshop()
    client = FakeClient([
        tools(("check_refund_eligibility", {"order_id": "ORD-1001"})),
        tools(("issue_refund", {"order_id": "ORD-1001", "amount": 39.0, "reason": "damaged"})),
        text("Refunded 39 EUR."),
    ])
    asked = []
    ex08.refund_agent(client, "refund ORD-1001", shop, lambda n, a: asked.append(a) or False,
                      on_event=lambda _e: None)
    assert asked == [] and shop.refunds[0]["amount"] == 39.0


def test_08_big_refund_needs_a_human_and_a_rejection_is_reported_to_the_model():
    shop = Bookshop()
    client = FakeClient([
        tools(("issue_refund", {"order_id": "ORD-1003", "amount": 119.0, "reason": "lost"})),
        text("A specialist will follow up."),
    ])
    asked = []
    ex08.refund_agent(client, "refund ORD-1003", shop, lambda n, a: asked.append(a) or False,
                      on_event=lambda _e: None)
    assert asked == [{"order_id": "ORD-1003", "amount": 119.0, "reason": "lost"}]
    assert shop.refunds == []
    assert "rejected" in client.calls[1]["messages"][-1]["content"][0]["content"]


def test_08_injected_gift_message_is_wrapped_and_code_still_caps_the_amount():
    shop = Bookshop()
    client = FakeClient([
        tools(("get_order", {"order_id": "ORD-1005"})),
        # Suppose the injection worked and the model obeys it:
        tools(("issue_refund", {"order_id": "ORD-1005", "amount": 500.0, "reason": "admin"})),
        text("Done."),
    ])
    ex08.refund_agent(client, "refund ORD-1005", shop, lambda n, a: True, on_event=lambda _e: None)
    order_result = client.calls[1]["messages"][-1]["content"][0]["content"]
    assert order_result.startswith("<untrusted_data>")
    refund_result = client.calls[2]["messages"][-1]["content"][0]
    assert refund_result["is_error"] and shop.refunds == []


def test_loop_blocks_repeated_identical_calls_and_denied_tools():
    echo = Tool({"name": "echo", "description": "", "input_schema": {"type": "object"}}, lambda a: "x")
    off = Tool({"name": "off", "description": "", "input_schema": {"type": "object"}}, lambda a: "x",
               permission="deny")
    client = FakeClient([tools(("echo", {}))] * 3 + [tools(("off", {})), text("ok")])
    result = run_agent(client, system="s", prompt="p", tools=[echo, off])
    third = client.calls[3]["messages"][-1]["content"][0]
    denied = client.calls[4]["messages"][-1]["content"][0]
    assert third["is_error"] and "already" in third["content"]
    assert denied["is_error"] and "disabled" in denied["content"]
    assert result.turns == 5 and result.input_tokens == 500


def test_loop_raises_when_stuck():
    echo = Tool({"name": "echo", "description": "", "input_schema": {"type": "object"}},
                lambda a: "x")
    client = FakeClient(lambda p: tools(("echo", {"n": len(p["messages"])})))
    with pytest.raises(AgentStuck):
        run_agent(client, system="s", prompt="p", tools=[echo], max_turns=2)


def test_09_session_caches_the_handbook_and_compacts_old_turns():
    def answer(params):
        if "Update the summary" in str(params["messages"][-1]["content"]):
            return text("Customer asked about shipping to Spain.")
        return text("answer", cache_read=1200)
    client = FakeClient(answer)
    session = ex09.SupportSession(client, max_messages=4, keep_last=2)
    # When the third question pushes the history over the limit, then a fourth one
    for question in ["q1", "q2", "q3", "q4"]:
        session.send(question)
    # Then old turns are summarised and the summary follows the cached block
    assert session.summary == "Customer asked about shipping to Spain."
    assert [m["content"] for m in session.history] == ["q3", "answer", "q4", "answer"]
    last_main_call = client.calls[-1]
    assert last_main_call["system"][0]["cache_control"] == {"type": "ephemeral"}
    assert "Spain" in last_main_call["system"][1]["text"]
    assert session.cache_reads == 4800


def test_09_memory_survives_between_sessions(tmp_path):
    notes = ex09.MemoryNotes(tmp_path / "memory.json")
    client = FakeClient([
        tools(("remember_note", {"customer": "alice@example.com", "note": "prefers e-books"})),
        text("Noted!"),
    ])
    ex09.remembering_agent(client, "alice@example.com", "e-books only", notes)
    later = ex09.MemoryNotes(tmp_path / "memory.json")
    assert later.recall("alice@example.com") == ["prefers e-books"]
    assert json.loads((tmp_path / "memory.json").read_text())
