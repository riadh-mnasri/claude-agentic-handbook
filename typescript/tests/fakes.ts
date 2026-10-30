// © 2026 Riadh MNASRI. MIT License.
// A scripted stand-in for the Anthropic client, so every example runs offline.
// Each test decides what "Claude" answers; the code under test is unchanged.
import type Anthropic from "@anthropic-ai/sdk";
import type { LlmClient } from "../src/core/config.js";

let nextId = 1;
type Params = Anthropic.MessageCreateParamsNonStreaming;

export function message(content: unknown[], stopReason: Anthropic.StopReason = "end_turn", cacheRead = 0): Anthropic.Message {
  return {
    id: `msg_${nextId++}`, type: "message", role: "assistant", model: "fake",
    content, stop_reason: stopReason, stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: cacheRead, cache_creation_input_tokens: 0 },
  } as Anthropic.Message;
}

export const text = (value: string, cacheRead = 0) => message([{ type: "text", text: value, citations: null }], "end_turn", cacheRead);
export const asJson = (value: unknown) => text(JSON.stringify(value));
export const refusal = () => message([], "refusal");
export const tools = (...calls: [string, Record<string, unknown>][]) =>
  message(calls.map(([name, input]) => ({ type: "tool_use", id: `toolu_${nextId++}`, name, input })), "tool_use");

export class FakeClient implements LlmClient {
  readonly calls: Params[] = [];
  private readonly script: Anthropic.Message[] | undefined;
  private readonly responder: ((p: Params) => Anthropic.Message) | undefined;

  constructor(script: Anthropic.Message[] | ((p: Params) => Anthropic.Message)) {
    if (Array.isArray(script)) this.script = [...script];
    else this.responder = script;
  }

  messages = {
    create: async (params: Params): Promise<Anthropic.Message> => {
      // Snapshot the messages: the caller keeps mutating its array.
      this.calls.push({ ...params, messages: [...params.messages] });
      if (this.responder) return this.responder(params);
      const next = this.script?.shift();
      if (!next) throw new Error("Unexpected extra call");
      return next;
    },
  };
}

/** Text of the last user message of a request, to route fake answers. */
export function promptOf(params: Params): string {
  const content = params.messages.at(-1)!.content;
  return typeof content === "string" ? content : JSON.stringify(content);
}

/** Content of the tool results sent in the last user message of a call. */
export function toolResults(params: Params): Anthropic.ToolResultBlockParam[] {
  return params.messages.at(-1)!.content as Anthropic.ToolResultBlockParam[];
}
