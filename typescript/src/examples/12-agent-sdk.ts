// © 2026 Riadh MNASRI. MIT License.
// 12. Claude Agent SDK: the Claude Code harness as a library.
//
// Built-in tools, context management, subagents, hooks and MCP, without
// writing the loop. Here, a read-only code auditor:
// - built-in tools restricted to read-only ones;
// - a PreToolUse hook that blocks any access to secrets;
// - a specialised subagent for test quality;
// - the MCP server of example 11 attached over stdio;
// - hard limits on turns and budget.
//
// Run: npx tsx src/examples/12-agent-sdk.ts ../
import { query, type HookCallback, type Options } from "@anthropic-ai/claude-agent-sdk";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "../core/config.js";

const SECRET_MARKERS = [".env", "id_rsa", "credentials", "secrets"];

/** PreToolUse hook: deny reads of files that look like secrets. */
export const blockSecrets: HookCallback = async (input) => {
  const toolInput = "tool_input" in input ? (input.tool_input as Record<string, unknown>) : {};
  const target = Object.values(toolInput).map(String).join(" ");
  if (SECRET_MARKERS.some((marker) => target.includes(marker))) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Reading secret files is not allowed for this agent.",
      },
    };
  }
  return {};
};

export function buildOptions(repo: string): Options {
  const here = dirname(fileURLToPath(import.meta.url));
  return {
    cwd: repo,
    systemPrompt: "You audit codebases. You never modify files. Cite file paths for each finding.",
    allowedTools: ["Read", "Grep", "Glob", "Agent", "mcp__paperleaf__search_catalog"],
    disallowedTools: ["Write", "Edit", "Bash"],
    maxTurns: 30,
    maxBudgetUsd: 1.0,
    hooks: { PreToolUse: [{ matcher: "Read|Grep|Glob", hooks: [blockSecrets] }] },
    agents: {
      "test-reviewer": {
        description: "Reviews test quality: coverage of edge cases, assertions, flakiness. Use it for anything about tests.",
        prompt: "You review automated tests. Report missing edge cases and weak assertions.",
        tools: ["Read", "Grep", "Glob"],
        model: "haiku",
      },
    },
    mcpServers: {
      paperleaf: { command: "npx", args: ["tsx", join(here, "11-mcp-server.ts")] },
    },
  };
}

export async function audit(repo: string): Promise<void> {
  const prompt =
    "Give a short architecture overview of this repository, then delegate a review of the TypeScript " +
    "tests to the test-reviewer subagent. Finish with 3 improvements. Bonus: suggest one book from the " +
    "paperleaf catalog relevant to the findings.";
  for await (const message of query({ prompt, options: buildOptions(repo) })) {
    if (message.type === "result") {
      if (message.subtype === "success") console.log(message.result);
      console.log(`\n[${message.num_turns} turns, ${message.total_cost_usd.toFixed(4)} USD]`);
    }
  }
}

if (isMain(import.meta.url)) {
  await audit(resolve(process.argv[2] ?? "."));
}
