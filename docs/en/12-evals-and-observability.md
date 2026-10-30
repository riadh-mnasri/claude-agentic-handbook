# 12. Evals and observability

## Why evals first

Without evals, you cannot tell whether a new prompt, model, tool description
or effort level made things better or worse. With them, every change becomes
an experiment with a number at the end.

## Building an eval set

1. **Start small**: 20 to 50 real cases beat 1 000 synthetic ones. Take them
   from logs, support tickets, bug reports.
2. **Label the expected outcome**, not the exact wording.
3. **Cover the edges**: ambiguous inputs, missing data, injections, refusals,
   multi-step cases.
4. **Keep a held-out set** you never tune on.
5. **Grow it from failures**: every production bug becomes a case.

`shared/evals/tickets.jsonl` is a 12-case set for the triage step.

## Graders

| Grader | How | Use for | Example |
|---|---|---|---|
| **Code-based** | Exact match, regex, JSON schema, unit tests on produced code | Classifications, extractions, anything checkable | `eval_triage` |
| **Model-based (LLM judge)** | A model scores with an explicit rubric, reasoning before score | Tone, helpfulness, faithfulness | `judge_reply` |
| **Human** | Experts review a sample | Calibrating the judge, high-stakes outputs | |

Make judges reliable: a precise rubric with anchored levels, structured
output, a different model or context from the one being graded, and a
periodic check against human labels.

## Evaluating agents, not only answers

| Measure | Question |
|---|---|
| **Task success** | Did the final state match the goal (order refunded, tests passing)? |
| **Trajectory** | Were the right tools called, in a sensible order, without forbidden actions? |
| **Efficiency** | Turns, tokens, cost and time per completed task |
| **Safety** | Did it resist the injection cases? Did it ask for approval when required? |

Agents are non-deterministic: run each case several times and report the
pass rate, not one lucky run.

## In CI

`ex10` exits with a non-zero code below a threshold, so it can gate a pull
request that changes a prompt or a model. Run the cheap code-based evals on
every PR, and the slower judge-based ones nightly.

## Observability

Log, for every run: the request id, model, effort, prompt version, each tool
call with input and result, stop reasons, token usage including cache reads,
latency and cost. Then:

- the SDKs support **OpenTelemetry** tracing;
- Claude Code exports metrics and events through OpenTelemetry too;
- the Managed Agents session viewer shows every event of a session;
- `--output-format json` in headless mode returns cost and turns.

Read transcripts regularly. Most agent bugs are obvious once you read what
the model actually saw.

Next: [13. Production](13-production.md).
