// © 2026 Riadh MNASRI. MIT License.
package handbook.core

/**
 * A reusable, hardened agent loop. Example 02 shows the bare loop; this one adds
 * a permission policy per tool, human approval for risky tools, untrusted-data
 * wrapping, a turn limit, repeated-call detection and a token tally.
 */
enum class Permission { ALLOW, ASK, DENY }

class AgentTool(
    val spec: ToolSpec,
    val permission: Permission = Permission.ALLOW,
    /** Results that may contain text written by third parties (customers, web pages...). */
    val untrustedOutput: Boolean = false,
    val handler: (Map<String, Any?>) -> Any?,
)

fun interface Approver {
    fun approve(tool: String, input: Map<String, Any?>): Boolean

    companion object {
        val DENY_ALL = Approver { _, _ -> false }
    }
}

data class AgentResult(
    val text: String,
    val turns: Int,
    val toolCalls: List<Pair<String, Map<String, Any?>>>,
    val inputTokens: Long,
    val outputTokens: Long,
)

class AgentStuck(maxTurns: Int) : RuntimeException("No final answer after $maxTurns turns")

class Agent(
    private val model: LanguageModel,
    private val system: String,
    tools: List<AgentTool>,
    private val maxTurns: Int = 10,
    private val maxIdenticalCalls: Int = 2,
    private val approver: Approver = Approver.DENY_ALL,
    private val onEvent: (String) -> Unit = {},
) {
    private val tools = tools.associateBy { it.spec.name }

    fun run(prompt: String): AgentResult {
        val messages = mutableListOf<ChatMessage>(ChatMessage.User(prompt))
        val calls = mutableListOf<Pair<String, Map<String, Any?>>>()
        val seen = mutableMapOf<Pair<String, Map<String, Any?>>, Int>()
        var input = 0L
        var output = 0L

        for (turn in 1..maxTurns) {
            val response = model.complete(ModelRequest(
                messages = messages.toList(),
                system = system,
                cacheSystem = true,
                tools = tools.values.map { it.spec },
            ))
            input += response.usage.inputTokens
            output += response.usage.outputTokens
            if (response.stopReason == StopReason.REFUSAL) throw RefusalException("Claude declined the request")
            // Append the full content: tool_use ids (and thinking) must round-trip.
            messages += ChatMessage.Assistant(response.blocks)

            if (response.stopReason != StopReason.TOOL_USE) {
                return AgentResult(response.text(), turn, calls, input, output)
            }
            // All results of one turn go back in a single message.
            messages += ChatMessage.ToolResults(response.toolUses.map { call ->
                calls += call.name to call.input
                onEvent("tool ${call.name} ${call.input}")
                val count = seen.merge(call.name to call.input, 1, Int::plus)!!
                execute(call, repeated = count > maxIdenticalCalls)
            })
        }
        throw AgentStuck(maxTurns)
    }

    private fun execute(call: Block.ToolUse, repeated: Boolean): ToolResult {
        fun error(text: String) = ToolResult(call.id, text, isError = true).also { onEvent("  -> error: $text") }
        val tool = tools[call.name] ?: return error("Unknown tool ${call.name}")
        if (repeated) return error("Same call already made twice. Use the previous result or change approach.")
        if (tool.permission == Permission.DENY) return error("Tool ${call.name} is disabled by policy")
        if (tool.permission == Permission.ASK && !approver.approve(call.name, call.input)) {
            return error("A human reviewer rejected this action. Explain it to the customer.")
        }
        val result = try {
            tool.handler(call.input)
        } catch (e: RuntimeException) {
            // Errors are information for the model: send them back, do not crash.
            return error(e.message ?: e.toString())
        }
        val content = result as? String ?: Json.write(result)
        return ToolResult(call.id, if (tool.untrustedOutput) "<untrusted_data>\n$content\n</untrusted_data>" else content)
    }
}
