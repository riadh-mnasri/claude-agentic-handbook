package handbook

import handbook.examples.createMcpServer
import io.modelcontextprotocol.kotlin.sdk.client.Client
import io.modelcontextprotocol.kotlin.sdk.client.StdioClientTransport
import io.modelcontextprotocol.kotlin.sdk.server.StdioServerTransport
import io.modelcontextprotocol.kotlin.sdk.types.Implementation
import io.modelcontextprotocol.kotlin.sdk.types.ReadResourceRequest
import io.modelcontextprotocol.kotlin.sdk.types.ReadResourceRequestParams
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import io.modelcontextprotocol.kotlin.sdk.types.TextResourceContents
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.io.asSink
import kotlinx.io.asSource
import kotlinx.io.buffered
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.io.PipedInputStream
import java.io.PipedOutputStream

class McpServerTest {
    @Test
    fun `11 kotlin MCP server exposes read-only tools and the policy resource`(): Unit = runBlocking {
        withTimeout(20_000) {
            // Given a server and a client wired back to back through two pipes (what stdio does between processes)
            val clientToServer = PipedOutputStream()
            val serverToClient = PipedOutputStream()
            val serverIn = PipedInputStream(clientToServer, 65_536)
            val clientIn = PipedInputStream(serverToClient, 65_536)
            createMcpServer().createSession(StdioServerTransport(serverIn.asSource().buffered(), serverToClient.asSink().buffered()))
            val client = Client(Implementation(name = "test", version = "1.0.0"))
            client.connect(StdioClientTransport(clientIn.asSource().buffered(), clientToServer.asSink().buffered()))

            // When / Then
            val tools = client.listTools().tools
            assertThat(tools.map { it.name }).containsExactlyInAnyOrder("get_order", "search_catalog", "check_refund_eligibility")
            assertThat(tools.all { it.annotations?.readOnlyHint == true }).isTrue()

            val order = client.callTool("get_order", mapOf("order_id" to "ORD-1003"))
            assertThat((order.content.single() as TextContent).text).contains("\"status\":\"lost\"")

            val eligibility = client.callTool("check_refund_eligibility", mapOf("order_id" to "ORD-1004"))
            assertThat((eligibility.content.single() as TextContent).text).contains("Outside the refund window")

            val policy = client.readResource(ReadResourceRequest(ReadResourceRequestParams(uri = "paperleaf://policy")))
            assertThat((policy.contents.single() as TextResourceContents).text).contains("\"refund_window_days\":30")
            client.close()
        }
    }
}
