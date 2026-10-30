# 09. Claude Code as an agent platform

Claude Code is Anthropic's agentic coding tool: a general agent with file,
shell, web and MCP tools, that you specialise with files in your repository.
The [`claude-code/`](../../claude-code) folder is a ready-to-copy setup.

## The building blocks

| Block | File | Loaded | Use it for |
|---|---|---|---|
| **Memory** | `CLAUDE.md` (project), `~/.claude/CLAUDE.md` (user), `CLAUDE.local.md` | Every session | Commands, conventions, architecture, rules |
| **Subagents** | `.claude/agents/*.md` | When delegated to | Specialists with their own context, tools and model |
| **Skills** | `.claude/skills/<name>/SKILL.md` + scripts | When relevant (description match) or `/name` | Repeatable procedures with bundled scripts |
| **Hooks** | `hooks` in `.claude/settings.json` | On events | Deterministic guarantees: block, log, format, notify |
| **Permissions** | `permissions` in settings | Every tool call | Allow, ask, deny per tool and pattern |
| **MCP servers** | `.mcp.json`, `claude mcp add` | Session start | Your systems as tools |
| **Plugins** | A package of all of the above | Installed per user or project | Share a team setup |
| **Output styles, status line** | settings | Always | Adapt the UI and the tone |

**Skill or subagent?** A skill adds know-how to the current conversation (it
reads the instructions and keeps working in the same context). A subagent is
a separate worker with a fresh context that returns a summary. Use skills for
procedures, subagents for isolated investigations or parallel work.

**Hook or instruction?** An instruction in `CLAUDE.md` is followed most of the
time. A hook runs every time. Anything that must always happen (block secrets,
run the formatter, log edits) belongs in a hook.

## Hooks in detail

Events include `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`,
`SubagentStop`, `SessionStart`, `PreCompact` and `Notification`. A command
hook receives the event as JSON on stdin.

- Exit code `0`: continue. Exit code `2`: block, stderr is shown to Claude.
- Or print JSON such as `{"hookSpecificOutput": {"hookEventName": "PreToolUse",
  "permissionDecision": "deny", "permissionDecisionReason": "..."}}`.

`claude-code/.claude/hooks/guard_bash.py` blocks force pushes, recursive
deletes, piping downloads into a shell and secret access; it is tested in
`python/tests/test_claude_code_hooks.py`.

## Permission modes

`--permission-mode` (or Shift+Tab in the terminal):

| Mode | Behaviour |
|---|---|
| `manual` | Asks before edits and commands not allowed by the rules |
| `acceptEdits` | Edits files without asking, still asks for commands |
| `plan` | Read-only: explores and proposes a plan, changes nothing |
| `auto` | A classifier approves safe actions and stops risky ones |
| `dontAsk` | Never prompts: anything not explicitly allowed is denied |
| `bypassPermissions` | No checks at all. Only in a disposable sandbox |

## A good working loop

1. **Explore and plan** in plan mode for anything non-trivial.
2. **Give verifiable goals**: "make `npm test` pass", "add a failing test first".
3. **Let it run** with tests as the feedback signal.
4. **Review the diff** (or ask the `code-reviewer` subagent), then commit.
5. **Update `CLAUDE.md`** when you had to correct it twice for the same thing.

Context hygiene: `/clear` between unrelated tasks, `/compact` for long ones,
subagents for wide searches.

## Headless and automation

```bash
claude -p "Summarise the changes since the last tag" --output-format json
claude -p "Fix the lint errors" --allowedTools "Read,Edit,Bash(npm run lint:*)" --max-budget-usd 1
git diff main | claude -p "Review this diff" --permission-mode plan
```

- `--output-format json` returns the result, cost and session id;
  `stream-json` streams every event.
- `claude-code/headless/review-diff.sh`: a CI step that fails on blockers.
- `claude-code/github-actions/claude-review.yml`: PR review and `@claude`
  mentions with `anthropics/claude-code-action`.

## Parallel work

- `claude --bg "task"` starts a background session; `claude agents` lists
  them, `claude attach <id>` brings one back.
- `claude -w name` runs the session in its own git worktree, so several agents
  can edit the same repo without stepping on each other.
- `claude --cloud "task"` or claude.ai/code runs it remotely.

Next: [10. Agent SDK and Managed Agents](10-agent-sdk-and-managed-agents.md).
