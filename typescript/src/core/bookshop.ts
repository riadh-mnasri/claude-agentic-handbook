// © 2026 Riadh MNASRI. MIT License.
// The fictional Paperleaf bookshop used by every example.
// Business rules live here, in code, never only in a prompt: the model can be
// talked into anything, the code cannot.
import type Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Book { isbn: string; title: string; author: string; price: number; stock: number; tags: string[] }
export interface Order {
  id: string; customer: string; status: string; placed_on: string; delivered_on: string | null;
  items: { isbn: string; qty: number }[]; total: number; gift_message: string | null;
}
export interface Policy { currency: string; refund_window_days: number; auto_refund_limit: number; refundable_statuses: string[] }
export interface ShopData { shop: string; reference_date: string; policy: Policy; catalog: Book[]; orders: Order[] }
export interface Refund { refund_id: string; order_id: string; amount: number; reason: string }
export type Eligibility =
  | { eligible: false; reason: string }
  | { eligible: true; max_amount: number; needs_human_approval: boolean };

export function sharedDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "shared", "bookshop.json"))) return join(dir, "shared");
    dir = dirname(dir);
  }
  throw new Error("shared/bookshop.json not found");
}

const DAY_MS = 24 * 60 * 60 * 1000;

export class Bookshop {
  readonly refunds: Refund[] = [];

  constructor(readonly data: ShopData = JSON.parse(readFileSync(join(sharedDir(), "bookshop.json"), "utf8"))) {}

  get policy(): Policy {
    return this.data.policy;
  }

  getOrder(orderId: string): Order | undefined {
    return this.data.orders.find((o) => o.id === orderId.toUpperCase());
  }

  searchCatalog(query: string, maxResults = 5): Book[] {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const score = (b: Book) => {
      const haystack = [b.title, b.author, ...b.tags].join(" ").toLowerCase();
      return words.filter((w) => haystack.includes(w)).length;
    };
    return [...this.data.catalog]
      .sort((a, b) => score(b) - score(a))
      .filter((b) => score(b) > 0)
      .slice(0, maxResults);
  }

  refundEligibility(orderId: string): Eligibility {
    const order = this.getOrder(orderId);
    if (!order) return { eligible: false, reason: `Unknown order ${orderId}` };
    if (!this.policy.refundable_statuses.includes(order.status)) {
      return { eligible: false, reason: `Order is ${order.status}, not refundable yet` };
    }
    const days = (Date.parse(this.data.reference_date) - Date.parse(order.delivered_on ?? order.placed_on)) / DAY_MS;
    if (days > this.policy.refund_window_days) return { eligible: false, reason: "Outside the refund window" };
    const already = this.refunds.filter((r) => r.order_id === order.id).reduce((sum, r) => sum + r.amount, 0);
    return {
      eligible: true,
      max_amount: order.total - already,
      needs_human_approval: order.total > this.policy.auto_refund_limit,
    };
  }

  issueRefund(orderId: string, amount: number, reason: string): Refund {
    const check = this.refundEligibility(orderId);
    if (!check.eligible) throw new Error(check.reason);
    if (amount <= 0 || amount > check.max_amount) {
      throw new Error(`Amount must be between 0 and ${check.max_amount}`);
    }
    const refund = {
      refund_id: `RF-${String(this.refunds.length + 1).padStart(4, "0")}`,
      order_id: orderId.toUpperCase(),
      amount,
      reason,
    };
    this.refunds.push(refund);
    return refund;
  }
}

// Tool definitions. Descriptions are prompts: say what, when, and what comes back.
export const GET_ORDER: Anthropic.Tool = {
  name: "get_order",
  description:
    "Look up one order by its id (format ORD-1234). Returns status, items, dates, total and the " +
    "customer's gift message. Use it before answering any question about a specific order.",
  input_schema: {
    type: "object",
    properties: { order_id: { type: "string", description: "Order id, e.g. ORD-1001" } },
    required: ["order_id"],
    additionalProperties: false,
  },
};

export const SEARCH_CATALOG: Anthropic.Tool = {
  name: "search_catalog",
  description:
    "Search the book catalog by keywords (title, author or topic). Returns up to max_results books " +
    "with price and stock. Stock 0 means out of stock.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Keywords, e.g. 'ai evals beginners'" },
      max_results: { type: "integer", minimum: 1, maximum: 10 },
    },
    required: ["query"],
    additionalProperties: false,
  },
};

export const CHECK_REFUND: Anthropic.Tool = {
  name: "check_refund_eligibility",
  description:
    "Check whether an order can be refunded under the shop policy and the maximum refundable " +
    "amount. Always call it before issue_refund.",
  input_schema: {
    type: "object",
    properties: { order_id: { type: "string" } },
    required: ["order_id"],
    additionalProperties: false,
  },
};

export const ISSUE_REFUND: Anthropic.Tool = {
  name: "issue_refund",
  description:
    "Refund an amount in EUR on an eligible order. Irreversible: only call it when the customer " +
    "asked for a refund and eligibility was checked.",
  input_schema: {
    type: "object",
    properties: {
      order_id: { type: "string" },
      amount: { type: "number", description: "Amount in EUR" },
      reason: { type: "string", description: "Short reason shown to the customer" },
    },
    required: ["order_id", "amount", "reason"],
    additionalProperties: false,
  },
};
