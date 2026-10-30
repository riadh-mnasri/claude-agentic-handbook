// © 2026 Riadh MNASRI. MIT License.
// 09. Context engineering: prompt caching, compaction and long-term memory.
// - The stable system prompt is cached; volatile content (the running summary)
//   goes after it. Prefixes below the model's minimum size are not cached.
// - When the history grows, older turns are replaced by a summary.
// - Durable facts go to a store the agent reads and writes through tools.
// Run: ./gradlew run -Pexample=Ex09ContextMemory
package handbook.examples

import handbook.core.Agent
import handbook.core.AgentTool
import handbook.core.AnthropicLanguageModel
import handbook.core.Block
import handbook.core.ChatMessage
import handbook.core.Json
import handbook.core.LanguageModel
import handbook.core.ModelRequest
import handbook.core.ModelTier
import handbook.core.ToolSpec
import java.io.File

val POLICY_HANDBOOK = """
    You are the support assistant of Paperleaf Books.
    Refunds: 30 days after delivery, or when a parcel is lost.
    Shipping: 2-4 working days in France, 5-8 in the EU. Free above 35 EUR.
    Tone: warm, brief, no jargon.
""".trimIndent()

class SupportSession(private val model: LanguageModel, private val maxMessages: Int = 8, private val keepLast: Int = 4) {
    var summary = ""
        private set
    var history = listOf<ChatMessage>()
        private set
    var cacheReads = 0L
        private set

    fun send(text: String): String {
        history = history + ChatMessage.User(text)
        val response = model.complete(ModelRequest(
            messages = history,
            system = POLICY_HANDBOOK,
            cacheSystem = true,
            systemSuffix = summary.takeIf { it.isNotEmpty() }?.let { "Summary of the conversation so far:\n$it" },
            maxTokens = 4000,
        ))
        cacheReads += response.usage.cacheReadTokens
        val reply = response.text()
        history = history + ChatMessage.Assistant(listOf(Block.Text(reply)))
        if (history.size > maxMessages) compact()
        return reply
    }

    private fun compact() {
        val transcript = history.dropLast(keepLast).joinToString("\n") {
            when (it) {
                is ChatMessage.User -> "user: ${it.text}"
                is ChatMessage.Assistant -> "assistant: " + it.blocks.filterIsInstance<Block.Text>().joinToString("") { b -> b.text }
                is ChatMessage.ToolResults -> ""
            }
        }
        summary = model.complete(ModelRequest.ask(
            "Previous summary:\n${summary.ifEmpty { "(none)" }}\n\nNew turns:\n$transcript\n\n" +
                "Update the summary. Keep order ids, amounts, promises made and open questions. Drop small talk. Max 120 words.",
            ModelTier.FAST,
        )).text()
        history = history.takeLast(keepLast) // starts with a user message: keepLast is even
    }
}

/** Long-term memory: a JSON file of notes per customer, exposed as tools. */
class MemoryNotes(private val file: File) {
    @Suppress("UNCHECKED_CAST")
    private fun load(): MutableMap<String, MutableList<String>> =
        if (file.exists()) Json.mapper.readValue(file, MutableMap::class.java) as MutableMap<String, MutableList<String>> else mutableMapOf()

    fun remember(customer: String, note: String): String {
        val notes = load()
        notes.getOrPut(customer) { mutableListOf() } += note
        file.writeText(Json.write(notes))
        return "saved"
    }

    fun recall(customer: String): List<String> = load()[customer].orEmpty()

    fun tools(): List<AgentTool> {
        val customer = mapOf("type" to "string", "description" to "Customer email")
        return listOf(
            AgentTool(ToolSpec("recall_notes", "Read what we know about a customer from past conversations. Call it at the start of a conversation.",
                mapOf("customer" to customer), listOf("customer"))) { recall(it["customer"].toString()) },
            AgentTool(ToolSpec("remember_note", "Save a durable fact about a customer (preference, recurring issue). Not for one-off details.",
                mapOf("customer" to customer, "note" to mapOf("type" to "string")), listOf("customer", "note"))) {
                remember(it["customer"].toString(), it["note"].toString())
            },
        )
    }
}

fun rememberingAgent(model: LanguageModel, customer: String, message: String, notes: MemoryNotes): String =
    Agent(model, POLICY_HANDBOOK, notes.tools()).run("Customer $customer writes: $message").text

fun main() {
    val model = AnthropicLanguageModel()
    val session = SupportSession(model)
    listOf("Hi! How long does shipping to Spain take?", "And is it free for 30 EUR?", "OK. What if my parcel gets lost?",
        "Thanks. Remind me the delays for France?", "Perfect, last one: refund window after delivery?").forEach {
        println("> $it\n${session.send(it)}\n")
    }
    println("cached tokens read: ${session.cacheReads}, summary: ${session.summary}")
    println(rememberingAgent(model, "alice@example.com", "I only read e-books from now on.", MemoryNotes(File(".memory.json"))))
}
