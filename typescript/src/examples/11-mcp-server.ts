// © 2026 Riadh MNASRI. MIT License.
// 11. An MCP server: expose your tools once, use them from any MCP client.
//
// The bookshop's read-only tools plus the refund policy as a resource. Refunds
// are deliberately NOT exposed: give a client only the capabilities it needs.
//
// Run (stdio): npx tsx src/examples/11-mcp-server.ts
// Register in Claude Code: claude mcp add paperleaf -- npx tsx typescript/src/examples/11-mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Bookshop } from "../core/bookshop.js";
import { isMain } from "../core/config.js";

const asText = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });

export function createServer(shop = new Bookshop()): McpServer {
  const server = new McpServer(
    { name: "paperleaf", version: "0.1.0" },
    { instructions: "Read-only access to the Paperleaf Books shop." },
  );

  server.registerTool("get_order", {
    description: "Look up an order by id (format ORD-1234): status, items, dates, total.",
    inputSchema: { order_id: z.string() },
    annotations: { readOnlyHint: true },
  }, async ({ order_id }) => asText(shop.getOrder(order_id) ?? `No order ${order_id}`));

  server.registerTool("search_catalog", {
    description: "Search books by title, author or topic keywords. Stock 0 means out of stock.",
    inputSchema: { query: z.string(), max_results: z.number().int().min(1).max(10).optional() },
    annotations: { readOnlyHint: true },
  }, async ({ query, max_results }) => asText(shop.searchCatalog(query, max_results ?? 5)));

  server.registerTool("check_refund_eligibility", {
    description: "Check if an order can be refunded under the shop policy, and up to which amount.",
    inputSchema: { order_id: z.string() },
    annotations: { readOnlyHint: true },
  }, async ({ order_id }) => asText(shop.refundEligibility(order_id)));

  server.registerResource("refund-policy", "paperleaf://policy", {
    description: "The shop's refund and shipping policy.",
    mimeType: "application/json",
  }, async (uri) => ({ contents: [{ uri: uri.href, text: JSON.stringify(shop.policy) }] }));

  return server;
}

if (isMain(import.meta.url)) {
  await createServer().connect(new StdioServerTransport());
}
