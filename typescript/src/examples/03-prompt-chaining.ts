// © 2026 Riadh MNASRI. MIT License.
// 03. Prompt chaining: split a task into fixed steps, with a gate in between.
//
// Steps: extract facts -> gate (code) -> draft reply -> gate (code) -> polish.
// The gates are plain code: they stop the chain early instead of letting an
// error flow into the final answer.
//
// Run: npx tsx src/examples/03-prompt-chaining.ts
import { Bookshop } from "../core/bookshop.js";
import { FAST_MODEL, isMain, makeClient, MODEL, type LlmClient } from "../core/config.js";
import { jsonOf, jsonOutput, textOf } from "../core/messages.js";

interface Facts { order_id: string | null; customer_request: string; tone: "calm" | "annoyed" | "angry" }

const FACTS_SCHEMA = {
  type: "object",
  properties: {
    order_id: { type: ["string", "null"] },
    customer_request: { type: "string" },
    tone: { type: "string", enum: ["calm", "annoyed", "angry"] },
  },
  required: ["order_id", "customer_request", "tone"],
  additionalProperties: false,
};

export class GateFailed extends Error {}

export async function replyTo(client: LlmClient, ticket: string, shop = new Bookshop()): Promise<string> {
  // Step 1: extraction, small model, strict schema.
  const facts = jsonOf<Facts>(await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: `Extract the facts of this ticket:\n<ticket>${ticket}</ticket>` }],
    output_config: jsonOutput(FACTS_SCHEMA),
  }));

  // Gate 1: deterministic check, no model involved.
  const order = facts.order_id ? shop.getOrder(facts.order_id) : undefined;
  if (facts.order_id && !order) throw new GateFailed(`Ticket mentions unknown order ${facts.order_id}`);

  // Step 2: draft, with the verified data injected.
  const draft = textOf(await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: "You write replies for Paperleaf Books support. Use only the facts given.",
    messages: [{
      role: "user",
      content:
        `Customer request: ${facts.customer_request}\nCustomer tone: ${facts.tone}\n` +
        `Order data: ${JSON.stringify(order ?? null)}\n` +
        "Write a reply of at most 120 words. Mention the order id if there is one.",
    }],
  }));

  // Gate 2: the draft must reference the order and stay short.
  if (order && !draft.includes(order.id)) throw new GateFailed("Draft does not mention the order id");
  if (draft.split(/\s+/).length > 160) throw new GateFailed("Draft too long");

  // Step 3: polish, a narrow rewrite task for the small model.
  return textOf(await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Fix grammar and make this reply warmer without adding facts. Return only the reply.\n<reply>${draft}</reply>`,
    }],
  }));
}

if (isMain(import.meta.url)) {
  console.log(await replyTo(makeClient(), "Where is my order ORD-1002?? It's been days, this is ridiculous."));
}
