// © 2026 Riadh MNASRI. MIT License.
// 13. The Tool Runner: the same agent as example 02, without writing the loop.
//
// betaZodTool turns a Zod schema plus a run function into a tool: the schema
// becomes the JSON schema sent to Claude and validates the input before run().
// The SDK drives the request, execute, send back cycle; you still see every turn.
//
// Run: npx tsx src/examples/13-tool-runner.ts "Where is ORD-1003?"
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { Bookshop } from "../core/bookshop.js";
import { isMain, MODEL } from "../core/config.js";

export function bookshopTools(shop = new Bookshop()) {
  return {
    getOrder: betaZodTool({
      name: "get_order",
      description: "Look up one order: status, items, dates, total. Use it before answering about an order.",
      inputSchema: z.object({ order_id: z.string().describe("Order id, format ORD-1234") }),
      run: async ({ order_id }) => JSON.stringify(shop.getOrder(order_id) ?? `No order ${order_id}`),
    }),
    searchCatalog: betaZodTool({
      name: "search_catalog",
      description: "Search the book catalog by keywords. Stock 0 means out of stock.",
      inputSchema: z.object({
        query: z.string().describe("Keywords about title, author or topic"),
        max_results: z.number().int().min(1).max(10).optional(),
      }),
      run: async ({ query, max_results }) => JSON.stringify(shop.searchCatalog(query, max_results ?? 5)),
    }),
  };
}

export async function answer(client: Anthropic, question: string): Promise<string> {
  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    system: "You are the support assistant of Paperleaf Books. Check facts with the tools.",
    tools: Object.values(bookshopTools()),
    messages: [{ role: "user", content: question }],
    max_iterations: 8, // the runner's turn limit
  });
  for await (const message of runner) { // one iteration per model turn: log, inspect, stop early...
    const calls = message.content.flatMap((b) => (b.type === "tool_use" ? [b.name] : []));
    if (calls.length) console.error(`[turn] tools: ${calls.join(", ")}`);
  }
  const final = await runner.done();
  return final.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
}

if (isMain(import.meta.url)) {
  console.log(await answer(new Anthropic(), process.argv.slice(2).join(" ") || "Where is ORD-1003?"));
}
