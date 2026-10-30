// © 2026 Riadh MNASRI. MIT License.
package handbook.core

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper

object Json {
    /** snake_case on the wire (like the JSON schemas), camelCase in Kotlin. */
    val mapper = jacksonObjectMapper()
        .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)

    fun write(value: Any?): String = mapper.writeValueAsString(value)
}

/** Small DSL so JSON schemas stay readable in Kotlin. */
fun obj(vararg properties: Pair<String, Any?>, required: List<String> = properties.map { it.first }) = mapOf(
    "type" to "object",
    "properties" to mapOf(*properties),
    "required" to required,
    "additionalProperties" to false,
)

fun string(description: String? = null) = listOfNotNull("type" to "string", description?.let { "description" to it }).toMap()
fun nullableString() = mapOf("type" to listOf("string", "null"))
fun enumOf(vararg values: String) = mapOf("type" to "string", "enum" to values.toList())
fun boolean() = mapOf("type" to "boolean")
fun integer(min: Int? = null, max: Int? = null) =
    listOfNotNull("type" to "integer", min?.let { "minimum" to it }, max?.let { "maximum" to it }).toMap()
fun arrayOf(items: Map<String, Any?>, maxItems: Int? = null) =
    listOfNotNull("type" to "array", "items" to items, maxItems?.let { "maxItems" to it }).toMap()
