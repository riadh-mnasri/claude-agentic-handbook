# 13. Mettre un agent en production

## Choix du modèle et de l'effort

- Par défaut, le modèle le plus capable pour la planification et le jugement ;
  des modèles plus petits pour le routage, les workers et les juges (les
  exemples utilisent `MODEL` et `FAST_MODEL`).
- Réglez `output_config.effort` par route sur votre jeu d'évaluation : `low`
  pour une classification simple, plus haut pour le code agentique et la planification.
- Gardez les identifiants de modèles dans la configuration (`HANDBOOK_MODEL`,
  `HANDBOOK_FAST_MODEL`), pas éparpillés dans le code, et relancez les
  évaluations quand vous les changez.

## Le coût

| Levier | Gain typique | Où |
|---|---|---|
| Cache de prompt | Jusqu'à 90 % sur le préfixe en cache | `cache_control`, préfixe stable |
| Petit modèle sur les étapes ciblées | Important | Routage, workers |
| Effort plus bas quand la qualité tient | Moyen | `output_config.effort` |
| API Batch pour le travail hors ligne | 50 % | Message Batches |
| Résultats d'outils concis | Moyen à important | Conception des outils |
| Compaction et édition du contexte | Important sur les longues sessions | Chapitre 06 |

Raisonnez en coût **par tâche réussie**, pas par requête.

## La latence

Streamez les réponses vers les utilisateurs, lancez en parallèle les appels
indépendants (`ex05`, `ex06`), gardez prompts et résultats d'outils courts, et
utilisez le petit modèle sur le chemin critique quand il suffit.

## La fiabilité

- Les SDK relancent automatiquement les erreurs 429, 5xx et de connexion avec
  un délai croissant (`max_retries`). Interceptez les erreurs de la plus
  précise à la plus générale (limite de débit, serveur, connexion, requête invalide).
- Sorties longues : streamez, et fixez un `max_tokens` large plutôt que de subir une troncature.
- Gérez chaque `stop_reason` (chapitre 04), y compris `refusal`. L'API peut
  aussi relancer une requête refusée sur un autre modèle avec l'option
  `fallbacks` (beta) : activez-la quand un refus bloquerait un utilisateur légitime.
- Rendez les outils idempotents quand c'est possible (un remboursement relancé ne doit pas payer deux fois).
- Persistez l'état de l'agent pour les longues tâches, afin qu'un plantage reprenne au lieu de tout recommencer.

## Versionnement et déploiement progressif

- Versionnez prompts, descriptions d'outils et configurations d'agents comme
  du code (Managed Agents versionne les agents pour vous).
- Déployez derrière un flag, comparez à la version précédente sur le même jeu
  d'évaluation, surveillez coût et taux de réussite après la mise en production.

## Liste de contrôle avant lancement

- [ ] Jeu d'évaluation avec seuil de réussite, lancé en CI
- [ ] Liste de contrôle de sécurité du chapitre 11 faite
- [ ] Limites : tours, budget, délai maximal, limites de débit
- [ ] Journalisation et traçage de chaque exécution
- [ ] Chemins de refus et d'erreur testés
- [ ] Procédure d'escalade vers un humain définie
- [ ] Coût par tâche mesuré et acceptable

Suite : [14. Glossaire et ressources](14-glossary-and-resources.md).
