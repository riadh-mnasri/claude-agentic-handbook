// © 2026 Riadh MNASRI. MIT License.
// 14. Claude Managed Agents: Anthropic runs the loop and a sandbox per session.
//
// Two phases, never mixed:
// - setup (once): create the environment and the versioned agent, store the ids;
// - run (every time): create a session pinned to an agent version, open the
//   event stream FIRST, then send the task, and read events until the agent is idle.
// With the "auto" permission policy a tool call can pause for a decision
// (evaluated_permission === "ask"): always answer it, "deny" when nobody watches.
//
// Beta API. Needs ANTHROPIC_API_KEY.
// Run: npx tsx src/examples/14-managed-agents.ts setup   # prints the ids to export
//      HANDBOOK_AGENT_ID=... HANDBOOK_AGENT_VERSION=... HANDBOOK_ENV_ID=... npx tsx src/examples/14-managed-agents.ts run
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sharedDir } from "../core/bookshop.js";
import { isMain, MODEL } from "../core/config.js";

const SYSTEM = `You are a data analyst for Paperleaf Books. You work in your sandbox:
write and run Python to answer, and show the numbers you computed.`;

export async function setup(client: Anthropic): Promise<Record<string, string>> {
  const environment = await client.beta.environments.create({
    name: "paperleaf-analysis",
    // Limited networking: the sandbox can install packages, nothing else.
    config: { type: "cloud", networking: { type: "limited", allow_package_managers: true } },
  });
  const agent = await client.beta.agents.create({
    name: "Paperleaf analyst",
    model: MODEL,
    system: SYSTEM,
    tools: [{
      type: "agent_toolset_20260401", // bash, files, code in the sandbox
      default_config: { enabled: true, permission_policy: { type: "auto" } },
      // This job needs no web access: turn the web tools off.
      configs: [{ name: "web_fetch", enabled: false }, { name: "web_search", enabled: false }],
    }],
  });
  return { HANDBOOK_ENV_ID: environment.id, HANDBOOK_AGENT_ID: agent.id, HANDBOOK_AGENT_VERSION: String(agent.version) };
}

/** The slice of the SDK this example uses, so a test can stand in for it. */
export interface SessionsApi {
  beta: {
    sessions: {
      create(params: { agent: { type: "agent"; id: string; version: number }; environment_id: string; title?: string }): Promise<{ id: string }>;
      events: {
        stream(sessionId: string): Promise<AsyncIterable<any>>;
        send(sessionId: string, params: { events: any[] }): Promise<unknown>;
      };
    };
  };
}

export async function run(
  client: SessionsApi, agentId: string, agentVersion: number, environmentId: string, task: string,
  approve: (event: unknown) => boolean | Promise<boolean> = () => false, // deny when unattended
): Promise<string> {
  const session = await client.beta.sessions.create({
    agent: { type: "agent", id: agentId, version: agentVersion },
    environment_id: environmentId,
    title: "Weekly order analysis",
  });
  // Stream first: events emitted before the stream opens would arrive late, in one batch.
  const stream = await client.beta.sessions.events.stream(session.id);
  await client.beta.sessions.events.send(session.id, {
    events: [{ type: "user.message", content: [{ type: "text", text: task }] }],
  });
  const output: string[] = [];
  for await (const event of stream) {
    if (event.type === "agent.message") {
      for (const block of event.content) if (block.type === "text") output.push(block.text);
    } else if ((event.type === "agent.tool_use" || event.type === "agent.mcp_tool_use") && event.evaluated_permission === "ask") {
      await client.beta.sessions.events.send(session.id, {
        events: [{ type: "user.tool_confirmation", tool_use_id: event.id, result: (await approve(event)) ? "allow" : "deny" }],
      });
    } else if (event.type === "session.status_idle" && event.stop_reason.type !== "requires_action") {
      break;
    } else if (event.type === "session.status_terminated") {
      break;
    }
  }
  return output.join("");
}

if (isMain(import.meta.url)) {
  const client = new Anthropic();
  if (process.argv[2] === "setup") {
    for (const [key, value] of Object.entries(await setup(client))) console.log(`export ${key}=${value}`);
  } else {
    const dataset = readFileSync(join(sharedDir(), "bookshop.json"), "utf8");
    console.log(await run(
      client as unknown as SessionsApi,
      process.env.HANDBOOK_AGENT_ID!, Number(process.env.HANDBOOK_AGENT_VERSION), process.env.HANDBOOK_ENV_ID!,
      `Which orders are refundable today, and what is the total amount at stake?\n\nDataset (JSON):\n${dataset}`,
    ));
  }
}
