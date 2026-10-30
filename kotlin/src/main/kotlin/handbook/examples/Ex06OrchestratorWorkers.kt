// © 2026 Riadh MNASRI. MIT License.
// 06. Orchestrator-workers: the lead model decides the sub-tasks, workers run
// them in parallel with a small focused context, the lead synthesises.
// Run: ./gradlew run -Pexample=Ex06OrchestratorWorkers
package handbook.examples

import handbook.bookshop.Bookshop
import handbook.core.AnthropicLanguageModel
import handbook.core.Json
import handbook.core.LanguageModel
import handbook.core.ModelRequest
import handbook.core.ModelTier
import handbook.core.arrayOf
import handbook.core.obj
import handbook.core.string
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking

data class Subtask(val title: String, val searchQuery: String, val instructions: String)
data class Plan(val subtasks: List<Subtask>)

private val PLAN_SCHEMA = obj(
    "subtasks" to arrayOf(obj("title" to string(), "search_query" to string("Catalog keywords"), "instructions" to string()), maxItems = 4),
)

fun readingPlan(model: LanguageModel, request: String, shop: Bookshop = Bookshop()): String {
    // 1. Orchestrator: break the request down. Main model, structured plan.
    val plan = model.complete(ModelRequest.ask(
        request,
        system = "You plan reading programmes for Paperleaf Books customers. Split the request into at most 4 " +
            "independent sections, each answerable from a catalog search.",
        jsonSchema = PLAN_SCHEMA,
    )).json<Plan>()

    // 2. Workers: one per sub-task, in parallel, each with only its own data.
    val sections = runBlocking(Dispatchers.IO) {
        plan.subtasks.map { subtask ->
            async {
                val books = shop.searchCatalog(subtask.searchQuery)
                model.complete(ModelRequest.ask(
                    "Section: ${subtask.title}\nInstructions: ${subtask.instructions}\n" +
                        "Books available (only recommend these): ${Json.write(books)}\nWrite the section in under 100 words.",
                    ModelTier.FAST,
                )).text()
            }
        }.awaitAll()
    }

    // 3. Synthesis: the orchestrator assembles the final answer.
    val joined = plan.subtasks.zip(sections).joinToString("\n\n") { (s, body) -> "## ${s.title}\n$body" }
    return model.complete(ModelRequest.ask(
        "Request: $request\n\nDraft sections:\n$joined\n\nMerge into one coherent reading plan. Remove duplicates, " +
            "keep the books exactly as named, add a two-line introduction.",
    )).text()
}

fun main() {
    println(readingPlan(AnthropicLanguageModel(), "Our dev team wants to start building AI agents properly: where should we start, and how do we test them?"))
}
