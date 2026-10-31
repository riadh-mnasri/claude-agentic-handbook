# 09. Claude Code comme plateforme d'agents

Claude Code est l'outil de code agentique d'Anthropic : un agent généraliste
doté d'outils fichiers, shell, web et MCP, que l'on spécialise avec des
fichiers dans le dépôt. Le dossier [`claude-code/`](../../claude-code) est une
configuration prête à copier.

## Les briques

| Brique | Fichier | Chargée | À utiliser pour |
|---|---|---|---|
| **Mémoire** | `CLAUDE.md` (projet), `~/.claude/CLAUDE.md` (utilisateur), `CLAUDE.local.md` | À chaque session | Commandes, conventions, architecture, règles |
| **Sous-agents** | `.claude/agents/*.md` | Quand on leur délègue | Des spécialistes avec leur contexte, leurs outils et leur modèle |
| **Skills** | `.claude/skills/<nom>/SKILL.md` + scripts | Quand c'est pertinent (description) ou via `/nom` | Des procédures répétables avec leurs scripts |
| **Hooks** | `hooks` dans `.claude/settings.json` | Sur des événements | Des garanties déterministes : bloquer, journaliser, formater, notifier |
| **Permissions** | `permissions` dans les réglages | À chaque appel d'outil | Autoriser, demander, refuser par outil et par motif |
| **Serveurs MCP** | `.mcp.json`, `claude mcp add` | Au démarrage de session | Vos systèmes sous forme d'outils |
| **Plugins** | Un paquet de tout ce qui précède | Installés par utilisateur ou par projet | Partager la configuration d'une équipe |
| **Styles de sortie, barre d'état** | réglages | Toujours | Adapter l'interface et le ton |

**Skill ou sous-agent ?** Une skill ajoute un savoir-faire à la conversation
en cours (Claude lit les instructions et continue dans le même contexte). Un
sous-agent est un travailleur séparé, avec un contexte neuf, qui renvoie un
résumé. Les skills pour les procédures, les sous-agents pour les
investigations isolées ou le travail en parallèle.

**Hook ou consigne ?** Une consigne dans `CLAUDE.md` est suivie la plupart du
temps. Un hook s'exécute à chaque fois. Tout ce qui doit toujours se produire
(bloquer les secrets, lancer le formateur, journaliser les modifications)
relève d'un hook.

## Les hooks en détail

Les événements comprennent `PreToolUse`, `PostToolUse`, `UserPromptSubmit`,
`Stop`, `SubagentStop`, `SessionStart`, `PreCompact` et `Notification`. Un hook
de type commande reçoit l'événement en JSON sur l'entrée standard.

- Code de sortie `0` : on continue. Code de sortie `2` : on bloque, et la
  sortie d'erreur est montrée à Claude.
- Ou bien imprimer un JSON tel que `{"hookSpecificOutput": {"hookEventName": "PreToolUse",
  "permissionDecision": "deny", "permissionDecisionReason": "..."}}`.

`claude-code/.claude/hooks/guard_bash.py` bloque les push forcés, les
suppressions récursives, les téléchargements envoyés dans un shell et l'accès
aux secrets ; il est testé dans `python/tests/test_claude_code_hooks.py`.

## Les modes de permission

`--permission-mode` (ou Maj+Tab dans le terminal) :

| Mode | Comportement |
|---|---|
| `manual` | Demande avant les modifications et commandes non autorisées par les règles |
| `acceptEdits` | Modifie les fichiers sans demander, demande toujours pour les commandes |
| `plan` | Lecture seule : explore et propose un plan, ne change rien |
| `auto` | Un classifieur approuve les actions sûres et arrête les risquées |
| `dontAsk` | Ne demande jamais : tout ce qui n'est pas explicitement autorisé est refusé |
| `bypassPermissions` | Aucun contrôle. Uniquement dans un bac à sable jetable |

## Une bonne boucle de travail

1. **Explorer et planifier** en mode plan pour tout ce qui n'est pas trivial.
2. **Donner des objectifs vérifiables** : « fais passer `npm test` », « écris d'abord un test qui échoue ».
3. **Le laisser travailler** avec les tests comme signal de retour.
4. **Relire le diff** (ou demander au sous-agent `code-reviewer`), puis committer.
5. **Mettre à jour `CLAUDE.md`** quand vous avez dû le corriger deux fois sur le même point.

Hygiène du contexte : `/clear` entre deux tâches sans rapport, `/compact` pour
les longues, des sous-agents pour les recherches larges.

## Headless et automatisation

```bash
claude -p "Résume les changements depuis le dernier tag" --output-format json
claude -p "Corrige les erreurs de lint" --allowedTools "Read,Edit,Bash(npm run lint:*)" --max-budget-usd 1
git diff main | claude -p "Relis ce diff" --permission-mode plan
```

- `--output-format json` renvoie le résultat, le coût et l'identifiant de
  session ; `stream-json` diffuse chaque événement.
- `claude-code/headless/review-diff.sh` : une étape de CI qui échoue sur les points bloquants.
- `claude-code/github-actions/claude-review.yml` : revue de PR et mentions
  `@claude` avec `anthropics/claude-code-action`.

## Le travail en parallèle

- `claude --bg "tâche"` démarre une session en arrière-plan ; `claude agents`
  les liste, `claude attach <id>` en ramène une au premier plan.
- `claude -w nom` fait tourner la session dans son propre worktree git, pour
  que plusieurs agents modifient le même dépôt sans se gêner.
- `claude --cloud "tâche"` ou claude.ai/code la fait tourner à distance.

Suite : [10. Agent SDK et Managed Agents](10-agent-sdk-and-managed-agents.md).
