// © 2026 Riadh MNASRI. MIT License.
// 04. Routing: classify first, then hand over to a specialised prompt and model.
// Run: ./gradlew run -Pexample=Ex04Routing --args="Can I change my email address?"
package handbook.examples

import handbook.core.AnthropicLanguageModel
import handbook.core.LanguageModel
import handbook.core.ModelRequest
import handbook.core.ModelTier

data class Route(val tier: ModelTier, val system: String)

val ROUTES = mapOf(
    "billing" to Route(ModelTier.MAIN, "You handle billing issues. Be precise about amounts. Never promise a refund: say a specialist will confirm within 24 hours."),
    "refund" to Route(ModelTier.MAIN, "You handle refund requests. Explain the 30-day refund policy and the next step. Never confirm a refund yourself."),
    "shipping" to Route(ModelTier.FAST, "You handle delivery questions. Give the standard delays: 2-4 working days in France, 5-8 in the EU."),
    "product" to Route(ModelTier.FAST, "You recommend books from Paperleaf's catalog. Be enthusiastic, short."),
    "account" to Route(ModelTier.FAST, "You help with account settings. Account changes are done in Settings > Profile. Password resets expire after 1 hour."),
    "other" to Route(ModelTier.FAST, "You answer politely and briefly."),
)

fun handle(model: LanguageModel, ticket: String): Pair<String, String> {
    val category = triage(model, ticket).category
    val route = ROUTES[category] ?: ROUTES.getValue("other")
    return category to model.complete(ModelRequest.ask(ticket, route.tier, system = route.system)).text()
}

fun main(args: Array<String>) {
    val (category, reply) = handle(AnthropicLanguageModel(), args.joinToString(" ").ifBlank { "How do I change my email?" })
    println("[route: $category]\n$reply")
}
