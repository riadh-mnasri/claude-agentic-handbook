// © 2026 Riadh MNASRI. MIT License.
// 10. Evals: measure before you change a prompt, a model or a tool.
//
// Two kinds of graders:
// - code-based: exact match against labelled data (fast, cheap, objective);
// - model-based: an LLM judge with an explicit rubric, for open-ended outputs.
// The script exits with a non-zero code below the threshold, so it can gate a CI.
//
// Run: npx tsx src/examples/10-evals.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sharedDir } from "../core/bookshop.js";
import { isMain, makeClient, MODEL, type LlmClient } from "../core/config.js";
import { jsonOf, jsonOutput } from "../core/messages.js";
import { triage } from "./01-augmented-llm.js";

export interface Ticket { id: string; text: string; category: string; urgency: string }
export interface EvalReport {
  total: number;
  categoryAccuracy: number;
  urgencyAccuracy: number;
  failures: { id: string; expected: [string, string]; got: [string, string] }[];
}

export function loadTickets(): Ticket[] {
  return readFileSync(join(sharedDir(), "evals", "tickets.jsonl"), "utf8")
    .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Ticket);
}

export async function evalTriage(client: LlmClient, tickets: Ticket[]): Promise<EvalReport> {
  const predictions = await Promise.all(tickets.map((t) => triage(client, t.text)));
  const pairs = tickets.map((t, i) => [t, predictions[i]!] as const);
  return {
    total: tickets.length,
    categoryAccuracy: pairs.filter(([t, p]) => t.category === p.category).length / tickets.length,
    urgencyAccuracy: pairs.filter(([t, p]) => t.urgency === p.urgency).length / tickets.length,
    failures: pairs
      .filter(([t, p]) => t.category !== p.category || t.urgency !== p.urgency)
      .map(([t, p]) => ({ id: t.id, expected: [t.category, t.urgency], got: [p.category, p.urgency] })),
  };
}

const JUDGE = jsonOutput({
  type: "object",
  properties: { reasoning: { type: "string" }, score: { type: "integer", minimum: 1, maximum: 5 } },
  required: ["reasoning", "score"],
  additionalProperties: false,
});

/** LLM-as-judge. Reasoning comes before the score, and the rubric is explicit. */
export async function judgeReply(client: LlmClient, ticket: string, reply: string) {
  return jsonOf<{ reasoning: string; score: number }>(await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    output_config: JUDGE,
    messages: [{
      role: "user",
      content:
        "Score this support reply from 1 to 5.\n5: answers the question, correct, polite, no invented facts.\n" +
        `3: partly answers or vague.\n1: wrong, rude or invents facts.\n<ticket>${ticket}</ticket>\n<reply>${reply}</reply>`,
    }],
  }));
}

if (isMain(import.meta.url)) {
  const report = await evalTriage(makeClient(), loadTickets());
  console.log(`category accuracy: ${(report.categoryAccuracy * 100).toFixed(0)}%`);
  console.log(`urgency accuracy:  ${(report.urgencyAccuracy * 100).toFixed(0)}%`);
  report.failures.forEach((f) => console.log("  ", JSON.stringify(f)));
  process.exit(report.categoryAccuracy >= 0.8 ? 0 : 1);
}
