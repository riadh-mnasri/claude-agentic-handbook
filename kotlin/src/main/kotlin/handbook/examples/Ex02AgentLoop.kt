// © 2026 Riadh MNASRI. MIT License.
// 02. The agent loop, written by hand: call, run the tools asked for, send the
// results back, stop when the model answers without a tool.
// Run: ./gradlew run -Pexample=Ex02AgentLoop --args="What is the status of ORD-1003?"
package handbook.examples

import handbook.bookshop.Bookshop
import handbook.core.AnthropicLanguageModel
import handbook.core.ChatMessage
import handbook.core.Json
import handbook.core.LanguageModel
import handbook.core.ModelRequest
import handbook.core.StopReason
import handbook.core.ToolResult

private const val SUPPORT_SYSTEM = """You are the customer support assistant of Paperleaf Books.
Use the tools to check facts before answering. Never invent an order status,
a price or a stock level. Answer in the customer's language, briefly."""

private fun runTool(shop: Bookshop, name: String, args: Map<String, Any?>): String = when (name) {
    "get_order" -> {
        val id = args["order_id"] as? String ?: throw IllegalArgumentException("order_id is required")
        shop.order(id)?.let(Json::write) ?: "No order $id"
    }
    "search_catalog" -> Json.write(shop.searchCatalog(args["query"].toString(), (args["max_results"] as? Number)?.toInt() ?: 5))
    else -> throw IllegalArgumentException("Unknown tool $name")
}

fun answer(model: LanguageModel, question: String, shop: Bookshop = Bookshop(), maxTurns: Int = 8): String {
    val messages = mutableListOf<ChatMessage>(ChatMessage.User(question))
    repeat(maxTurns) { // always bound the loop
        val response = model.complete(ModelRequest(
            messages = messages.toList(),
            system = SUPPORT_SYSTEM,
            tools = listOf(Bookshop.GET_ORDER, Bookshop.SEARCH_CATALOG),
        ))
        messages += ChatMessage.Assistant(response.blocks) // keep everything, ids included
        if (response.stopReason != StopReason.TOOL_USE) return response.text()

        // Several tools may be asked at once: answer all of them in ONE message.
        messages += ChatMessage.ToolResults(response.toolUses.map { call ->
            try {
                ToolResult(call.id, runTool(shop, call.name, call.input))
            } catch (e: IllegalArgumentException) {
                ToolResult(call.id, e.message.orEmpty(), isError = true) // errors go back to the model
            }
        })
    }
    error("No answer after $maxTurns turns")
}

fun main(args: Array<String>) {
    println(answer(AnthropicLanguageModel(), args.joinToString(" ").ifBlank { "Where is ORD-1003, and do you have books on AI evals?" }))
}
