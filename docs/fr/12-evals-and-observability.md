# 12. Évaluations et observabilité

## Pourquoi les évaluations d'abord

Sans évaluations, impossible de savoir si un nouveau prompt, un nouveau
modèle, une description d'outil ou un niveau d'effort a amélioré ou dégradé
les choses. Avec elles, chaque changement devient une expérience qui se
conclut par un chiffre.

## Construire un jeu d'évaluation

1. **Commencer petit** : 20 à 50 cas réels valent mieux que 1 000 cas
   synthétiques. Prenez-les dans les logs, les tickets, les rapports de bug.
2. **Étiqueter le résultat attendu**, pas la formulation exacte.
3. **Couvrir les cas limites** : entrées ambiguës, données manquantes,
   injections, refus, cas multi-étapes.
4. **Garder un jeu de test à part** sur lequel on n'optimise jamais.
5. **L'enrichir à partir des échecs** : chaque bug de production devient un cas.

`shared/evals/tickets.jsonl` est un jeu de 12 cas pour l'étape de tri.

## Les correcteurs

| Correcteur | Comment | Pour | Exemple |
|---|---|---|---|
| **Par le code** | Égalité exacte, regex, schéma JSON, tests unitaires sur le code produit | Classifications, extractions, tout ce qui est vérifiable | `eval_triage` |
| **Par un modèle (LLM juge)** | Un modèle note selon une grille explicite, raisonnement avant la note | Ton, utilité, fidélité aux faits | `judge_reply` |
| **Par un humain** | Des experts relisent un échantillon | Calibrer le juge, sorties à fort enjeu | |

Pour un juge fiable : une grille précise avec des niveaux ancrés, une sortie
structurée, un modèle ou un contexte différent de celui évalué, et une
comparaison régulière avec des étiquettes humaines.

## Évaluer des agents, pas seulement des réponses

| Mesure | Question |
|---|---|
| **Réussite de la tâche** | L'état final correspond-il à l'objectif (commande remboursée, tests au vert) ? |
| **Trajectoire** | Les bons outils ont-ils été appelés, dans un ordre sensé, sans action interdite ? |
| **Efficacité** | Tours, tokens, coût et temps par tâche réussie |
| **Sécurité** | A-t-il résisté aux cas d'injection ? A-t-il demandé une validation quand il le fallait ? |

Les agents ne sont pas déterministes : lancez chaque cas plusieurs fois et
donnez un taux de réussite, pas une seule exécution chanceuse.

## En CI

`ex10` renvoie un code de sortie non nul sous un seuil, ce qui permet de
bloquer une pull request qui modifie un prompt ou un modèle. Lancez les
évaluations par le code, peu coûteuses, à chaque PR, et celles avec juge, plus
lentes, chaque nuit.

## L'observabilité

Journalisez, pour chaque exécution : l'identifiant de requête, le modèle,
l'effort, la version du prompt, chaque appel d'outil avec entrée et résultat,
les raisons d'arrêt, la consommation de tokens y compris les lectures en
cache, la latence et le coût. Ensuite :

- les SDK prennent en charge le traçage **OpenTelemetry** ;
- Claude Code exporte aussi métriques et événements via OpenTelemetry ;
- le visualiseur de session de Managed Agents montre chaque événement d'une session ;
- `--output-format json` en mode headless renvoie le coût et le nombre de tours.

Lisez régulièrement les transcriptions. La plupart des bugs d'agent sautent
aux yeux dès qu'on lit ce que le modèle a réellement vu.

Suite : [13. Production](13-production.md).
