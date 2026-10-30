import pytest

import ex01_augmented_llm as ex01
import ex03_prompt_chaining as ex03
import ex04_routing as ex04
import ex05_parallelization as ex05
import ex06_orchestrator_workers as ex06
import ex07_evaluator_optimizer as ex07
from fakes import FakeClient, as_json, prompt_of, refusal, text
from handbook.config import FAST_MODEL, MODEL
from handbook.messages import RefusalError

TRIAGE = {"category": "shipping", "urgency": "medium", "order_id": "ORD-1002", "summary": "Late parcel"}


def test_01_triage_sends_the_schema_and_parses_the_answer():
    # Given
    client = FakeClient([as_json(TRIAGE)])
    # When
    result = ex01.triage(client, "Where is ORD-1002?")
    # Then
    assert result == TRIAGE
    call = client.calls[0]
    assert call["model"] == FAST_MODEL
    assert call["output_config"]["format"]["schema"] is ex01.TRIAGE_SCHEMA
    assert "<ticket>" in call["messages"][0]["content"]


def test_01_refusal_is_raised_not_parsed():
    with pytest.raises(RefusalError):
        ex01.triage(FakeClient([refusal()]), "...")


def test_03_chain_runs_three_steps_with_verified_order_data():
    # Given
    client = FakeClient([
        as_json({"order_id": "ORD-1002", "customer_request": "where is it", "tone": "angry"}),
        text("Your order ORD-1002 has shipped and should arrive soon."),
        text("Hello! Your order ORD-1002 is on its way."),
    ])
    # When
    reply = ex03.reply_to(client, "Where is ORD-1002??")
    # Then
    assert reply == "Hello! Your order ORD-1002 is on its way."
    assert '"status": "shipped"' in client.calls[1]["messages"][0]["content"]


def test_03_gate_stops_the_chain_on_an_unknown_order():
    client = FakeClient([as_json({"order_id": "ORD-9999", "customer_request": "x", "tone": "calm"})])
    with pytest.raises(ex03.GateFailed):
        ex03.reply_to(client, "Where is ORD-9999?")
    assert len(client.calls) == 1  # nothing was drafted


def test_03_gate_rejects_a_draft_without_the_order_id():
    client = FakeClient([as_json({"order_id": "ORD-1002", "customer_request": "x", "tone": "calm"}),
                         text("It is coming.")])
    with pytest.raises(ex03.GateFailed, match="order id"):
        ex03.reply_to(client, "ORD-1002?")


def test_04_refund_tickets_go_to_the_main_model_with_the_refund_prompt():
    client = FakeClient([as_json({**TRIAGE, "category": "refund"}), text("A specialist will help.")])
    category, reply = ex04.handle(client, "Refund ORD-1003 please")
    assert (category, reply) == ("refund", "A specialist will help.")
    assert client.calls[1]["model"] == MODEL
    assert client.calls[1]["system"] == ex04.ROUTES["refund"].system


def test_05_sectioning_runs_one_check_per_guardrail():
    def answer(params):
        return as_json({"ok": "promising" not in prompt_of(params), "issue": None})
    client = FakeClient(answer)
    verdicts = ex05.check_reply(client, "We will refund you tomorrow")
    assert set(verdicts) == {"tone", "promises", "privacy"}
    assert len(client.calls) == 3


def test_05_voting_keeps_the_majority():
    answers = iter([True, False, True])
    client = FakeClient(lambda _p: as_json({"ok": next(answers), "issue": None}))
    assert ex05.is_fraud_suspected(client, "refund me now") is True


def test_06_workers_only_see_the_books_of_their_subtask():
    plan = {"subtasks": [
        {"title": "Start", "search_query": "agents", "instructions": "basics"},
        {"title": "Testing", "search_query": "evals", "instructions": "how to test"},
    ]}

    def answer(params):
        prompt = prompt_of(params)
        if params.get("output_config"):
            return as_json(plan)
        if prompt.startswith("Section:"):
            return text("section about " + prompt.split("\n")[0])
        return text("final plan")
    client = FakeClient(answer)

    assert ex06.reading_plan(client, "learn agents") == "final plan"
    worker_prompts = [prompt_of(c) for c in client.calls if prompt_of(c).startswith("Section:")]
    assert len(worker_prompts) == 2
    testing = next(p for p in worker_prompts if "Testing" in p)
    assert "Evals Before Vibes" in testing and "A Quiet Garden" not in testing
    assert "section about Section: Start" in prompt_of(client.calls[-1])


def test_07_loops_with_feedback_until_the_evaluator_passes():
    client = FakeClient([
        text("The best book ever!"),
        as_json({"passed": False, "failed_criteria": [4], "feedback": "Remove 'best'."}),
        text("A clear guide by Omar Benali..."),
        as_json({"passed": True, "failed_criteria": [], "feedback": ""}),
    ])
    outcome = ex07.write_blurb(client, {"title": "Evals Before Vibes", "author": "Omar Benali"})
    assert outcome.passed and outcome.rounds == 2
    assert "Remove 'best'." in prompt_of(client.calls[2])


def test_07_stops_after_max_rounds():
    script = []
    for _ in range(2):
        script += [text("draft"), as_json({"passed": False, "failed_criteria": [1], "feedback": "no"})]
    outcome = ex07.write_blurb(FakeClient(script), {"title": "t"}, max_rounds=2)
    assert not outcome.passed and outcome.rounds == 2
