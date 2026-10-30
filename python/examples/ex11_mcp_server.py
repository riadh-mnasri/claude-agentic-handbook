# © 2026 Riadh MNASRI. MIT License.
"""11. An MCP server: expose your tools once, use them from any MCP client.

Claude Code, Claude Desktop, the Agent SDK and many other clients speak the
Model Context Protocol. This server exposes the bookshop's read-only tools and
the refund policy as a resource. Refunds are deliberately NOT exposed: give a
client only the capabilities it needs.

Run (stdio): uv run python examples/ex11_mcp_server.py
Register in Claude Code: claude mcp add paperleaf -- uv run --directory python python examples/ex11_mcp_server.py
"""

import json

from mcp.server.mcpserver import MCPServer

from handbook.bookshop import Bookshop

shop = Bookshop()
server = MCPServer("paperleaf", instructions="Read-only access to the Paperleaf Books shop.")


@server.tool()
def get_order(order_id: str) -> str:
    """Look up an order by id (format ORD-1234): status, items, dates, total."""
    order = shop.get_order(order_id)
    return json.dumps(order) if order else f"No order {order_id}"


@server.tool()
def search_catalog(query: str, max_results: int = 5) -> str:
    """Search books by title, author or topic keywords. Stock 0 means out of stock."""
    return json.dumps(shop.search_catalog(query, max_results))


@server.tool()
def check_refund_eligibility(order_id: str) -> str:
    """Check if an order can be refunded under the shop policy, and up to which amount."""
    return json.dumps(shop.refund_eligibility(order_id))


@server.resource("paperleaf://policy")
def refund_policy() -> str:
    """The shop's refund and shipping policy."""
    return json.dumps(shop.policy)


if __name__ == "__main__":
    server.run()  # stdio transport by default
