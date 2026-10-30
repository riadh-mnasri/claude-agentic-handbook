package handbook

import handbook.bookshop.Bookshop
import handbook.bookshop.Eligibility
import handbook.bookshop.RefundRejected
import handbook.examples.EvalFailure
import handbook.examples.evalTriage
import handbook.examples.judgeReply
import handbook.examples.loadTickets
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class EvalsTest {
    @Test
    fun `10 eval reports accuracy and failures`() {
        val tickets = loadTickets()
        val model = FakeModel { request ->
            val ticket = tickets.first { it.text in request.prompt }
            json(mapOf("category" to if (ticket.id == "t01") "other" else ticket.category, "urgency" to ticket.urgency, "order_id" to null, "summary" to "s"))
        }
        val report = evalTriage(model, tickets)
        assertThat(report.total).isEqualTo(12)
        assertThat(report.categoryAccuracy).isEqualTo(11.0 / 12)
        assertThat(report.urgencyAccuracy).isEqualTo(1.0)
        assertThat(report.failures).containsExactly(EvalFailure("t01", "billing" to "high", "other" to "high"))
    }

    @Test
    fun `10 judge returns a score with its reasoning`() {
        assertThat(judgeReply(FakeModel(json(mapOf("reasoning" to "ok", "score" to 5))), "t", "r").score).isEqualTo(5)
    }

    @Test
    fun `business rules hold whatever the model asks for`() {
        // Given
        val shop = Bookshop()
        // When / Then
        assertThat(shop.refundEligibility("ORD-1004")).isEqualTo(Eligibility.Refusal("Outside the refund window"))
        assertThatThrownBy { shop.issueRefund("ORD-1003", 500.0, "lost") }.isInstanceOf(RefundRejected::class.java)
        assertThat(shop.issueRefund("ORD-1003", 119.0, "lost").refundId).isEqualTo("RF-0001")
        assertThat((shop.refundEligibility("ORD-1003") as Eligibility.Eligible).maxAmount).isEqualTo(0.0)
    }
}
