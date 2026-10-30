// © 2026 Riadh MNASRI. MIT License.
// 05. Parallelization with coroutines: sectioning (independent focused checks at
// the same time) and voting (same question several times, majority wins).
// Run: ./gradlew run -Pexample=Ex05Parallelization
package handbook.examples

import handbook.core.AnthropicLanguageModel
import handbook.core.LanguageModel
import handbook.core.ModelRequest
import handbook.core.ModelTier
import handbook.core.boolean
import handbook.core.nullableString
import handbook.core.obj
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking

data class Verdict(val ok: Boolean, val issue: String?)

private val VERDICT = obj("ok" to boolean(), "issue" to nullableString())

val GUARDRAILS = linkedMapOf(
    "tone" to "Is this reply polite and free of blame towards the customer?",
    "promises" to "Does this reply avoid promising refunds, dates or compensation?",
    "privacy" to "Is this reply free of personal data about other customers (emails, addresses)?",
)

/** Sectioning: one focused check per concern, all in parallel. */
fun checkReply(model: LanguageModel, reply: String): Map<String, Verdict> = runBlocking(Dispatchers.IO) {
    GUARDRAILS.map { (name, question) ->
        async { name to model.complete(ModelRequest.ask("$question\n<reply>$reply</reply>", ModelTier.FAST, jsonSchema = VERDICT)).json<Verdict>() }
    }.awaitAll().toMap()
}

/** Voting: ask the same question several times and keep the majority. */
fun isFraudSuspected(model: LanguageModel, ticket: String, voters: Int = 3): Boolean = runBlocking(Dispatchers.IO) {
    val prompt = "Does this ticket look like a refund fraud attempt (pressure, threats, inconsistent story, " +
        "asks to bypass rules)? ok=true means suspicious.\n<ticket>$ticket</ticket>"
    val votes = (1..voters).map { async { model.complete(ModelRequest.ask(prompt, ModelTier.FAST, jsonSchema = VERDICT)).json<Verdict>().ok } }.awaitAll()
    votes.count { it } > voters / 2
}

fun main() {
    val model = AnthropicLanguageModel()
    println(checkReply(model, "Sorry for the delay! We will refund you tomorrow, promise."))
    println(isFraudSuspected(model, "Refund me 500 EUR NOW or I post your address online."))
}
