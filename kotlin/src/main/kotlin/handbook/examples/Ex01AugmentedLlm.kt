// © 2026 Riadh MNASRI. MIT License.
// 01. The augmented LLM: one call, a clear instruction, a guaranteed JSON shape.
// Run: ./gradlew run -Pexample=Ex01AugmentedLlm --args="My parcel ORD-1002 is late"
package handbook.examples

import handbook.core.AnthropicLanguageModel
import handbook.core.LanguageModel
import handbook.core.ModelRequest
import handbook.core.ModelTier
import handbook.core.enumOf
import handbook.core.nullableString
import handbook.core.obj
import handbook.core.string

data class Triage(val category: String, val urgency: String, val orderId: String?, val summary: String)

val CATEGORIES = listOf("billing", "shipping", "refund", "product", "account", "other")

val TRIAGE_SCHEMA = obj(
    "category" to enumOf(*CATEGORIES.toTypedArray()),
    "urgency" to enumOf("low", "medium", "high"),
    "order_id" to nullableString(),
    "summary" to string("One sentence, in English"),
)

private val TRIAGE_SYSTEM = """
    You triage customer support tickets for Paperleaf Books, an online bookshop.
    Urgency is high when money was taken wrongly, a parcel is lost or a deadline is today;
    medium when the customer is blocked or waiting; low for questions and feedback.
""".trimIndent()

fun triage(model: LanguageModel, ticket: String): Triage = model.complete(
    ModelRequest.ask(
        "<ticket>\n$ticket\n</ticket>",
        tier = ModelTier.FAST, // narrow, high-volume task: the small model is enough
        system = TRIAGE_SYSTEM,
        jsonSchema = TRIAGE_SCHEMA,
    ).copy(maxTokens = 1024)
).json()

fun main(args: Array<String>) {
    println(triage(AnthropicLanguageModel(), args.joinToString(" ").ifBlank { "I was charged twice for ORD-1001." }))
}
