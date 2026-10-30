import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { evalTriage, judgeReply, loadTickets } from "../src/examples/10-evals.js";
import { createServer } from "../src/examples/11-mcp-server.js";
import { blockSecrets, buildOptions } from "../src/examples/12-agent-sdk.js";
import { asJson, FakeClient, promptOf } from "./fakes.js";

describe("10 evals", () => {
  it("reports accuracy and failures", async () => {
    const tickets = loadTickets();
    const client = new FakeClient((p) => {
      const ticket = tickets.find((t) => promptOf(p).includes(t.text))!;
      return asJson({ category: ticket.id === "t01" ? "other" : ticket.category, urgency: ticket.urgency, order_id: null, summary: "s" });
    });
    const report = await evalTriage(client, tickets);
    expect(report.total).toBe(12);
    expect(report.categoryAccuracy).toBeCloseTo(11 / 12);
    expect(report.urgencyAccuracy).toBe(1);
    expect(report.failures).toEqual([{ id: "t01", expected: ["billing", "high"], got: ["other", "high"] }]);
  });

  it("judge returns a score with its reasoning", async () => {
    expect((await judgeReply(new FakeClient([asJson({ reasoning: "ok", score: 5 })]), "t", "r")).score).toBe(5);
  });
});

describe("11 MCP server", () => {
  it("exposes read-only tools and the policy resource", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createServer().connect(serverTransport);
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["check_refund_eligibility", "get_order", "search_catalog"]);
    const result = await client.callTool({ name: "get_order", arguments: { order_id: "ORD-1003" } });
    const [first] = result.content as { text: string }[];
    expect(JSON.parse(first!.text).status).toBe("lost");
    const policy = await client.readResource({ uri: "paperleaf://policy" });
    const [contents] = policy.contents as { text: string }[];
    expect(JSON.parse(contents!.text).refund_window_days).toBe(30);
    await client.close();
  });
});

describe("12 Agent SDK", () => {
  const preToolUse = (file_path: string) => ({
    hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path },
    session_id: "s", transcript_path: "t", cwd: ".",
  });

  it("hook denies secret files and allows the rest", async () => {
    const signal = new AbortController().signal;
    const denied = await blockSecrets(preToolUse("/app/.env") as never, "id", { signal });
    const allowed = await blockSecrets(preToolUse("/app/main.ts") as never, "id", { signal });
    expect(JSON.stringify(denied)).toContain('"permissionDecision":"deny"');
    expect(allowed).toEqual({});
  });

  it("options are read-only and bounded", () => {
    const options = buildOptions(".");
    expect(options.disallowedTools).toEqual(expect.arrayContaining(["Write", "Edit", "Bash"]));
    expect(options.maxBudgetUsd).toBe(1);
    expect(Object.keys(options.agents ?? {})).toEqual(["test-reviewer"]);
  });
});
