// © 2026 Riadh MNASRI. MIT License.
// 11. An MCP server with the official Kotlin MCP SDK: expose the bookshop's
// read-only tools and the refund policy once, use them from any MCP client.
// Refunds are deliberately NOT exposed: give a client only what it needs.
//
// Run (stdio): ./gradlew -q run -Pexample=Ex11McpServer
// Register in Claude Code: claude mcp add paperleaf-kt -- ./gradlew -q -p kotlin run -Pexample=Ex11McpServer
// (-q matters: on stdio, anything else printed on stdout breaks the protocol)
package handbook.examples

import handbook.bookshop.Bookshop
import handbook.bookshop.Eligibility
import handbook.core.Json
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import io.modelcontextprotocol.kotlin.sdk.server.StdioServerTransport
import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.types.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.types.Implementation
import io.modelcontextprotocol.kotlin.sdk.types.ReadResourceResult
import io.modelcontextprotocol.kotlin.sdk.types.ServerCapabilities
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import io.modelcontextprotocol.kotlin.sdk.types.TextResourceContents
import io.modelcontextprotocol.kotlin.sdk.types.ToolAnnotations
import io.modelcontextprotocol.kotlin.sdk.types.ToolSchema
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.runBlocking
import kotlinx.io.asSink
import kotlinx.io.asSource
import kotlinx.io.buffered
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject

private val READ_ONLY = ToolAnnotations(readOnlyHint = true)

private fun text(value: Any?) = CallToolResult(content = listOf(TextContent(text = value as? String ?: Json.write(value))))

private fun CallToolRequest.string(name: String): String =
    arguments?.get(name)?.jsonPrimitive?.content ?: throw IllegalArgumentException("$name is required")

private fun orderIdSchema() = ToolSchema(
    properties = buildJsonObject {
        putJsonObject("order_id") { put("type", "string"); put("description", "Order id, format ORD-1234") }
    },
    required = listOf("order_id"),
)

fun createMcpServer(shop: Bookshop = Bookshop()): Server {
    val server = Server(
        Implementation(name = "paperleaf", version = "0.1.0"),
        ServerOptions(capabilities = ServerCapabilities(
            tools = ServerCapabilities.Tools(listChanged = false),
            resources = ServerCapabilities.Resources(subscribe = false, listChanged = false),
        )),
    )

    server.addTool(
        name = "get_order",
        description = "Look up an order by id (format ORD-1234): status, items, dates, total.",
        inputSchema = orderIdSchema(),
        toolAnnotations = READ_ONLY,
    ) { request -> text(shop.order(request.string("order_id")) ?: "No order ${request.string("order_id")}") }

    server.addTool(
        name = "search_catalog",
        description = "Search books by title, author or topic keywords. Stock 0 means out of stock.",
        inputSchema = ToolSchema(
            properties = buildJsonObject {
                putJsonObject("query") { put("type", "string") }
                putJsonObject("max_results") { put("type", "integer"); put("minimum", 1); put("maximum", 10) }
            },
            required = listOf("query"),
        ),
        toolAnnotations = READ_ONLY,
    ) { request ->
        val max = request.arguments?.get("max_results")?.jsonPrimitive?.int ?: 5
        text(shop.searchCatalog(request.string("query"), max))
    }

    server.addTool(
        name = "check_refund_eligibility",
        description = "Check if an order can be refunded under the shop policy, and up to which amount.",
        inputSchema = orderIdSchema(),
        toolAnnotations = READ_ONLY,
    ) { request ->
        text(when (val e = shop.refundEligibility(request.string("order_id"))) {
            is Eligibility.Refusal -> mapOf("eligible" to false, "reason" to e.reason)
            is Eligibility.Eligible -> mapOf("eligible" to true, "max_amount" to e.maxAmount, "needs_human_approval" to e.needsHumanApproval)
        })
    }

    server.addResource(
        uri = "paperleaf://policy",
        name = "refund-policy",
        description = "The shop's refund and shipping policy.",
        mimeType = "application/json",
    ) { request ->
        ReadResourceResult(contents = listOf(TextResourceContents(text = Json.write(shop.policy), uri = request.uri, mimeType = "application/json")))
    }
    return server
}

fun main(): Unit = runBlocking {
    // stdout is the protocol channel: keep the logging library's startup banner off it.
    System.setProperty("kotlin-logging.logStartupMessage", "false")
    val transport = StdioServerTransport(System.`in`.asSource().buffered(), System.out.asSink().buffered())
    val closed = CompletableDeferred<Unit>()
    val session = createMcpServer().createSession(transport)
    session.onClose { closed.complete(Unit) }
    closed.await()
}
