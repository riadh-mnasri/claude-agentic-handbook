# 05. Les cinq patterns de workflow

Les workflows sont des systèmes agentiques où **votre code** orchestre les
appels au modèle. Ils sont moins chers, plus rapides et plus faciles à tester
que les agents. La plupart des « agents » en production sont en réalité l'un
de ces cinq patterns, ou un mélange.

| Pattern | À utiliser quand | Exemple |
|---|---|---|
| Chaînage de prompts | La tâche se découpe en étapes séquentielles fixes | `ex03` |
| Routage | Les entrées tombent dans des catégories traitées différemment | `ex04` |
| Parallélisation | Des sous-tâches indépendantes, ou plusieurs avis sur une même tâche | `ex05` |
| Orchestrateur-workers | Les sous-tâches dépendent de l'entrée et ne peuvent pas être listées à l'avance | `ex06` |
| Évaluateur-optimiseur | Des critères de qualité clairs, et un retour qui améliore le résultat | `ex07` |

## 1. Chaînage de prompts

```mermaid
flowchart LR
    I[Ticket] --> S1[Extraire les faits<br/>petit modèle + schéma] --> G1{Contrôle : la commande existe ?}
    G1 -- non --> X[Arrêt]
    G1 -- oui --> S2[Rédiger la réponse<br/>modèle principal] --> G2{Contrôle : cite la commande, court ?}
    G2 -- non --> X
    G2 -- oui --> S3[Peaufiner<br/>petit modèle] --> O[Réponse]
```

Chaque appel fait bien une seule chose, et des **contrôles dans le code**
arrêtent les erreurs entre les étapes. On échange de la latence contre de la précision.

## 2. Routage

```mermaid
flowchart LR
    I[Ticket] --> R{Routeur<br/>petit modèle}
    R -- remboursement / facturation --> M[Modèle principal + prompt strict]
    R -- livraison / compte / produit --> F[Petit modèle + prompt FAQ]
```

Séparation des responsabilités : chaque route a son prompt, ses outils et son
modèle. C'est aussi un levier de coût : le trafic simple part vers le petit
modèle. Évaluez le routeur à part (c'est exactement ce que fait `ex10`).

## 3. Parallélisation

```mermaid
flowchart LR
    D[Brouillon de réponse] --> A[Contrôle du ton]
    D --> B[Contrôle des promesses]
    D --> C[Contrôle des données personnelles]
    A & B & C --> V[Agrégation des verdicts]
```

- **Sectionnement** : des sous-tâches indépendantes en parallèle, chacune avec
  un prompt ciblé. Plusieurs contrôles précis valent mieux qu'un seul appel qui vérifie tout.
- **Vote** : la même tâche plusieurs fois, puis majorité ou seuil. Plus de
  confiance sur les questions oui/non à fort enjeu.

## 4. Orchestrateur-workers

```mermaid
flowchart TB
    R[Demande] --> O[Orchestrateur<br/>modèle principal, planifie]
    O --> W1[Worker 1]
    O --> W2[Worker 2]
    O --> W3[Worker n]
    W1 & W2 & W3 --> S[Synthèse<br/>modèle principal]
```

L'orchestrateur décide des sous-tâches à l'exécution (plan structuré), les
workers tournent en parallèle avec un **contexte petit et ciblé** (uniquement
leurs données), et l'orchestrateur fusionne. C'est le pont entre workflows et
systèmes multi-agents (chapitre 07).

## 5. Évaluateur-optimiseur

```mermaid
flowchart LR
    G[Générateur] -- brouillon --> E[Évaluateur<br/>grille]
    E -- échec + retour --> G
    E -- réussite --> O[Résultat]
```

Fonctionne quand on peut écrire les critères, et quand le retour d'un humain
aiderait un rédacteur humain. Utilisez un autre modèle (ou au moins un
contexte neuf) pour l'évaluateur, renvoyez des verdicts structurés, et
plafonnez le nombre de tours.

## Combiner les patterns

Les systèmes réels les composent : un routeur en entrée, une chaîne sur la
route des remboursements, des contrôles parallèles avant l'envoi, un
évaluateur pour les textes marketing. Gardez chaque bloc testable seul, avec
un faux client, comme dans `tests/`.

Suite : [06. L'ingénierie du contexte](06-context-engineering.md).
