// © 2026 Riadh MNASRI. MIT License.
// 06. Orchestrator-workers: a lead model plans, workers execute, the lead synthesises.
//
// Unlike parallelization, the sub-tasks are not known in advance: the
// orchestrator decides them. Workers get a small, focused context.
//
// Run: npx tsx src/examples/06-orchestrator-workers.ts
import { Bookshop } from "../core/bookshop.js";
import { FAST_MODEL, isMain, makeClient, MODEL, type LlmClient } from "../core/config.js";
import { jsonOf, jsonOutput, textOf } from "../core/messages.js";

interface Subtask { title: string; search_query: string; instructions: string }

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    subtasks: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          search_query: { type: "string", description: "Catalog keywords" },
          instructions: { type: "string" },
        },
        required: ["title", "search_query", "instructions"],
        additionalProperties: false,
      },
    },
  },
  required: ["subtasks"],
  additionalProperties: false,
};

export async function readingPlan(client: LlmClient, request: string, shop = new Bookshop()): Promise<string> {
  // 1. Orchestrator: break the request down. Main model, structured plan.
  const plan = jsonOf<{ subtasks: Subtask[] }>(await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: jsonOutput(PLAN_SCHEMA),
    system:
      "You plan reading programmes for Paperleaf Books customers. Split the request into at most 4 " +
      "independent sections, each answerable from a catalog search.",
    messages: [{ role: "user", content: request }],
  }));

  // 2. Workers: one per sub-task, in parallel, each with only its own data.
  const sections = await Promise.all(plan.subtasks.map(async (subtask) => {
    const books = shop.searchCatalog(subtask.search_query);
    return textOf(await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 2000,
      messages: [{
        role: "user",
        content:
          `Section: ${subtask.title}\nInstructions: ${subtask.instructions}\n` +
          `Books available (only recommend these): ${JSON.stringify(books)}\nWrite the section in under 100 words.`,
      }],
    }));
  }));

  // 3. Synthesis: the orchestrator assembles the final answer.
  const joined = plan.subtasks.map((s, i) => `## ${s.title}\n${sections[i]}`).join("\n\n");
  return textOf(await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [{
      role: "user",
      content:
        `Request: ${request}\n\nDraft sections:\n${joined}\n\nMerge into one coherent reading plan. ` +
        "Remove duplicates, keep the books exactly as named, add a two-line introduction.",
    }],
  }));
}

if (isMain(import.meta.url)) {
  console.log(await readingPlan(makeClient(),
    "Our dev team wants to start building AI agents properly: where should we start, and how do we test them?"));
}
