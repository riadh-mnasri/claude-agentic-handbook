// © 2026 Riadh MNASRI. MIT License.
package handbook

import handbook.core.Block
import handbook.core.ChatMessage
import handbook.core.Json
import handbook.core.LanguageModel
import handbook.core.ModelRequest
import handbook.core.ModelResponse
import handbook.core.StopReason
import handbook.core.Usage
import java.util.Collections
import java.util.concurrent.atomic.AtomicInteger

private val ids = AtomicInteger()

fun text(value: String, cacheRead: Long = 0) = ModelResponse(listOf(Block.Text(value)), StopReason.END_TURN, Usage(100, 20, cacheRead))
fun json(value: Any) = text(Json.write(value))
fun refusal() = ModelResponse(emptyList(), StopReason.REFUSAL)
fun tools(vararg calls: Pair<String, Map<String, Any?>>) = ModelResponse(
    calls.map { (name, input) -> Block.ToolUse("toolu_${ids.incrementAndGet()}", name, input) },
    StopReason.TOOL_USE,
    Usage(100, 20),
)

/** Scripted model: a fixed list of answers, or a function of the request (parallel code). */
class FakeModel private constructor(
    private val script: ArrayDeque<ModelResponse>?,
    private val responder: ((ModelRequest) -> ModelResponse)?,
) : LanguageModel {
    constructor(vararg answers: ModelResponse) : this(ArrayDeque(answers.toList()), null)
    constructor(responder: (ModelRequest) -> ModelResponse) : this(null, responder)

    val calls: MutableList<ModelRequest> = Collections.synchronizedList(mutableListOf())

    @Synchronized
    override fun complete(request: ModelRequest): ModelResponse {
        calls += request
        return responder?.invoke(request) ?: script!!.removeFirstOrNull() ?: error("Unexpected extra call")
    }
}

val ModelRequest.prompt: String
    get() = when (val last = messages.last()) {
        is ChatMessage.User -> last.text
        else -> last.toString()
    }

val ModelRequest.lastToolResults get() = (messages.last() as ChatMessage.ToolResults).results
