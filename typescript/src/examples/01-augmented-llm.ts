// © 2026 Riadh MNASRI. MIT License.
// 01. The augmented LLM: one call, a clear instruction, a guaranteed JSON shape.
//
// Before building an agent, check that a single well-specified call is not
// enough. The JSON schema output format guarantees we can parse the answer.
//
// Run: npx tsx src/examples/01-augmented-llm.ts "My parcel ORD-1002 is late"
import { FAST_MODEL, isMain, makeClient, type LlmClient } from "../core/config.js";
import { jsonOf, jsonOutput } from "../core/messages.js";

export const CATEGORIES = ["billing", "shipping", "refund", "product", "account", "other"] as const;

export interface Triage {
  category: (typeof CATEGORIES)[number];
  urgency: "low" | "medium" | "high";
  order_id: string | null;
  summary: string;
}

export const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: CATEGORIES },
    urgency: { type: "string", enum: ["low", "medium", "high"] },
    order_id: { type: ["string", "null"], description: "ORD-xxxx if mentioned" },
    summary: { type: "string", description: "One sentence, in English" },
  },
  required: ["category", "urgency", "order_id", "summary"],
  additionalProperties: false,
};

const SYSTEM = `You triage customer support tickets for Paperleaf Books, an online bookshop.
Urgency is high when money was taken wrongly, a parcel is lost or a deadline is today;
medium when the customer is blocked or waiting; low for questions and feedback.`;

export async function triage(client: LlmClient, ticket: string): Promise<Triage> {
  const response = await client.messages.create({
    model: FAST_MODEL, // narrow, high-volume task: the small model is enough
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: `<ticket>\n${ticket}\n</ticket>` }],
    output_config: jsonOutput(TRIAGE_SCHEMA),
  });
  return jsonOf<Triage>(response);
}

if (isMain(import.meta.url)) {
  const ticket = process.argv.slice(2).join(" ") || "I was charged twice for ORD-1001, please fix it.";
  console.log(await triage(makeClient(), ticket));
}
