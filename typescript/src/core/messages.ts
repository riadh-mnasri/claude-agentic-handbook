// © 2026 Riadh MNASRI. MIT License.
// Small helpers to read Claude responses without repeating the same loops.
import type Anthropic from "@anthropic-ai/sdk";

export class RefusalError extends Error {}

/** Fail loudly on the stop reasons that make the content unusable. */
export function checkStop(message: Anthropic.Message): void {
  if (message.stop_reason === "refusal") {
    throw new RefusalError(`Claude declined the request: ${JSON.stringify(message.stop_details)}`);
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Response truncated by max_tokens: raise the limit or stream");
  }
}

export function textOf(message: Anthropic.Message): string {
  checkStop(message);
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/** Parse a response produced with a JSON schema output format. */
export function jsonOf<T>(message: Anthropic.Message): T {
  return JSON.parse(textOf(message)) as T;
}

/** Build the `output_config` that constrains the answer to a JSON schema. */
export function jsonOutput(schema: Record<string, unknown>): Anthropic.OutputConfig {
  return { format: { type: "json_schema", schema } };
}

export function toolUses(message: Anthropic.Message): Anthropic.ToolUseBlock[] {
  return message.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
}
