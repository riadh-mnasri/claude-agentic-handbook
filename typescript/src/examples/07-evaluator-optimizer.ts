// © 2026 Riadh MNASRI. MIT License.
// 07. Evaluator-optimizer: one model writes, another grades, loop until it passes.
//
// Works when you can state clear evaluation criteria and when feedback actually
// improves the next draft. Always cap the number of rounds.
//
// Run: npx tsx src/examples/07-evaluator-optimizer.ts
import { FAST_MODEL, isMain, makeClient, MODEL, type LlmClient } from "../core/config.js";
import { jsonOf, jsonOutput, textOf } from "../core/messages.js";

export const RUBRIC = `1. Between 40 and 80 words.
2. Mentions the title and the author exactly.
3. Says who the book is for.
4. No superlatives such as "best", "ultimate", "must-read".
5. Ends with a call to action.`;

interface Evaluation { passed: boolean; failed_criteria: number[]; feedback: string }

const EVALUATION = jsonOutput({
  type: "object",
  properties: {
    passed: { type: "boolean" },
    failed_criteria: { type: "array", items: { type: "integer" } },
    feedback: { type: "string" },
  },
  required: ["passed", "failed_criteria", "feedback"],
  additionalProperties: false,
});

export interface Outcome { text: string; passed: boolean; rounds: number; history: (Evaluation & { draft: string })[] }

export async function writeBlurb(client: LlmClient, book: object, maxRounds = 3): Promise<Outcome> {
  let draft = "";
  let feedback = "";
  const history: Outcome["history"] = [];
  for (let round = 1; round <= maxRounds; round++) {
    draft = textOf(await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: `You write catalog blurbs for Paperleaf Books. Rules:\n${RUBRIC}`,
      messages: [{
        role: "user",
        content:
          `Book: ${JSON.stringify(book)}\n` +
          (feedback ? `Previous draft:\n${draft}\nReviewer feedback:\n${feedback}\n` : "") +
          "Return only the blurb.",
      }],
    }));
    // A different, cheaper model grades against the same explicit rubric.
    const verdict = jsonOf<Evaluation>(await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 1024,
      output_config: EVALUATION,
      messages: [{
        role: "user",
        content: `Grade this blurb strictly against the rubric.\nRubric:\n${RUBRIC}\nBook: ${JSON.stringify(book)}\n<blurb>${draft}</blurb>`,
      }],
    }));
    history.push({ draft, ...verdict });
    if (verdict.passed) return { text: draft, passed: true, rounds: round, history };
    feedback = verdict.feedback;
  }
  return { text: draft, passed: false, rounds: maxRounds, history };
}

if (isMain(import.meta.url)) {
  const outcome = await writeBlurb(makeClient(), { title: "Evals Before Vibes", author: "Omar Benali", tags: ["ai", "testing"] });
  console.log(`passed=${outcome.passed} after ${outcome.rounds} round(s)\n${outcome.text}`);
}
