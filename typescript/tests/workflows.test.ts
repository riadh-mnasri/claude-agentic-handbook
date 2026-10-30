import { describe, expect, it } from "vitest";
import { triage, TRIAGE_SCHEMA } from "../src/examples/01-augmented-llm.js";
import { GateFailed, replyTo } from "../src/examples/03-prompt-chaining.js";
import { handle, ROUTES } from "../src/examples/04-routing.js";
import { checkReply, isFraudSuspected } from "../src/examples/05-parallelization.js";
import { readingPlan } from "../src/examples/06-orchestrator-workers.js";
import { writeBlurb } from "../src/examples/07-evaluator-optimizer.js";
import { FAST_MODEL, MODEL } from "../src/core/config.js";
import { RefusalError } from "../src/core/messages.js";
import { asJson, FakeClient, promptOf, refusal, text } from "./fakes.js";

const TRIAGE = { category: "shipping", urgency: "medium", order_id: "ORD-1002", summary: "Late parcel" };

describe("01 augmented LLM", () => {
  it("sends the schema and parses the answer", async () => {
    // Given
    const client = new FakeClient([asJson(TRIAGE)]);
    // When
    const result = await triage(client, "Where is ORD-1002?");
    // Then
    expect(result).toEqual(TRIAGE);
    expect(client.calls[0]!.model).toBe(FAST_MODEL);
    expect(client.calls[0]!.output_config?.format?.schema).toBe(TRIAGE_SCHEMA);
  });

  it("raises on refusal instead of parsing", async () => {
    await expect(triage(new FakeClient([refusal()]), "...")).rejects.toBeInstanceOf(RefusalError);
  });
});

describe("03 prompt chaining", () => {
  it("runs three steps with verified order data", async () => {
    const client = new FakeClient([
      asJson({ order_id: "ORD-1002", customer_request: "where is it", tone: "angry" }),
      text("Your order ORD-1002 has shipped."),
      text("Hello! Your order ORD-1002 is on its way."),
    ]);
    expect(await replyTo(client, "Where is ORD-1002??")).toBe("Hello! Your order ORD-1002 is on its way.");
    expect(promptOf(client.calls[1]!)).toContain('"status":"shipped"');
  });

  it("stops at the first gate on an unknown order", async () => {
    const client = new FakeClient([asJson({ order_id: "ORD-9999", customer_request: "x", tone: "calm" })]);
    await expect(replyTo(client, "ORD-9999?")).rejects.toBeInstanceOf(GateFailed);
    expect(client.calls).toHaveLength(1);
  });

  it("rejects a draft that forgets the order id", async () => {
    const client = new FakeClient([asJson({ order_id: "ORD-1002", customer_request: "x", tone: "calm" }), text("It is coming.")]);
    await expect(replyTo(client, "ORD-1002?")).rejects.toThrow(/order id/);
  });
});

describe("04 routing", () => {
  it("sends refunds to the main model with the refund prompt", async () => {
    const client = new FakeClient([asJson({ ...TRIAGE, category: "refund" }), text("A specialist will help.")]);
    expect(await handle(client, "Refund ORD-1003")).toEqual({ category: "refund", reply: "A specialist will help." });
    expect(client.calls[1]!.model).toBe(MODEL);
    expect(client.calls[1]!.system).toBe(ROUTES.refund.system);
  });
});

describe("05 parallelization", () => {
  it("runs one check per guardrail", async () => {
    const client = new FakeClient(() => asJson({ ok: true, issue: null }));
    expect(Object.keys(await checkReply(client, "Thanks for waiting"))).toEqual(["tone", "promises", "privacy"]);
    expect(client.calls).toHaveLength(3);
  });

  it("keeps the majority vote", async () => {
    const votes = [true, false, true];
    const client = new FakeClient(() => asJson({ ok: votes.shift(), issue: null }));
    expect(await isFraudSuspected(client, "refund me now")).toBe(true);
  });
});

describe("06 orchestrator-workers", () => {
  it("gives each worker only the books of its subtask", async () => {
    const plan = { subtasks: [
      { title: "Start", search_query: "agents", instructions: "basics" },
      { title: "Testing", search_query: "evals", instructions: "how to test" },
    ] };
    const client = new FakeClient((params) => {
      if (params.output_config) return asJson(plan);
      const prompt = promptOf(params);
      return prompt.startsWith("Section:") ? text(`section about ${prompt.split("\n")[0]}`) : text("final plan");
    });
    expect(await readingPlan(client, "learn agents")).toBe("final plan");
    const workers = client.calls.map(promptOf).filter((p) => p.startsWith("Section:"));
    expect(workers).toHaveLength(2);
    const testing = workers.find((p) => p.includes("Testing"))!;
    expect(testing).toContain("Evals Before Vibes");
    expect(testing).not.toContain("A Quiet Garden");
  });
});

describe("07 evaluator-optimizer", () => {
  it("loops with feedback until the evaluator passes", async () => {
    const client = new FakeClient([
      text("The best book ever!"),
      asJson({ passed: false, failed_criteria: [4], feedback: "Remove 'best'." }),
      text("A clear guide by Omar Benali..."),
      asJson({ passed: true, failed_criteria: [], feedback: "" }),
    ]);
    const outcome = await writeBlurb(client, { title: "Evals Before Vibes", author: "Omar Benali" });
    expect([outcome.passed, outcome.rounds]).toEqual([true, 2]);
    expect(promptOf(client.calls[2]!)).toContain("Remove 'best'.");
  });

  it("stops after max rounds", async () => {
    const client = new FakeClient((p) => (p.output_config ? asJson({ passed: false, failed_criteria: [1], feedback: "no" }) : text("draft")));
    const outcome = await writeBlurb(client, { title: "t" }, 2);
    expect([outcome.passed, outcome.rounds]).toEqual([false, 2]);
  });
});
