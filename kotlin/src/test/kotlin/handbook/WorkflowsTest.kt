package handbook

import handbook.core.ModelTier
import handbook.core.RefusalException
import handbook.examples.GateFailed
import handbook.examples.ROUTES
import handbook.examples.TRIAGE_SCHEMA
import handbook.examples.Triage
import handbook.examples.checkReply
import handbook.examples.handle
import handbook.examples.isFraudSuspected
import handbook.examples.readingPlan
import handbook.examples.replyTo
import handbook.examples.triage
import handbook.examples.writeBlurb
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class WorkflowsTest {
    private val shipping = mapOf("category" to "shipping", "urgency" to "medium", "order_id" to "ORD-1002", "summary" to "Late parcel")

    @Test
    fun `01 triage sends the schema and parses the answer`() {
        // Given
        val model = FakeModel(json(shipping))
        // When
        val result = triage(model, "Where is ORD-1002?")
        // Then
        assertThat(result).isEqualTo(Triage("shipping", "medium", "ORD-1002", "Late parcel"))
        assertThat(model.calls.single().tier).isEqualTo(ModelTier.FAST)
        assertThat(model.calls.single().jsonSchema).isSameAs(TRIAGE_SCHEMA)
    }

    @Test
    fun `01 refusal is raised, not parsed`() {
        assertThatThrownBy { triage(FakeModel(refusal()), "...") }.isInstanceOf(RefusalException::class.java)
    }

    @Test
    fun `03 chain injects verified order data`() {
        val model = FakeModel(
            json(mapOf("order_id" to "ORD-1002", "customer_request" to "where is it", "tone" to "angry")),
            text("Your order ORD-1002 has shipped."),
            text("Hello! Your order ORD-1002 is on its way."),
        )
        assertThat(replyTo(model, "Where is ORD-1002??")).isEqualTo("Hello! Your order ORD-1002 is on its way.")
        assertThat(model.calls[1].prompt).contains("\"status\":\"shipped\"")
    }

    @Test
    fun `03 gates stop the chain early`() {
        val unknown = FakeModel(json(mapOf("order_id" to "ORD-9999", "customer_request" to "x", "tone" to "calm")))
        assertThatThrownBy { replyTo(unknown, "ORD-9999?") }.isInstanceOf(GateFailed::class.java)
        assertThat(unknown.calls).hasSize(1)

        val vague = FakeModel(json(mapOf("order_id" to "ORD-1002", "customer_request" to "x", "tone" to "calm")), text("It is coming."))
        assertThatThrownBy { replyTo(vague, "ORD-1002?") }.hasMessageContaining("order id")
    }

    @Test
    fun `04 refunds go to the main model with the refund prompt`() {
        val model = FakeModel(json(shipping + ("category" to "refund")), text("A specialist will help."))
        assertThat(handle(model, "Refund ORD-1003")).isEqualTo("refund" to "A specialist will help.")
        assertThat(model.calls[1].tier).isEqualTo(ModelTier.MAIN)
        assertThat(model.calls[1].system).isEqualTo(ROUTES.getValue("refund").system)
    }

    @Test
    fun `05 sectioning runs one check per guardrail and voting keeps the majority`() {
        val checks = FakeModel { json(mapOf("ok" to true, "issue" to null)) }
        assertThat(checkReply(checks, "Thanks for waiting").keys).containsExactly("tone", "promises", "privacy")
        assertThat(checks.calls).hasSize(3)

        val votes = ArrayDeque(listOf(true, false, true))
        assertThat(isFraudSuspected(FakeModel { json(mapOf("ok" to votes.removeFirst(), "issue" to null)) }, "refund now")).isTrue()
    }

    @Test
    fun `06 workers only see the books of their subtask`() {
        val plan = mapOf("subtasks" to listOf(
            mapOf("title" to "Start", "search_query" to "agents", "instructions" to "basics"),
            mapOf("title" to "Testing", "search_query" to "evals", "instructions" to "how to test"),
        ))
        val model = FakeModel { request ->
            when {
                request.jsonSchema != null -> json(plan)
                request.prompt.startsWith("Section:") -> text("section about " + request.prompt.lineSequence().first())
                else -> text("final plan")
            }
        }
        assertThat(readingPlan(model, "learn agents")).isEqualTo("final plan")
        val workers = model.calls.map { it.prompt }.filter { it.startsWith("Section:") }
        assertThat(workers).hasSize(2)
        assertThat(workers.first { "Testing" in it }).contains("Evals Before Vibes").doesNotContain("A Quiet Garden")
    }

    @Test
    fun `07 loops with feedback until the evaluator passes, within a round budget`() {
        val model = FakeModel(
            text("The best book ever!"),
            json(mapOf("passed" to false, "failed_criteria" to listOf(4), "feedback" to "Remove 'best'.")),
            text("A clear guide by Omar Benali..."),
            json(mapOf("passed" to true, "failed_criteria" to emptyList<Int>(), "feedback" to "")),
        )
        val outcome = writeBlurb(model, "Evals Before Vibes by Omar Benali")
        assertThat(outcome.passed to outcome.rounds).isEqualTo(true to 2)
        assertThat(model.calls[2].prompt).contains("Remove 'best'.")

        val never = FakeModel { if (it.jsonSchema != null) json(mapOf("passed" to false, "failed_criteria" to listOf(1), "feedback" to "no")) else text("draft") }
        assertThat(writeBlurb(never, "t", maxRounds = 2).let { it.passed to it.rounds }).isEqualTo(false to 2)
    }
}
