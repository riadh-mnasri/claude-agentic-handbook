// © 2026 Riadh MNASRI. MIT License.
// 03. Prompt chaining: fixed steps with code gates in between.
// Steps: extract facts -> gate -> draft reply -> gate -> polish.
// Run: ./gradlew run -Pexample=Ex03PromptChaining
package handbook.examples

import handbook.bookshop.Bookshop
import handbook.core.AnthropicLanguageModel
import handbook.core.Json
import handbook.core.LanguageModel
import handbook.core.ModelRequest
import handbook.core.ModelTier
import handbook.core.enumOf
import handbook.core.nullableString
import handbook.core.obj
import handbook.core.string

data class Facts(val orderId: String?, val customerRequest: String, val tone: String)

class GateFailed(message: String) : RuntimeException(message)

private val FACTS_SCHEMA = obj("order_id" to nullableString(), "customer_request" to string(), "tone" to enumOf("calm", "annoyed", "angry"))

fun replyTo(model: LanguageModel, ticket: String, shop: Bookshop = Bookshop()): String {
    // Step 1: extraction, small model, strict schema.
    val facts = model.complete(ModelRequest.ask(
        "Extract the facts of this ticket:\n<ticket>$ticket</ticket>", ModelTier.FAST, jsonSchema = FACTS_SCHEMA,
    )).json<Facts>()

    // Gate 1: deterministic check, no model involved.
    val order = facts.orderId?.let { shop.order(it) ?: throw GateFailed("Ticket mentions unknown order $it") }

    // Step 2: draft, with the verified data injected.
    val draft = model.complete(ModelRequest.ask(
        """
        Customer request: ${facts.customerRequest}
        Customer tone: ${facts.tone}
        Order data: ${Json.write(order)}
        Write a reply of at most 120 words. Mention the order id if there is one.
        """.trimIndent(),
        system = "You write replies for Paperleaf Books support. Use only the facts given.",
    )).text()

    // Gate 2: the draft must reference the order and stay short.
    if (order != null && order.id !in draft) throw GateFailed("Draft does not mention the order id")
    if (draft.split(Regex("\\s+")).size > 160) throw GateFailed("Draft too long")

    // Step 3: polish, a narrow rewrite task for the small model.
    return model.complete(ModelRequest.ask(
        "Fix grammar and make this reply warmer without adding facts. Return only the reply.\n<reply>$draft</reply>",
        ModelTier.FAST,
    )).text()
}

fun main() {
    println(replyTo(AnthropicLanguageModel(), "Where is my order ORD-1002?? It's been days, this is ridiculous."))
}
