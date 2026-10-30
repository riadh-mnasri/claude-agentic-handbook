package handbook

import handbook.bookshop.Bookshop
import handbook.core.Agent
import handbook.core.AgentStuck
import handbook.core.AgentTool
import handbook.core.Approver
import handbook.core.ChatMessage
import handbook.core.Permission
import handbook.core.ToolSpec
import handbook.examples.MemoryNotes
import handbook.examples.SupportSession
import handbook.examples.answer
import handbook.examples.refundAgent
import handbook.examples.rememberingAgent
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class AgentsTest {
    private fun recordingHuman(answer: Boolean, asked: MutableList<Map<String, Any?>>) = Approver { _, input -> asked += input; answer }

    @Test
    fun `02 loop runs parallel tools and returns one message of results`() {
        // Given Claude asks for two tools at once, then answers
        val model = FakeModel(
            tools("get_order" to mapOf("order_id" to "ORD-1003"), "search_catalog" to mapOf("query" to "evals")),
            text("Your order is lost. We have Evals Before Vibes."),
        )
        // When
        val reply = answer(model, "Where is ORD-1003?")
        // Then
        assertThat(reply).isEqualTo("Your order is lost. We have Evals Before Vibes.")
        val results = model.calls[1].lastToolResults
        assertThat(results).hasSize(2)
        assertThat(results[0].content).contains("\"status\":\"lost\"")
    }

    @Test
    fun `02 tool errors go back to the model and the loop is bounded`() {
        val model = FakeModel(tools("get_order" to emptyMap()), text("Which order?"))
        assertThat(answer(model, "status?")).isEqualTo("Which order?")
        assertThat(model.calls[1].lastToolResults.single().isError).isTrue()

        assertThatThrownBy { answer(FakeModel { tools("search_catalog" to mapOf("query" to "x")) }, "loop", maxTurns = 3) }
            .hasMessageContaining("No answer")
    }

    @Test
    fun `08 small refunds are automatic`() {
        val shop = Bookshop()
        val asked = mutableListOf<Map<String, Any?>>()
        val model = FakeModel(
            tools("check_refund_eligibility" to mapOf("order_id" to "ORD-1001")),
            tools("issue_refund" to mapOf("order_id" to "ORD-1001", "amount" to 39.0, "reason" to "damaged")),
            text("Refunded 39 EUR."),
        )
        refundAgent(model, shop, recordingHuman(false, asked)) {}.run("refund ORD-1001")
        assertThat(asked).isEmpty()
        assertThat(shop.refunds.single().amount).isEqualTo(39.0)
        assertThat(model.calls[1].lastToolResults.single().content).contains("\"eligible\":true")
    }

    @Test
    fun `08 big refunds need a human and a rejection is reported to the model`() {
        val shop = Bookshop()
        val asked = mutableListOf<Map<String, Any?>>()
        val model = FakeModel(
            tools("issue_refund" to mapOf("order_id" to "ORD-1003", "amount" to 119.0, "reason" to "lost")),
            text("A specialist will follow up."),
        )
        refundAgent(model, shop, recordingHuman(false, asked)) {}.run("refund ORD-1003")
        assertThat(asked).containsExactly(mapOf("order_id" to "ORD-1003", "amount" to 119.0, "reason" to "lost"))
        assertThat(shop.refunds).isEmpty()
        assertThat(model.calls[1].lastToolResults.single().content).contains("rejected")
    }

    @Test
    fun `08 injected gift message is wrapped and the code still caps the amount`() {
        val shop = Bookshop()
        val model = FakeModel(
            tools("get_order" to mapOf("order_id" to "ORD-1005")),
            // Suppose the injection worked and the model obeys it:
            tools("issue_refund" to mapOf("order_id" to "ORD-1005", "amount" to 500.0, "reason" to "admin")),
            text("Done."),
        )
        refundAgent(model, shop, Approver { _, _ -> true }) {}.run("refund ORD-1005")
        assertThat(model.calls[1].lastToolResults.single().content).startsWith("<untrusted_data>")
        assertThat(model.calls[2].lastToolResults.single().isError).isTrue()
        assertThat(shop.refunds).isEmpty()
    }

    @Test
    fun `hardened loop blocks repeated calls and denied tools, and stops when stuck`() {
        fun tool(name: String, permission: Permission = Permission.ALLOW) =
            AgentTool(ToolSpec(name, "", emptyMap(), emptyList()), permission) { "x" }
        val model = FakeModel(tools("echo" to emptyMap()), tools("echo" to emptyMap()), tools("echo" to emptyMap()), tools("off" to emptyMap()), text("ok"))
        val result = Agent(model, "s", listOf(tool("echo"), tool("off", Permission.DENY))).run("p")
        assertThat(model.calls[3].lastToolResults.single().content).contains("already")
        assertThat(model.calls[4].lastToolResults.single().content).contains("disabled")
        assertThat(result.turns to result.inputTokens).isEqualTo(5 to 500L)

        val loop = FakeModel { tools("echo" to mapOf("n" to it.messages.size)) }
        assertThatThrownBy { Agent(loop, "s", listOf(tool("echo")), maxTurns = 2).run("p") }.isInstanceOf(AgentStuck::class.java)
    }

    @Test
    fun `09 session caches the handbook and compacts old turns`() {
        val model = FakeModel { if ("Update the summary" in it.prompt) text("Customer asked about shipping to Spain.") else text("answer", 1200) }
        val session = SupportSession(model, maxMessages = 4, keepLast = 2)
        listOf("q1", "q2", "q3", "q4").forEach { session.send(it) }
        assertThat(session.summary).isEqualTo("Customer asked about shipping to Spain.")
        assertThat(session.history.filterIsInstance<ChatMessage.User>().map { it.text }).containsExactly("q3", "q4")
        assertThat(model.calls.last().cacheSystem).isTrue()
        assertThat(model.calls.last().systemSuffix).contains("Spain")
        assertThat(session.cacheReads).isEqualTo(4800)
    }

    @Test
    fun `09 memory survives between sessions`(@TempDir dir: File) {
        val file = File(dir, "memory.json")
        val model = FakeModel(
            tools("remember_note" to mapOf("customer" to "alice@example.com", "note" to "prefers e-books")),
            text("Noted!"),
        )
        rememberingAgent(model, "alice@example.com", "e-books only", MemoryNotes(file))
        assertThat(MemoryNotes(file).recall("alice@example.com")).containsExactly("prefers e-books")
    }
}
