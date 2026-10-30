// © 2026 Riadh MNASRI. MIT License.
// A reusable, hardened agent loop. Example 02 shows the bare loop; this version
// adds what you need before real users touch it: a permission policy per tool,
// human approval for risky tools, untrusted-data wrapping, a turn limit,
// repeated-call detection, refusal handling and a token tally.
import type Anthropic from "@anthropic-ai/sdk";
import { MODEL, type LlmClient } from "./config.js";
import { RefusalError, checkStop } from "./messages.js";

export type ToolInput = Record<string, unknown>;
export type Approver = (name: string, input: ToolInput) => boolean | Promise<boolean>;

export interface Tool {
  definition: Anthropic.Tool;
  handler: (input: ToolInput) => unknown | Promise<unknown>;
  /** "allow": runs directly. "ask": a human approves each call. "deny": never runs. */
  permission?: "allow" | "ask" | "deny";
  /** Results that may contain text written by third parties (customers, web pages...). */
  untrustedOutput?: boolean;
}

export interface AgentResult {
  text: string;
  turns: number;
  messages: Anthropic.MessageParam[];
  toolCalls: { name: string; input: ToolInput }[];
  inputTokens: number;
  outputTokens: number;
}

export class AgentStuck extends Error {}

export const denyAll: Approver = () => false;

export interface AgentOptions {
  system: string;
  prompt: string;
  tools: Tool[];
  model?: string;
  maxTurns?: number;
  maxIdenticalCalls?: number;
  approve?: Approver;
  onEvent?: (event: string) => void;
}

export async function runAgent(client: LlmClient, options: AgentOptions): Promise<AgentResult> {
  const { system, prompt, tools, model = MODEL, maxTurns = 10, maxIdenticalCalls = 2 } = options;
  const approve = options.approve ?? denyAll;
  const onEvent = options.onEvent ?? (() => {});
  const byName = new Map(tools.map((t) => [t.definition.name, t]));
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  const result: AgentResult = { text: "", turns: 0, messages, toolCalls: [], inputTokens: 0, outputTokens: 0 };
  const seen = new Map<string, number>();

  for (let turn = 1; turn <= maxTurns; turn++) {
    const response = await client.messages.create({
      model,
      max_tokens: 16000,
      cache_control: { type: "ephemeral" }, // cache the stable prefix (tools + system)
      system,
      tools: tools.map((t) => t.definition),
      messages,
    });
    result.turns = turn;
    result.inputTokens += response.usage.input_tokens;
    result.outputTokens += response.usage.output_tokens;
    if (response.stop_reason === "refusal") throw new RefusalError(JSON.stringify(response.stop_details));
    // Append the full content (not just text): tool_use ids must round-trip.
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      checkStop(response);
      result.text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      return result;
    }

    // All results of one turn go back in a single user message.
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of response.content) {
      if (call.type !== "tool_use") continue;
      const input = call.input as ToolInput;
      result.toolCalls.push({ name: call.name, input });
      onEvent(`tool ${call.name} ${JSON.stringify(input)}`);
      const key = call.name + JSON.stringify(input, Object.keys(input).sort());
      seen.set(key, (seen.get(key) ?? 0) + 1);
      results.push(await execute(byName, call, input, seen.get(key)! > maxIdenticalCalls, approve, onEvent));
    }
    messages.push({ role: "user", content: results });
  }
  throw new AgentStuck(`No final answer after ${maxTurns} turns`);
}

async function execute(
  byName: Map<string, Tool>,
  call: Anthropic.ToolUseBlock,
  input: ToolInput,
  repeated: boolean,
  approve: Approver,
  onEvent: (event: string) => void,
): Promise<Anthropic.ToolResultBlockParam> {
  const error = (text: string): Anthropic.ToolResultBlockParam => {
    onEvent(`  -> error: ${text}`);
    return { type: "tool_result", tool_use_id: call.id, content: text, is_error: true };
  };
  const tool = byName.get(call.name);
  if (!tool) return error(`Unknown tool ${call.name}`);
  if (repeated) return error("Same call already made twice. Use the previous result or change approach.");
  if (tool.permission === "deny") return error(`Tool ${call.name} is disabled by policy`);
  if (tool.permission === "ask" && !(await approve(call.name, input))) {
    return error("A human reviewer rejected this action. Explain it to the customer.");
  }
  let output: unknown;
  try {
    output = await tool.handler(input);
  } catch (e) {
    // Errors are information for the model: send them back, do not crash.
    return error(e instanceof Error ? e.message : String(e));
  }
  let content = typeof output === "string" ? output : JSON.stringify(output);
  if (tool.untrustedOutput) content = `<untrusted_data>\n${content}\n</untrusted_data>`;
  return { type: "tool_result", tool_use_id: call.id, content };
}
