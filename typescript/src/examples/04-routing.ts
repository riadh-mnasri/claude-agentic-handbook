// © 2026 Riadh MNASRI. MIT License.
// 04. Routing: classify first, then send the input to a specialised handler.
//
// Each route gets its own prompt and model: simple FAQ on the small model,
// money questions on the main model.
//
// Run: npx tsx src/examples/04-routing.ts "Can I change my email address?"
import { FAST_MODEL, isMain, makeClient, MODEL, type LlmClient } from "../core/config.js";
import { textOf } from "../core/messages.js";
import { triage, type Triage } from "./01-augmented-llm.js";

interface Route { model: string; system: string }

export const ROUTES: Record<Triage["category"], Route> = {
  billing: { model: MODEL, system: "You handle billing issues. Be precise about amounts. Never promise a refund: say a specialist will confirm within 24 hours." },
  refund: { model: MODEL, system: "You handle refund requests. Explain the 30-day refund policy and the next step. Never confirm a refund yourself." },
  shipping: { model: FAST_MODEL, system: "You handle delivery questions. Give the standard delays: 2-4 working days in France, 5-8 in the EU." },
  product: { model: FAST_MODEL, system: "You recommend books from Paperleaf's catalog. Be enthusiastic, short." },
  account: { model: FAST_MODEL, system: "You help with account settings. Account changes are done in Settings > Profile. Password resets expire after 1 hour." },
  other: { model: FAST_MODEL, system: "You answer politely and briefly." },
};

export async function handle(client: LlmClient, ticket: string): Promise<{ category: string; reply: string }> {
  const { category } = await triage(client, ticket);
  const route = ROUTES[category] ?? ROUTES.other;
  const reply = textOf(await client.messages.create({
    model: route.model,
    max_tokens: 2000,
    system: route.system,
    messages: [{ role: "user", content: ticket }],
  }));
  return { category, reply };
}

if (isMain(import.meta.url)) {
  const { category, reply } = await handle(makeClient(), process.argv.slice(2).join(" ") || "How do I change my email?");
  console.log(`[route: ${category}]\n${reply}`);
}
