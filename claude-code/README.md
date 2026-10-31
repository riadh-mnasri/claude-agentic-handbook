# Claude Code setup

A ready-to-copy configuration that turns Claude Code into a specialised agent
for a project. Copy the files into the root of your repository and adapt them.
See [chapter 09](../docs/en/09-claude-code.md).

| File | Role |
|---|---|
| `CLAUDE.md` | Project memory: stack, commands, rules, where things are |
| `.claude/settings.json` | Permissions (allow, ask, deny) and hooks |
| `.claude/hooks/guard_bash.py` | PreToolUse hook blocking force pushes, recursive deletes, `curl \| sh`, secrets (tested in `python/tests/test_claude_code_hooks.py`) |
| `.claude/hooks/log_edits.py` | PostToolUse hook keeping an audit trail of edits |
| `.claude/agents/code-reviewer.md` | Read-only reviewer subagent |
| `.claude/agents/test-writer.md` | Subagent that writes offline tests |
| `.claude/skills/release-notes/` | Skill with a helper script grouping commits by type |
| `.mcp.json` | The Paperleaf MCP server (example 11) |
| `headless/review-diff.sh` | `claude -p` review step that fails CI on blockers |
| `github-actions/claude-review.yml` | PR review and `@claude` mentions with `anthropics/claude-code-action` |

Try it here: `cd claude-code && claude`, then ask "review the last commit with
the code-reviewer subagent" or "/release-notes".

---

# Configuration Claude Code

Une configuration prête à copier qui transforme Claude Code en agent
spécialisé pour un projet : mémoire du projet, permissions, hooks, deux
sous-agents, une skill, un serveur MCP, un script headless et une GitHub
Action. Voir le [chapitre 09](../docs/fr/09-claude-code.md).

Pour l'essayer : `cd claude-code && claude`, puis demandez « relis le dernier
commit avec le sous-agent code-reviewer » ou « /release-notes ».

© 2026 Riadh MNASRI. MIT.
