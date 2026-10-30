// © 2026 Riadh MNASRI. MIT License.
// 09. Context engineering: caching, compaction and long-term memory.
//
// - Prompt caching: the stable prefix (system prompt) is cached; later turns pay
//   about a tenth of the price for it. Check usage.cache_read_input_tokens.
//   Prefixes below the model's minimum (a few thousand tokens) are not cached:
//   the short handbook below shows the placement, a real one would be longer.
// - Compaction: when the history grows, older turns are replaced by a summary.
// - Memory: durable facts go to a store the agent reads and writes through tools.
//
// Run: npx tsx src/examples/09-context-memory.ts
import type Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { FAST_MODEL, isMain, makeClient, MODEL, type LlmClient } from "../core/config.js";
import { runAgent, type Tool } from "../core/loop.js";
import { textOf } from "../core/messages.js";

export const POLICY_HANDBOOK = `You are the support assistant of Paperleaf Books.
Refunds: 30 days after delivery, or when a parcel is lost.
Shipping: 2-4 working days in France, 5-8 in the EU. Free above 35 EUR.
Tone: warm, brief, no jargon.`;

/** A multi-turn conversation that caches its prefix and compacts its history. */
export class SupportSession {
  summary = "";
  history: { role: "user" | "assistant"; content: string }[] = [];
  cacheReads = 0;

  constructor(private readonly client: LlmClient, private readonly maxMessages = 8, private readonly keepLast = 4) {}

  async send(text: string): Promise<string> {
    this.history.push({ role: "user", content: text });
    const system: Anthropic.TextBlockParam[] = [
      { type: "text", text: POLICY_HANDBOOK, cache_control: { type: "ephemeral" } },
    ];
    if (this.summary) {
      // Volatile content goes after the cached block, never before it.
      system.push({ type: "text", text: `Summary of the conversation so far:\n${this.summary}` });
    }
    const response = await this.client.messages.create({
      model: MODEL, max_tokens: 4000, system, messages: [...this.history],
    });
    this.cacheReads += response.usage.cache_read_input_tokens ?? 0;
    const reply = textOf(response);
    this.history.push({ role: "assistant", content: reply });
    if (this.history.length > this.maxMessages) await this.compact();
    return reply;
  }

  private async compact(): Promise<void> {
    const old = this.history.slice(0, -this.keepLast);
    const transcript = old.map((m) => `${m.role}: ${m.content}`).join("\n");
    this.summary = textOf(await this.client.messages.create({
      model: FAST_MODEL,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content:
          `Previous summary:\n${this.summary || "(none)"}\n\nNew turns:\n${transcript}\n\n` +
          "Update the summary. Keep order ids, amounts, promises made and open questions. " +
          "Drop small talk. Max 120 words.",
      }],
    }));
    this.history = this.history.slice(-this.keepLast); // starts with a user message: keepLast is even
  }
}

/** Long-term memory: a JSON file of notes per customer, exposed as tools. */
export class MemoryNotes {
  constructor(private readonly path: string) {}

  private load(): Record<string, string[]> {
    return existsSync(this.path) ? JSON.parse(readFileSync(this.path, "utf8")) : {};
  }

  remember(customer: string, note: string): string {
    const notes = this.load();
    (notes[customer] ??= []).push(note);
    writeFileSync(this.path, JSON.stringify(notes, null, 2));
    return "saved";
  }

  recall(customer: string): string[] {
    return this.load()[customer] ?? [];
  }

  tools(): Tool[] {
    const customer = { type: "string", description: "Customer email" };
    return [
      {
        definition: {
          name: "recall_notes",
          description: "Read what we know about a customer from past conversations. Call it at the start of a conversation.",
          input_schema: { type: "object", properties: { customer }, required: ["customer"], additionalProperties: false },
        },
        handler: (a) => this.recall(String(a.customer)),
      },
      {
        definition: {
          name: "remember_note",
          description: "Save a durable fact about a customer (preference, recurring issue). Not for one-off details.",
          input_schema: {
            type: "object",
            properties: { customer, note: { type: "string" } },
            required: ["customer", "note"],
            additionalProperties: false,
          },
        },
        handler: (a) => this.remember(String(a.customer), String(a.note)),
      },
    ];
  }
}

export async function rememberingAgent(client: LlmClient, customer: string, message: string, notes: MemoryNotes) {
  const result = await runAgent(client, {
    system: POLICY_HANDBOOK, tools: notes.tools(), prompt: `Customer ${customer} writes: ${message}`,
  });
  return result.text;
}

if (isMain(import.meta.url)) {
  const client = makeClient();
  const session = new SupportSession(client);
  for (const question of [
    "Hi! How long does shipping to Spain take?", "And is it free for 30 EUR?", "OK. What if my parcel gets lost?",
    "Thanks. Remind me the delays for France?", "Perfect, last one: refund window after delivery?",
  ]) {
    console.log(`> ${question}\n${await session.send(question)}\n`);
  }
  console.log(`cached tokens read: ${session.cacheReads}, summary: ${session.summary}`);
  console.log(await rememberingAgent(client, "alice@example.com", "I only read e-books from now on.", new MemoryNotes(".memory.json")));
}
