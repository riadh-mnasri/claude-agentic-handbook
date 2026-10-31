# Claude Agentic Handbook

**Une référence pour construire des agents Claude et des workflows
agentiques**, du premier appel d'API à la production : un guide en 15
chapitres et des exemples exécutables en **Python, TypeScript et Kotlin**.
Chaque exemple est testé hors ligne avec un faux client scénarisé : tout le
dépôt tourne et se vérifie sans clé d'API, et le même code tourne contre la
vraie API dès que vous en fournissez une.

[English version](README.md)

## Ce que vous allez apprendre

- **Tous les types d'agents** : selon l'autonomie, le mode d'interaction, le rôle, le domaine, l'hébergement et la mémoire ([chapitre 02](docs/fr/02-agent-types.md)).
- **Toutes les façons d'en créer, d'en lancer et d'en utiliser un** : applications Claude, configuration de Claude Code, boucle manuelle, Tool Runner, Agent SDK, Managed Agents, MCP ; en interactif, headless, arrière-plan, CI, planifié, sur événement, en batch ([chapitre 03](docs/fr/03-build-and-run.md)).
- La boucle d'agent et la conception des outils, les cinq patterns de workflow, l'ingénierie du contexte, les systèmes multi-agents, MCP, Claude Code, la sécurité, les évaluations et la production.

Commencer ici : [docs/fr/00-learning-path.md](docs/fr/00-learning-path.md).

## Le guide

| # | Chapitre |
|---|---|
| 00 | [Parcours d'apprentissage](docs/fr/00-learning-path.md) |
| 01 | [Fondamentaux : d'un appel unique à un agent](docs/fr/01-foundations.md) |
| 02 | [Les types d'agents : la carte complète](docs/fr/02-agent-types.md) |
| 03 | [Toutes les façons de créer, lancer et utiliser un agent](docs/fr/03-build-and-run.md) |
| 04 | [La boucle d'agent et la conception des outils](docs/fr/04-agent-loop-and-tools.md) |
| 05 | [Les cinq patterns de workflow](docs/fr/05-workflow-patterns.md) |
| 06 | [L'ingénierie du contexte : cache, compaction, mémoire](docs/fr/06-context-engineering.md) |
| 07 | [Les systèmes multi-agents](docs/fr/07-multi-agent.md) |
| 08 | [MCP](docs/fr/08-mcp.md) |
| 09 | [Claude Code comme plateforme d'agents](docs/fr/09-claude-code.md) |
| 10 | [Agent SDK et Managed Agents](docs/fr/10-agent-sdk-and-managed-agents.md) |
| 11 | [Garde-fous et sécurité](docs/fr/11-guardrails-and-security.md) |
| 12 | [Évaluations et observabilité](docs/fr/12-evals-and-observability.md) |
| 13 | [Production](docs/fr/13-production.md) |
| 14 | [Glossaire et ressources](docs/fr/14-glossary-and-resources.md) |

## Les exemples

Tous les exemples partagent une même entreprise fictive, **Paperleaf Books**
(`shared/`) : des commandes, un catalogue, une politique de remboursement, un
jeu d'évaluation, et une commande dont le message cadeau cache une injection de prompt.

| # | Sujet | Python | TypeScript | Kotlin |
|---|---|---|---|---|
| 01 | LLM augmenté, sortie structurée | [py](python/examples/ex01_augmented_llm.py) | [ts](typescript/src/examples/01-augmented-llm.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex01AugmentedLlm.kt) |
| 02 | Boucle d'agent écrite à la main | [py](python/examples/ex02_agent_loop.py) | [ts](typescript/src/examples/02-agent-loop.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex02AgentLoop.kt) |
| 03 | Chaînage de prompts avec contrôles | [py](python/examples/ex03_prompt_chaining.py) | [ts](typescript/src/examples/03-prompt-chaining.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex03PromptChaining.kt) |
| 04 | Routage | [py](python/examples/ex04_routing.py) | [ts](typescript/src/examples/04-routing.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex04Routing.kt) |
| 05 | Parallélisation : sectionnement et vote | [py](python/examples/ex05_parallelization.py) | [ts](typescript/src/examples/05-parallelization.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex05Parallelization.kt) |
| 06 | Orchestrateur-workers | [py](python/examples/ex06_orchestrator_workers.py) | [ts](typescript/src/examples/06-orchestrator-workers.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex06OrchestratorWorkers.kt) |
| 07 | Évaluateur-optimiseur | [py](python/examples/ex07_evaluator_optimizer.py) | [ts](typescript/src/examples/07-evaluator-optimizer.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex07EvaluatorOptimizer.kt) |
| 08 | Garde-fous, humain dans la boucle, injection de prompt | [py](python/examples/ex08_guardrails_hitl.py) | [ts](typescript/src/examples/08-guardrails-hitl.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex08GuardrailsHitl.kt) |
| 09 | Cache, compaction, mémoire longue | [py](python/examples/ex09_context_memory.py) | [ts](typescript/src/examples/09-context-memory.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex09ContextMemory.kt) |
| 10 | Évaluations : correcteur par le code et LLM juge | [py](python/examples/ex10_evals.py) | [ts](typescript/src/examples/10-evals.ts) | [kt](kotlin/src/main/kotlin/handbook/examples/Ex10Evals.kt) |
| 11 | Serveur MCP | [py](python/examples/ex11_mcp_server.py) | [ts](typescript/src/examples/11-mcp-server.ts) | |
| 12 | Claude Agent SDK : hooks, sous-agent, MCP | [py](python/examples/ex12_agent_sdk.py) | [ts](typescript/src/examples/12-agent-sdk.ts) | |
| 13 | Tool Runner | [py](python/examples/ex13_tool_runner.py) | | |
| 14 | Managed Agents | [py](python/examples/ex14_managed_agents.py) | | |

Et aussi [`claude-code/`](claude-code) : une configuration Claude Code prête à
copier (`CLAUDE.md`, sous-agents, une skill, permissions, hooks, script de
revue headless, GitHub Action). L'Agent SDK n'existe pas pour la JVM, d'où
l'absence des exemples 11 et 12 en Kotlin.

La **boucle d'agent durcie** réutilisable (permissions, validation humaine,
données non fiables, limites) : [`loop.py`](python/src/handbook/loop.py),
[`loop.ts`](typescript/src/core/loop.ts), [`Agent.kt`](kotlin/src/main/kotlin/handbook/core/Agent.kt).

## Démarrage rapide

| | Prérequis | Tests | Lancer un exemple (nécessite `ANTHROPIC_API_KEY`) |
|---|---|---|---|
| Python | Python 3.12+, [uv](https://docs.astral.sh/uv/) | `cd python && uv sync && uv run pytest -q` | `uv run python examples/ex02_agent_loop.py "Where is ORD-1003?"` |
| TypeScript | Node 24+ | `cd typescript && npm install && npm test && npm run typecheck` | `npx tsx src/examples/02-agent-loop.ts "Where is ORD-1003?"` |
| Kotlin | JDK 17+ | `cd kotlin && ./gradlew test` | `./gradlew run -Pexample=Ex02AgentLoop --args="Where is ORD-1003?"` |

L'exemple 12 (Agent SDK) nécessite aussi la CLI Claude Code.

### Variables d'environnement

| Variable | Par défaut | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | aucune | Appels réels à l'API (jamais nécessaire pour les tests) |
| `HANDBOOK_MODEL` | `claude-opus-5-5` | Modèle principal : planification, agents, jugement |
| `HANDBOOK_FAST_MODEL` | `claude-haiku-5-5` | Petit modèle : routage, workers, juges |

## Comment fonctionnent les tests

Chaque langage a un faux client qui renvoie de vrais objets message du SDK
(`python/tests/fakes.py`, `typescript/tests/fakes.ts`,
`kotlin/src/test/kotlin/handbook/Fakes.kt`). Les tests scénarisent ce que
« Claude » répond et vérifient le comportement : quels appels ont été faits,
quelles données ont atteint le modèle, quels garde-fous se sont déclenchés.
Ils sont écrits en Given / When / Then. La CI lance les trois suites à chaque push.

## État et feuille de route

- [x] Guide en anglais et en français (15 chapitres)
- [x] Exemples Python 01 à 14, TypeScript 01 à 12, Kotlin 01 à 10, tous testés hors ligne
- [x] Exemples de configuration Claude Code
- [ ] Sorties enregistrées d'exécutions réelles contre l'API
- [ ] Serveur MCP en Kotlin avec le SDK MCP Kotlin officiel
- [ ] Exemples Tool Runner et Managed Agents en TypeScript

## Licence

[MIT](LICENSE). © 2026 Riadh MNASRI.

Guide indépendant, non affilié à Anthropic ni approuvé par Anthropic.
« Claude » est une marque d'Anthropic, PBC.
