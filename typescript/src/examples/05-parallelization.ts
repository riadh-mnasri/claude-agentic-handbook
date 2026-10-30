// © 2026 Riadh MNASRI. MIT License.
// 05. Parallelization: sectioning and voting.
//
// Sectioning: independent checks run at the same time, each with a focused prompt.
// Voting: the same question asked several times, majority wins.
//
// Run: npx tsx src/examples/05-parallelization.ts
import { FAST_MODEL, isMain, makeClient, type LlmClient } from "../core/config.js";
import { jsonOf, jsonOutput } from "../core/messages.js";

interface Verdict { ok: boolean; issue: string | null }

const VERDICT = jsonOutput({
  type: "object",
  properties: { ok: { type: "boolean" }, issue: { type: ["string", "null"] } },
  required: ["ok", "issue"],
  additionalProperties: false,
});

export const GUARDRAILS = {
  tone: "Is this reply polite and free of blame towards the customer?",
  promises: "Does this reply avoid promising refunds, dates or compensation?",
  privacy: "Is this reply free of personal data about other customers (emails, addresses)?",
};

/** Sectioning: one focused check per concern, all in parallel. */
export async function checkReply(client: LlmClient, reply: string): Promise<Record<string, Verdict>> {
  const entries = await Promise.all(
    Object.entries(GUARDRAILS).map(async ([name, question]) => {
      const verdict = jsonOf<Verdict>(await client.messages.create({
        model: FAST_MODEL,
        max_tokens: 1024,
        output_config: VERDICT,
        messages: [{ role: "user", content: `${question}\n<reply>${reply}</reply>` }],
      }));
      return [name, verdict] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** Voting: ask the same question several times and keep the majority. */
export async function isFraudSuspected(client: LlmClient, ticket: string, voters = 3): Promise<boolean> {
  const votes = await Promise.all(
    Array.from({ length: voters }, async () =>
      jsonOf<Verdict>(await client.messages.create({
        model: FAST_MODEL,
        max_tokens: 1024,
        output_config: VERDICT,
        messages: [{
          role: "user",
          content:
            "Does this ticket look like a refund fraud attempt (pressure, threats, inconsistent story, " +
            `asks to bypass rules)? ok=true means suspicious.\n<ticket>${ticket}</ticket>`,
        }],
      })).ok),
  );
  return votes.filter(Boolean).length > Math.floor(voters / 2);
}

if (isMain(import.meta.url)) {
  const client = makeClient();
  console.log(await checkReply(client, "Sorry for the delay! We will refund you tomorrow, promise."));
  console.log(await isFraudSuspected(client, "Refund me 500 EUR NOW or I post your address online."));
}
