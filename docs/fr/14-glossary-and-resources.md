# 14. Glossaire et ressources

## Glossaire

| Terme | Signification |
|---|---|
| **Agent** | Un système où le modèle décide de ses prochaines étapes et de ses appels d'outils dans une boucle, jusqu'à atteindre l'objectif |
| **Boucle agentique** | Appeler le modèle, exécuter les outils demandés, renvoyer les résultats, recommencer |
| **Workflow** | Des appels au modèle orchestrés par votre code selon des chemins prédéfinis |
| **LLM augmenté** | Un appel au modèle enrichi de récupération, d'outils et de mémoire |
| **Appel d'outil (function calling)** | Le modèle demande à votre code d'exécuter une fonction avec des arguments JSON |
| **Outil serveur** | Un outil exécuté par Anthropic (recherche web, exécution de code) |
| **Sorties structurées** | Des réponses contraintes par un schéma JSON (`output_config.format`) |
| **Raison d'arrêt (stop reason)** | Pourquoi le modèle s'est arrêté : `end_turn`, `tool_use`, `max_tokens`, `refusal`... |
| **Effort** | Combien le modèle réfléchit et travaille par réponse (de `low` à `max`) |
| **Réflexion adaptative** | Le modèle décide quand et combien raisonner |
| **Cache de prompt** | Réutiliser un préfixe de prompt déjà traité, pour une fraction du prix |
| **Compaction** | Remplacer l'ancien contexte par un résumé pour rester dans le budget |
| **Édition du contexte** | Effacer d'anciens résultats d'outils ou réflexions du contexte |
| **Mémoire** | Des informations conservées entre sessions, lues et écrites via des outils |
| **Sous-agent** | Un agent avec son propre contexte, appelé par un agent parent |
| **Orchestrateur** | Le composant qui planifie et délègue les sous-tâches |
| **Évaluateur / juge** | Un modèle qui note des sorties selon une grille |
| **Routeur** | Un classifieur qui envoie les entrées vers des traitements spécialisés |
| **MCP** | Model Context Protocol, un standard pour exposer outils, ressources et prompts aux agents |
| **Skill** | Un dossier d'instructions et de scripts qu'un agent charge quand c'est pertinent |
| **Hook** | Du code exécuté automatiquement sur des événements de l'agent (avant un appel d'outil, en fin de tour...) |
| **Injection de prompt** | Des instructions cachées dans des données lues par l'agent, pour le détourner |
| **Humain dans la boucle** | Une personne valide ou corrige certaines actions |
| **Headless** | Faire tourner un agent sans interface interactive (`claude -p`) |
| **Tool Runner** | Aide du SDK qui fait tourner la boucle d'agent sur vos outils typés |
| **Agent SDK** | Le harnais de Claude Code sous forme de bibliothèque Python ou TypeScript |
| **Managed Agents** | Des agents hébergés par Anthropic, avec un bac à sable par session |
| **Évaluation (eval)** | Un test répétable du comportement d'un modèle ou d'un agent, avec un correcteur |

## Ressources officielles (en anglais)

- Anthropic engineering, « Building effective agents » : https://www.anthropic.com/engineering/building-effective-agents
- Anthropic engineering, « Effective context engineering for AI agents » : https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic engineering, « Writing effective tools for agents » : https://www.anthropic.com/engineering/writing-tools-for-agents
- Anthropic engineering, « How we built our multi-agent research system » : https://www.anthropic.com/engineering/multi-agent-research-system
- Documentation de l'API Claude : https://platform.claude.com/docs
- Utilisation des outils : https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Cache de prompt : https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Documentation de Claude Code : https://code.claude.com/docs
- Claude Agent SDK : https://code.claude.com/docs/en/agent-sdk
- Model Context Protocol : https://modelcontextprotocol.io
- Cookbooks Anthropic : https://github.com/anthropics/claude-cookbooks
- SDK : https://github.com/anthropics (anthropic-sdk-python, anthropic-sdk-typescript, anthropic-sdk-java...)

Retour au [parcours d'apprentissage](00-learning-path.md).
