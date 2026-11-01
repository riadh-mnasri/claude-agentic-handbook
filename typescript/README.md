# TypeScript examples

Examples 01 to 14 of the [Claude Agentic Handbook](../README.md), on
`@anthropic-ai/sdk`, `@anthropic-ai/claude-agent-sdk` and
`@modelcontextprotocol/sdk`. Tests with vitest, strict type checking.

```bash
npm install
npm test                      # offline tests, no API key needed
npm run typecheck
export ANTHROPIC_API_KEY=...  # only for real runs
npx tsx src/examples/02-agent-loop.ts "Where is ORD-1003?"
```

| Path | Content |
|---|---|
| `src/core/config.ts` | Model ids, `LlmClient` interface (satisfied by the real client and the fake), `makeClient()` |
| `src/core/bookshop.ts` | Paperleaf domain, business rules, tool definitions |
| `src/core/loop.ts` | Hardened agent loop |
| `src/core/messages.ts` | Response helpers |
| `src/examples/NN-*.ts` | One runnable example per topic |
| `tests/fakes.ts` | Scripted fake client |

---

# Exemples TypeScript

Les exemples 01 à 14 du [Claude Agentic Handbook](../README.fr.md). Tests avec
vitest, typage strict.

```bash
npm install
npm test                      # tests hors ligne, sans clé d'API
npm run typecheck
export ANTHROPIC_API_KEY=...  # uniquement pour les exécutions réelles
npx tsx src/examples/02-agent-loop.ts "Where is ORD-1003?"
```

© 2026 Riadh MNASRI. MIT.
