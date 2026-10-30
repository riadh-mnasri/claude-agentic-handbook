import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { answer } from "../src/examples/02-agent-loop.js";
import { refundAgent } from "../src/examples/08-guardrails-hitl.js";
import { MemoryNotes, rememberingAgent, SupportSession } from "../src/examples/09-context-memory.js";
import { Bookshop } from "../src/core/bookshop.js";
import { AgentStuck, runAgent, type Tool } from "../src/core/loop.js";
import { FakeClient, promptOf, text, toolResults, tools } from "./fakes.js";

const quiet = () => {};

describe("02 agent loop", () => {
  it("runs parallel tools and returns one message of results", async () => {
    // Given Claude asks for two tools at once, then answers
    const client = new FakeClient([
      tools(["get_order", { order_id: "ORD-1003" }], ["search_catalog", { query: "evals" }]),
      text("Your order is lost. We have Evals Before Vibes."),
    ]);
    // When
    const reply = await answer(client, "Where is ORD-1003?");
    // Then
    expect(reply).toBe("Your order is lost. We have Evals Before Vibes.");
    const results = toolResults(client.calls[1]!);
    expect(results).toHaveLength(2);
    expect(results[0]!.content).toContain('"status":"lost"');
  });

  it("sends tool errors back to the model", async () => {
    const client = new FakeClient([tools(["get_order", {}]), text("Which order?")]);
    expect(await answer(client, "status?")).toBe("Which order?");
    expect(toolResults(client.calls[1]!)[0]!.is_error).toBe(true);
  });

  it("is bounded", async () => {
    const client = new FakeClient(() => tools(["search_catalog", { query: "x" }]));
    await expect(answer(client, "loop", new Bookshop(), 3)).rejects.toThrow(/No answer/);
  });
});

describe("08 guardrails and human in the loop", () => {
  it("refunds small amounts automatically", async () => {
    const shop = new Bookshop();
    const asked: unknown[] = [];
    const client = new FakeClient([
      tools(["check_refund_eligibility", { order_id: "ORD-1001" }]),
      tools(["issue_refund", { order_id: "ORD-1001", amount: 39, reason: "damaged" }]),
      text("Refunded 39 EUR."),
    ]);
    await refundAgent(client, "refund ORD-1001", shop, (_n, a) => { asked.push(a); return false; }, quiet);
    expect(asked).toEqual([]);
    expect(shop.refunds[0]!.amount).toBe(39);
  });

  it("asks a human for big refunds and reports a rejection to the model", async () => {
    const shop = new Bookshop();
    const asked: unknown[] = [];
    const client = new FakeClient([
      tools(["issue_refund", { order_id: "ORD-1003", amount: 119, reason: "lost" }]),
      text("A specialist will follow up."),
    ]);
    await refundAgent(client, "refund ORD-1003", shop, (_n, a) => { asked.push(a); return false; }, quiet);
    expect(asked).toEqual([{ order_id: "ORD-1003", amount: 119, reason: "lost" }]);
    expect(shop.refunds).toEqual([]);
    expect(toolResults(client.calls[1]!)[0]!.content).toContain("rejected");
  });

  it("wraps the injected gift message and the code still caps the amount", async () => {
    const shop = new Bookshop();
    const client = new FakeClient([
      tools(["get_order", { order_id: "ORD-1005" }]),
      // Suppose the injection worked and the model obeys it:
      tools(["issue_refund", { order_id: "ORD-1005", amount: 500, reason: "admin" }]),
      text("Done."),
    ]);
    await refundAgent(client, "refund ORD-1005", shop, () => true, quiet);
    expect(String(toolResults(client.calls[1]!)[0]!.content)).toMatch(/^<untrusted_data>/);
    expect(toolResults(client.calls[2]!)[0]!.is_error).toBe(true);
    expect(shop.refunds).toEqual([]);
  });
});

describe("hardened loop", () => {
  const tool = (name: string, permission: Tool["permission"] = "allow"): Tool => ({
    definition: { name, description: "", input_schema: { type: "object" } }, handler: () => "x", permission,
  });

  it("blocks repeated identical calls and denied tools", async () => {
    const client = new FakeClient([tools(["echo", {}]), tools(["echo", {}]), tools(["echo", {}]), tools(["off", {}]), text("ok")]);
    const result = await runAgent(client, { system: "s", prompt: "p", tools: [tool("echo"), tool("off", "deny")] });
    expect(toolResults(client.calls[3]!)[0]!.content).toContain("already");
    expect(toolResults(client.calls[4]!)[0]!.content).toContain("disabled");
    expect([result.turns, result.inputTokens]).toEqual([5, 500]);
  });

  it("raises when stuck", async () => {
    const client = new FakeClient((p) => tools(["echo", { n: p.messages.length }]));
    await expect(runAgent(client, { system: "s", prompt: "p", tools: [tool("echo")], maxTurns: 2 })).rejects.toBeInstanceOf(AgentStuck);
  });
});

describe("09 context and memory", () => {
  it("caches the handbook and compacts old turns", async () => {
    const client = new FakeClient((p) =>
      promptOf(p).includes("Update the summary") ? text("Customer asked about shipping to Spain.") : text("answer", 1200));
    const session = new SupportSession(client, 4, 2);
    for (const q of ["q1", "q2", "q3", "q4"]) await session.send(q);
    expect(session.summary).toBe("Customer asked about shipping to Spain.");
    expect(session.history.map((m) => m.content)).toEqual(["q3", "answer", "q4", "answer"]);
    const system = client.calls.at(-1)!.system as { text: string; cache_control?: unknown }[];
    expect(system[0]!.cache_control).toEqual({ type: "ephemeral" });
    expect(system[1]!.text).toContain("Spain");
    expect(session.cacheReads).toBe(4800);
  });

  it("keeps memory between sessions", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "handbook-")), "memory.json");
    const client = new FakeClient([
      tools(["remember_note", { customer: "alice@example.com", note: "prefers e-books" }]),
      text("Noted!"),
    ]);
    await rememberingAgent(client, "alice@example.com", "e-books only", new MemoryNotes(path));
    expect(new MemoryNotes(path).recall("alice@example.com")).toEqual(["prefers e-books"]);
  });
});
