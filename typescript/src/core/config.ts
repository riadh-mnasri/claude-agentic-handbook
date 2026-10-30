// © 2026 Riadh MNASRI. MIT License.
// Model choices and client factory, in one place so every example agrees.
import Anthropic from "@anthropic-ai/sdk";

/** Main model: planning, agent loops, anything that needs judgment. */
export const MODEL = process.env.HANDBOOK_MODEL ?? "claude-opus-5-5";
/** Cheaper model for high-volume, narrow sub-tasks (routing, workers, judges). */
export const FAST_MODEL = process.env.HANDBOOK_FAST_MODEL ?? "claude-haiku-5-5";

/**
 * The only part of the SDK the examples depend on. The real client satisfies it,
 * and so does the scripted fake used by the tests.
 */
export interface LlmClient {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

/** Real client. Reads ANTHROPIC_API_KEY (or an `ant auth login` profile). */
export function makeClient(): LlmClient {
  return new Anthropic();
}

/** True when the module is the script started with `tsx file.ts`. */
export function isMain(importMetaUrl: string): boolean {
  return process.argv[1] !== undefined && importMetaUrl.endsWith(process.argv[1].replace(/\\/g, "/"));
}
