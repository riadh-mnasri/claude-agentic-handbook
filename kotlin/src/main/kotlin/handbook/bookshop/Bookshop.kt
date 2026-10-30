// © 2026 Riadh MNASRI. MIT License.
package handbook.bookshop

import handbook.core.Json
import handbook.core.ToolSpec
import java.io.File
import java.time.LocalDate
import java.time.temporal.ChronoUnit

data class Book(val isbn: String, val title: String, val author: String, val price: Double, val stock: Int, val tags: List<String>)
data class Item(val isbn: String, val qty: Int)
data class Order(
    val id: String, val customer: String, val status: String, val placedOn: String, val deliveredOn: String?,
    val items: List<Item>, val total: Double, val giftMessage: String?,
)
data class Policy(val currency: String, val refundWindowDays: Int, val autoRefundLimit: Double, val refundableStatuses: List<String>)
data class ShopData(val shop: String, val referenceDate: String, val policy: Policy, val catalog: List<Book>, val orders: List<Order>)
data class Refund(val refundId: String, val orderId: String, val amount: Double, val reason: String)

sealed interface Eligibility {
    data class Refusal(val reason: String) : Eligibility
    data class Eligible(val maxAmount: Double, val needsHumanApproval: Boolean) : Eligibility
}

class RefundRejected(message: String) : RuntimeException(message)

fun sharedDir(): File = generateSequence(File("").absoluteFile) { it.parentFile }
    .map { File(it, "shared") }
    .firstOrNull { File(it, "bookshop.json").exists() }
    ?: error("shared/bookshop.json not found")

/**
 * The fictional Paperleaf bookshop used by every example. Business rules live
 * here, in code, never only in a prompt: the model can be talked into anything,
 * the code cannot.
 */
class Bookshop(val data: ShopData = Json.mapper.readValue(File(sharedDir(), "bookshop.json"), ShopData::class.java)) {
    private val issued = mutableListOf<Refund>()
    val refunds: List<Refund> get() = issued.toList()
    val policy get() = data.policy

    fun order(id: String): Order? = data.orders.firstOrNull { it.id == id.uppercase() }

    fun searchCatalog(query: String, maxResults: Int = 5): List<Book> {
        val words = query.lowercase().split(Regex("\\s+")).filter { it.length > 2 }
        fun score(book: Book) = (listOf(book.title, book.author) + book.tags).joinToString(" ").lowercase()
            .let { haystack -> words.count { it in haystack } }
        return data.catalog.sortedByDescending(::score).filter { score(it) > 0 }.take(maxResults)
    }

    fun refundEligibility(orderId: String): Eligibility {
        val order = order(orderId) ?: return Eligibility.Refusal("Unknown order $orderId")
        if (order.status !in policy.refundableStatuses) return Eligibility.Refusal("Order is ${order.status}, not refundable yet")
        val since = LocalDate.parse(order.deliveredOn ?: order.placedOn)
        if (ChronoUnit.DAYS.between(since, LocalDate.parse(data.referenceDate)) > policy.refundWindowDays) {
            return Eligibility.Refusal("Outside the refund window")
        }
        val already = issued.filter { it.orderId == order.id }.sumOf { it.amount }
        return Eligibility.Eligible(order.total - already, order.total > policy.autoRefundLimit)
    }

    fun issueRefund(orderId: String, amount: Double, reason: String): Refund {
        val check = refundEligibility(orderId)
        if (check is Eligibility.Refusal) throw RefundRejected(check.reason)
        val max = (check as Eligibility.Eligible).maxAmount
        if (amount <= 0 || amount > max) throw RefundRejected("Amount must be between 0 and $max")
        return Refund("RF-%04d".format(issued.size + 1), orderId.uppercase(), amount, reason).also { issued += it }
    }

    companion object Tools {
        // Descriptions are prompts: say what, when, and what comes back.
        val GET_ORDER = ToolSpec(
            "get_order",
            "Look up one order by its id (format ORD-1234). Returns status, items, dates, total and the " +
                "customer's gift message. Use it before answering any question about a specific order.",
            mapOf("order_id" to mapOf("type" to "string", "description" to "Order id, e.g. ORD-1001")),
            listOf("order_id"),
        )
        val SEARCH_CATALOG = ToolSpec(
            "search_catalog",
            "Search the book catalog by keywords (title, author or topic). Returns up to max_results books " +
                "with price and stock. Stock 0 means out of stock.",
            mapOf(
                "query" to mapOf("type" to "string", "description" to "Keywords, e.g. 'ai evals beginners'"),
                "max_results" to mapOf("type" to "integer", "minimum" to 1, "maximum" to 10),
            ),
            listOf("query"),
        )
        val CHECK_REFUND = ToolSpec(
            "check_refund_eligibility",
            "Check whether an order can be refunded under the shop policy and the maximum refundable amount. " +
                "Always call it before issue_refund.",
            mapOf("order_id" to mapOf("type" to "string")),
            listOf("order_id"),
        )
        val ISSUE_REFUND = ToolSpec(
            "issue_refund",
            "Refund an amount in EUR on an eligible order. Irreversible: only call it when the customer asked " +
                "for a refund and eligibility was checked.",
            mapOf(
                "order_id" to mapOf("type" to "string"),
                "amount" to mapOf("type" to "number", "description" to "Amount in EUR"),
                "reason" to mapOf("type" to "string", "description" to "Short reason shown to the customer"),
            ),
            listOf("order_id", "amount", "reason"),
        )
    }
}
