# 00. Parcours d'apprentissage

Ce guide vous amène de « j'ai appelé l'API une fois » à « je sais concevoir,
construire, sécuriser, évaluer et exploiter des agents Claude en production ».
Chaque notion s'accompagne de code exécutable en Python, TypeScript et Kotlin,
testé hors ligne.

## Comment le lire

| Étape | Lire | Lancer | Vous saurez... |
|---|---|---|---|
| 1. Fondamentaux | [01](01-foundations.md) | `ex01` | distinguer un workflow d'un agent, et savoir quand on n'a besoin d'aucun des deux |
| 2. Le paysage | [02](02-agent-types.md), [03](03-build-and-run.md) | | nommer chaque type d'agent et chaque façon d'en créer, d'en lancer et d'en utiliser un |
| 3. La boucle | [04](04-agent-loop-and-tools.md) | `ex02`, `ex13` | écrire une boucle d'agent à la main, utiliser le Tool Runner, concevoir de bons outils |
| 4. Workflows | [05](05-workflow-patterns.md) | `ex03` à `ex07` | choisir et implémenter les cinq patterns de workflow |
| 5. Contexte | [06](06-context-engineering.md) | `ex09` | garder les longues sessions économes et ciblées, donner une mémoire aux agents |
| 6. Plusieurs agents | [07](07-multi-agent.md) | `ex06`, `ex12` | décider quand plusieurs agents valent mieux qu'un seul, et les câbler |
| 7. Intégration | [08](08-mcp.md), [09](09-claude-code.md), [10](10-agent-sdk-and-managed-agents.md) | `ex11` à `ex14`, `claude-code/` | brancher des outils avec MCP, configurer Claude Code, utiliser l'Agent SDK |
| 8. Sécurité | [11](11-guardrails-and-security.md) | `ex08` | se défendre contre l'injection de prompt et limiter les dégâts possibles |
| 9. Qualité | [12](12-evals-and-observability.md) | `ex10` | mesurer un agent avant et après chaque changement |
| 10. Production | [13](13-production.md) | | livrer : coût, latence, erreurs, refus, versionnement |
| Référence | [14](14-glossary-and-resources.md) | | glossaire et sources officielles |

## Trois réflexes à garder dès le premier jour

1. **Commencer par la solution la plus simple qui marche.** Un seul appel avec
   un bon prompt vaut mieux qu'un agent fragile. N'ajoutez des étapes, des
   outils et de l'autonomie que lorsqu'un problème mesuré l'exige.
2. **Mettre les règles dans le code, pas seulement dans les prompts.** Un
   prompt est une suggestion faite à un modèle qu'on peut tromper. Une
   vérification dans le code est une garantie.
3. **Mesurer.** Sans jeu d'évaluation, chaque changement de prompt est un pari.

## L'exemple fil rouge

Tous les exemples utilisent **Paperleaf Books**, une librairie en ligne fictive
(`shared/bookshop.json`) : des commandes, un catalogue, une politique de
remboursement, et une commande dont le message cadeau contient une injection
de prompt. Mêmes données, mêmes scénarios dans les trois langages, pour les
comparer ligne à ligne.
