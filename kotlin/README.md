# Kotlin examples

Examples 01 to 10 of the [Claude Agentic Handbook](../README.md), on the
official Java SDK (`com.anthropic:anthropic-java`), with a hexagonal design:

- `handbook.core.LanguageModel` is the **port** the examples depend on (domain types only);
- `handbook.core.AnthropicLanguageModel` is the only **adapter** that knows the SDK;
- tests plug a scripted `FakeModel`, so the workflows are tested without the network.

```bash
./gradlew test                                   # offline tests
export ANTHROPIC_API_KEY=...                     # only for real runs
./gradlew run -Pexample=Ex02AgentLoop --args="Where is ORD-1003?"
./gradlew run -q -Pexample=Ex08GuardrailsHitl --args="Please refund ORD-1003"
```

Parallel patterns (05, 06, 10) use Kotlin coroutines. There is no Agent SDK for
the JVM: from Kotlin, use the Messages API (this folder) or call `claude -p`.

---

# Exemples Kotlin

Les exemples 01 à 10 du [Claude Agentic Handbook](../README.fr.md), sur le SDK
Java officiel, en architecture hexagonale : `LanguageModel` est le **port**,
`AnthropicLanguageModel` le seul **adaptateur** qui connaît le SDK, et les
tests branchent un `FakeModel` scénarisé.

```bash
./gradlew test
export ANTHROPIC_API_KEY=...
./gradlew run -Pexample=Ex02AgentLoop --args="Where is ORD-1003?"
```

© 2026 Riadh MNASRI. MIT.
