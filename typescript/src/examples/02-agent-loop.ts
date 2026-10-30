// © 2026 Riadh MNASRI. MIT License.
// 02. The agent loop, written by hand.
//
// An agent is a loop: call the model with tools, run the tools it asks for,
// send the results back, stop when it answers without asking for a tool.
//
// Run: npx tsx src/examples/02-agent-loop.ts "What is the status of ORD-1003?"
import type Anthropic from "@anthropic-ai/sdk";
import { Bookshop, GET_ORDER, SEARCH_CATALOG } from "../core/bookshop.js";
import { isMain, makeClient, MODEL, type LlmClient } from "../core/config.js";

const SYSTEM = `You are the customer support assistant of Paperleaf Books.
Use the tools to check facts before answering. Never invent an order status,
a price or a stock level. Answer in the customer's language, briefly.`;

function runTool(shop: Bookshop, name: string, args: Record<string, unknown>): string {
  if (name === "get_order") {
    if (typeof args.order_id !== "string") throw new Error("order_id is required");
    const order = shop.getOrder(args.order_id);
    return order ? JSON.stringify(order) : `No order ${args.order_id}`;
  }
  if (name === "search_catalog") {
    return JSON.stringify(shop.searchCatalog(String(args.query), Number(args.max_results ?? 5)));
  }
  throw new Error(`Unknown tool ${name}`);
}

export async function answer(client: LlmClient, question: string, shop = new Bookshop(), maxTurns = 8) {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];
  for (let turn = 0; turn < maxTurns; turn++) { // always bound the loop
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      tools: [GET_ORDER, SEARCH_CATALOG],
      messages,
    });
    // Keep the whole assistant content: the tool_use ids must come back.
    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason !== "tool_use") {
      return response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    }

    // Claude may ask for several tools at once: answer all of them in ONE message.
    const results: Anthropic.ToolResultBlockParam[] = response.content
      .filter((b) => b.type === "tool_use")
      .map((block) => {
        try {
          const output = runTool(shop, block.name, block.input as Record<string, unknown>);
          return { type: "tool_result", tool_use_id: block.id, content: output };
        } catch (e) {
          // Errors go back to the model, which can retry or ask the user.
          return { type: "tool_result", tool_use_id: block.id, content: String(e), is_error: true };
        }
      });
    messages.push({ role: "user", content: results });
  }
  throw new Error(`No answer after ${maxTurns} turns`);
}

if (isMain(import.meta.url)) {
  const question = process.argv.slice(2).join(" ") || "Where is ORD-1003, and do you have books on AI evals?";
  console.log(await answer(makeClient(), question));
}
