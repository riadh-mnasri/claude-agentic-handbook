# 13. Taking an agent to production

## Model and effort choice

- Default to the most capable model for planning and judgment; use smaller
  models for routing, workers and judges (the examples use `MODEL` and
  `FAST_MODEL`).
- Tune `output_config.effort` per route on your eval set: `low` for simple
  classification, higher for agentic coding and planning.
- Keep model ids in configuration (`HANDBOOK_MODEL`, `HANDBOOK_FAST_MODEL`),
  not scattered in code, and re-run evals when you change them.

## Cost

| Lever | Typical gain | Where |
|---|---|---|
| Prompt caching | Up to 90 % on the cached prefix | `cache_control`, stable prefix |
| Smaller model on narrow steps | Large | Routing, workers |
| Lower effort where quality holds | Medium | `output_config.effort` |
| Batch API for offline work | 50 % | Message Batches |
| Concise tool results | Medium to large | Tool design |
| Compaction and context editing | Large on long sessions | Chapter 06 |

Judge cost **per completed task**, not per request.

## Latency

Stream responses to users, run independent calls in parallel (`ex05`,
`ex06`), keep prompts and tool results short, and use the small model on the
critical path where it is good enough.

## Reliability

- The SDKs retry 429, 5xx and connection errors with backoff (`max_retries`).
  Catch errors from most to least specific (rate limit, server, connection, bad request).
- Long outputs: stream, and set a large `max_tokens` instead of hitting truncation.
- Handle every `stop_reason` (chapter 04), including `refusal`. The API can
  also retry a declined request on another model with the `fallbacks` option
  (beta): enable it where a refusal would block a legitimate user.
- Make tools idempotent where possible (a retried refund must not pay twice).
- Persist agent state for long tasks so a crash resumes instead of restarting.

## Versioning and rollout

- Version prompts, tool descriptions and agent configs like code
  (Managed Agents versions agents for you).
- Roll out behind a flag, compare against the previous version on the same
  eval set, watch cost and success rate after release.

## Launch checklist

- [ ] Eval set with a pass threshold, run in CI
- [ ] Guardrail checklist of chapter 11 done
- [ ] Limits: turns, budget, timeout, rate limits
- [ ] Logging and tracing of every run
- [ ] Refusal and error paths tested
- [ ] Human escalation path defined
- [ ] Cost per task measured and acceptable

Next: [14. Glossary and resources](14-glossary-and-resources.md).
