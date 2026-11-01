import { describe, expect, it } from "vitest";
import { bookshopTools } from "../src/examples/13-tool-runner.js";
import { run, type SessionsApi } from "../src/examples/14-managed-agents.js";

describe("13 Tool Runner", () => {
  it("turns zod schemas into tool definitions and runs them", async () => {
    // Given
    const { getOrder, searchCatalog } = bookshopTools();
    // Then the schema sent to Claude comes from zod
    const definition = JSON.parse(JSON.stringify(searchCatalog)) as { name: string; input_schema: { required: string[] } };
    expect(definition.name).toBe("search_catalog");
    expect(definition.input_schema.required).toEqual(["query"]);
    // And the run function answers with the shop data
    expect(String(await getOrder.run({ order_id: "ORD-1003" }))).toContain('"status":"lost"');
  });
});

function fakeSessions(events: unknown[]) {
  const log: string[] = [];
  const sent: any[] = [];
  const client: SessionsApi = {
    beta: {
      sessions: {
        create: async (params) => { log.push(`session ${params.agent.version}`); return { id: "sesn_1" }; },
        events: {
          stream: async () => {
            log.push("stream");
            return (async function* () { yield* events; })();
          },
          send: async (_id, params) => { log.push(`send ${params.events[0].type}`); sent.push(...params.events); return {}; },
        },
      },
    },
  };
  return { client, log, sent };
}

describe("14 Managed Agents", () => {
  it("pins the version and opens the stream before sending", async () => {
    const { client, log } = fakeSessions([
      { type: "agent.message", content: [{ type: "text", text: "2 refundable orders, 158 EUR." }] },
      { type: "session.status_idle", stop_reason: { type: "end_turn" } },
      { type: "agent.message", content: [{ type: "text", text: "never read" }] },
    ]);
    expect(await run(client, "agent_1", 3, "env_1", "task")).toBe("2 refundable orders, 158 EUR.");
    expect(log).toEqual(["session 3", "stream", "send user.message"]);
  });

  it("denies paused tool calls when nobody watches", async () => {
    const { client, sent } = fakeSessions([
      { type: "agent.tool_use", id: "tu_1", evaluated_permission: "ask" },
      { type: "session.status_idle", stop_reason: { type: "requires_action" } },
      { type: "agent.message", content: [{ type: "text", text: "Done without it." }] },
      { type: "session.status_idle", stop_reason: { type: "end_turn" } },
    ]);
    expect(await run(client, "agent_1", 1, "env_1", "task")).toBe("Done without it.");
    expect(sent.at(-1)).toEqual({ type: "user.tool_confirmation", tool_use_id: "tu_1", result: "deny" });
  });
});
