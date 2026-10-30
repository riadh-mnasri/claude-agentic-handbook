// © 2026 Riadh MNASRI. MIT License.
// 07. Evaluator-optimizer: one model writes, another grades against an explicit
// rubric, loop until it passes or the round budget is spent.
// Run: ./gradlew run -Pexample=Ex07EvaluatorOptimizer
package handbook.examples

import handbook.core.AnthropicLanguageModel
import handbook.core.LanguageModel
import handbook.core.ModelRequest
import handbook.core.ModelTier
import handbook.core.arrayOf
import handbook.core.boolean
import handbook.core.integer
import handbook.core.obj
import handbook.core.string

val RUBRIC = """
    1. Between 40 and 80 words.
    2. Mentions the title and the author exactly.
    3. Says who the book is for.
    4. No superlatives such as "best", "ultimate", "must-read".
    5. Ends with a call to action.
""".trimIndent()

data class Evaluation(val passed: Boolean, val failedCriteria: List<Int>, val feedback: String)
data class Outcome(val text: String, val passed: Boolean, val rounds: Int)

private val EVALUATION = obj("passed" to boolean(), "failed_criteria" to arrayOf(integer()), "feedback" to string())

fun writeBlurb(model: LanguageModel, book: String, maxRounds: Int = 3): Outcome {
    var draft = ""
    var feedback = ""
    for (round in 1..maxRounds) {
        val retry = if (feedback.isEmpty()) "" else "Previous draft:\n$draft\nReviewer feedback:\n$feedback\n"
        draft = model.complete(ModelRequest.ask(
            "Book: $book\n${retry}Return only the blurb.",
            system = "You write catalog blurbs for Paperleaf Books. Rules:\n$RUBRIC",
        )).text()
        // A different, cheaper model grades against the same explicit rubric.
        val verdict = model.complete(ModelRequest.ask(
            "Grade this blurb strictly against the rubric.\nRubric:\n$RUBRIC\nBook: $book\n<blurb>$draft</blurb>",
            ModelTier.FAST,
            jsonSchema = EVALUATION,
        )).json<Evaluation>()
        if (verdict.passed) return Outcome(draft, true, round)
        feedback = verdict.feedback
    }
    return Outcome(draft, false, maxRounds)
}

fun main() {
    val outcome = writeBlurb(AnthropicLanguageModel(), "Evals Before Vibes by Omar Benali (ai, testing)")
    println("passed=${outcome.passed} after ${outcome.rounds} round(s)\n${outcome.text}")
}
