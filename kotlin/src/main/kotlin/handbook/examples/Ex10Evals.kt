// © 2026 Riadh MNASRI. MIT License.
// 10. Evals: a code-based grader (exact match on labelled tickets) and an
// LLM-as-judge with an explicit rubric. Exits non-zero below the threshold.
// Run: ./gradlew run -Pexample=Ex10Evals
package handbook.examples

import handbook.bookshop.sharedDir
import handbook.core.AnthropicLanguageModel
import handbook.core.Json
import handbook.core.LanguageModel
import handbook.core.ModelRequest
import handbook.core.integer
import handbook.core.obj
import handbook.core.string
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import java.io.File
import kotlin.system.exitProcess

data class Ticket(val id: String, val text: String, val category: String, val urgency: String)
data class EvalFailure(val id: String, val expected: Pair<String, String>, val got: Pair<String, String>)
data class EvalReport(val total: Int, val categoryAccuracy: Double, val urgencyAccuracy: Double, val failures: List<EvalFailure>)
data class Judgement(val reasoning: String, val score: Int)

fun loadTickets(): List<Ticket> = File(sharedDir(), "evals/tickets.jsonl").readLines()
    .filter { it.isNotBlank() }
    .map { Json.mapper.readValue(it, Ticket::class.java) }

fun evalTriage(model: LanguageModel, tickets: List<Ticket>): EvalReport {
    val predictions = runBlocking(Dispatchers.IO) { tickets.map { async { triage(model, it.text) } }.awaitAll() }
    val pairs = tickets.zip(predictions)
    return EvalReport(
        total = tickets.size,
        categoryAccuracy = pairs.count { (t, p) -> t.category == p.category }.toDouble() / tickets.size,
        urgencyAccuracy = pairs.count { (t, p) -> t.urgency == p.urgency }.toDouble() / tickets.size,
        failures = pairs.filter { (t, p) -> t.category != p.category || t.urgency != p.urgency }
            .map { (t, p) -> EvalFailure(t.id, t.category to t.urgency, p.category to p.urgency) },
    )
}

private val JUDGE = obj("reasoning" to string(), "score" to integer(1, 5))

/** LLM-as-judge. Reasoning comes before the score, and the rubric is explicit. */
fun judgeReply(model: LanguageModel, ticket: String, reply: String): Judgement = model.complete(ModelRequest.ask(
    "Score this support reply from 1 to 5.\n5: answers the question, correct, polite, no invented facts.\n" +
        "3: partly answers or vague.\n1: wrong, rude or invents facts.\n<ticket>$ticket</ticket>\n<reply>$reply</reply>",
    jsonSchema = JUDGE,
)).json()

fun main() {
    val report = evalTriage(AnthropicLanguageModel(), loadTickets())
    println("category accuracy: %.0f%%".format(report.categoryAccuracy * 100))
    println("urgency accuracy:  %.0f%%".format(report.urgencyAccuracy * 100))
    report.failures.forEach { println("  $it") }
    exitProcess(if (report.categoryAccuracy >= 0.8) 0 else 1)
}
