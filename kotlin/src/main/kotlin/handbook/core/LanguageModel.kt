// © 2026 Riadh MNASRI. MIT License.
package handbook.core

/**
 * Secondary port: what the examples need from a language model.
 *
 * The domain and the workflows only see these types. The Anthropic SDK lives in
 * one adapter ([AnthropicLanguageModel]), and tests plug a scripted fake.
 */
fun interface LanguageModel {
    fun complete(request: ModelRequest): ModelResponse
}

/** Main model for judgment-heavy steps, fast model for narrow high-volume ones. */
enum class ModelTier { MAIN, FAST }

data class ModelRequest(
    val messages: List<ChatMessage>,
    val system: String? = null,
    /** Appended after the (cacheable) system prompt: volatile content goes here. */
    val systemSuffix: String? = null,
    val tools: List<ToolSpec> = emptyList(),
    /** When set, the answer is constrained to this JSON schema. */
    val jsonSchema: Map<String, Any?>? = null,
    val tier: ModelTier = ModelTier.MAIN,
    val maxTokens: Long = 16_000,
    val cacheSystem: Boolean = false,
) {
    companion object {
        fun ask(prompt: String, tier: ModelTier = ModelTier.MAIN, system: String? = null, jsonSchema: Map<String, Any?>? = null) =
            ModelRequest(listOf(ChatMessage.User(prompt)), system = system, tier = tier, jsonSchema = jsonSchema)
    }
}

sealed interface ChatMessage {
    data class User(val text: String) : ChatMessage
    data class Assistant(val blocks: List<Block>) : ChatMessage
    data class ToolResults(val results: List<ToolResult>) : ChatMessage
}

sealed interface Block {
    data class Text(val text: String) : Block
    data class ToolUse(val id: String, val name: String, val input: Map<String, Any?>) : Block
    /**
     * Any other block (thinking, server tools...). Never inspected, but sent back
     * unchanged: recent models reject a replayed history whose thinking was edited.
     */
    data class Opaque(val raw: Any) : Block
}

data class ToolResult(val toolUseId: String, val content: String, val isError: Boolean = false)

data class ToolSpec(
    val name: String,
    val description: String,
    val properties: Map<String, Any?>,
    val required: List<String>,
)

enum class StopReason { END_TURN, TOOL_USE, MAX_TOKENS, REFUSAL, OTHER }

data class Usage(val inputTokens: Long, val outputTokens: Long, val cacheReadTokens: Long = 0)

data class ModelResponse(val blocks: List<Block>, val stopReason: StopReason, val usage: Usage = Usage(0, 0)) {
    val toolUses: List<Block.ToolUse> get() = blocks.filterIsInstance<Block.ToolUse>()

    /** Text of the answer, failing loudly when the content is unusable. */
    fun text(): String {
        when (stopReason) {
            StopReason.REFUSAL -> throw RefusalException("Claude declined the request")
            StopReason.MAX_TOKENS -> error("Response truncated by max tokens: raise the limit or stream")
            else -> Unit
        }
        return blocks.filterIsInstance<Block.Text>().joinToString("") { it.text }
    }

    /** Parse an answer produced with a JSON schema. */
    inline fun <reified T> json(): T = Json.mapper.readValue(text(), T::class.java)
}

class RefusalException(message: String) : RuntimeException(message)
