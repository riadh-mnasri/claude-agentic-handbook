// © 2026 Riadh MNASRI. MIT License.
package handbook.core

import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.core.JsonValue
import com.anthropic.models.messages.AssistantMessageParam
import com.anthropic.models.messages.CacheControlEphemeral
import com.anthropic.models.messages.ContentBlockParam
import com.anthropic.models.messages.JsonOutputFormat
import com.anthropic.models.messages.Message
import com.anthropic.models.messages.MessageCreateParams
import com.anthropic.models.messages.OutputConfig
import com.anthropic.models.messages.TextBlockParam
import com.anthropic.models.messages.Tool
import com.anthropic.models.messages.ToolResultBlockParam
import com.anthropic.models.messages.ToolUseBlockParam
import com.anthropic.models.messages.StopReason as SdkStopReason

/** Adapter: the only class that knows the Anthropic SDK. */
class AnthropicLanguageModel(
    private val client: AnthropicClient = AnthropicOkHttpClient.fromEnv(), // reads ANTHROPIC_API_KEY
    private val mainModel: String = System.getenv("HANDBOOK_MODEL") ?: "claude-opus-5-5",
    private val fastModel: String = System.getenv("HANDBOOK_FAST_MODEL") ?: "claude-haiku-5-5",
) : LanguageModel {

    override fun complete(request: ModelRequest): ModelResponse {
        val params = MessageCreateParams.builder()
            .model(if (request.tier == ModelTier.MAIN) mainModel else fastModel)
            .maxTokens(request.maxTokens)
        systemBlocks(request).takeIf { it.isNotEmpty() }?.let { params.systemOfTextBlockParams(it) }
        request.tools.forEach { params.addTool(it.toSdk()) }
        request.jsonSchema?.let { schema ->
            params.outputConfig(OutputConfig.builder().format(
                JsonOutputFormat.builder().schema(
                    JsonOutputFormat.Schema.builder()
                        .putAllAdditionalProperties(schema.mapValues { JsonValue.from(it.value) })
                        .build()
                ).build()
            ).build())
        }
        request.messages.forEach { params.append(it) }
        return client.messages().create(params.build()).toDomain()
    }

    private fun systemBlocks(request: ModelRequest): List<TextBlockParam> = listOfNotNull(
        request.system?.let { text ->
            TextBlockParam.builder().text(text)
                .apply { if (request.cacheSystem) cacheControl(CacheControlEphemeral.builder().build()) }
                .build()
        },
        request.systemSuffix?.let { TextBlockParam.builder().text(it).build() },
    )

    private fun MessageCreateParams.Builder.append(message: ChatMessage) {
        when (message) {
            is ChatMessage.User -> addUserMessage(message.text)
            is ChatMessage.Assistant -> addMessage(
                AssistantMessageParam.builder().contentOfContentBlockParams(message.blocks.map { it.toParam() }).build()
            )
            // All results of one turn travel in a single user message.
            is ChatMessage.ToolResults -> addUserMessageOfContentBlockParams(message.results.map { result ->
                ContentBlockParam.ofToolResult(
                    ToolResultBlockParam.builder()
                        .toolUseId(result.toolUseId)
                        .content(result.content)
                        .isError(result.isError)
                        .build()
                )
            })
        }
    }

    private fun Block.toParam(): ContentBlockParam = when (this) {
        is Block.Text -> ContentBlockParam.ofText(TextBlockParam.builder().text(text).build())
        is Block.Opaque -> raw as ContentBlockParam
        is Block.ToolUse -> ContentBlockParam.ofToolUse(
            ToolUseBlockParam.builder()
                .id(id)
                .name(name)
                .input(ToolUseBlockParam.Input.builder()
                    .putAllAdditionalProperties(input.mapValues { JsonValue.from(it.value) })
                    .build())
                .build()
        )
    }

    private fun ToolSpec.toSdk(): Tool = Tool.builder()
        .name(name)
        .description(description)
        .inputSchema(
            Tool.InputSchema.builder()
                .properties(JsonValue.from(properties))
                .required(required)
                .build()
        )
        .build()

    private fun Message.toDomain(): ModelResponse {
        val blocks = content().map { block ->
            block.text().map<Block> { Block.Text(it.text()) }
                .or { block.toolUse().map { use ->
                    @Suppress("UNCHECKED_CAST")
                    Block.ToolUse(use.id(), use.name(), use._input().convert(Map::class.java) as Map<String, Any?>)
                } }
                .orElse(Block.Opaque(block.toParam()))
        }
        val stop = when (stopReason().orElse(null)) {
            SdkStopReason.END_TURN -> StopReason.END_TURN
            SdkStopReason.TOOL_USE -> StopReason.TOOL_USE
            SdkStopReason.MAX_TOKENS -> StopReason.MAX_TOKENS
            SdkStopReason.REFUSAL -> StopReason.REFUSAL
            else -> StopReason.OTHER
        }
        val usage = usage()
        return ModelResponse(blocks, stop, Usage(usage.inputTokens(), usage.outputTokens(), usage.cacheReadInputTokens().orElse(0)))
    }
}
