import pytest

from handbook.bookshop import Bookshop


def test_refund_is_refused_outside_the_window():
    # Given an order delivered more than 30 days before the reference date
    shop = Bookshop()
    # When / Then
    assert shop.refund_eligibility("ORD-1004") == {"eligible": False, "reason": "Outside the refund window"}


def test_refund_cannot_exceed_the_order_total_even_when_asked():
    # Given a lost order of 119 EUR
    shop = Bookshop()
    # When / Then the business rule holds whatever the model asks for
    with pytest.raises(ValueError):
        shop.issue_refund("ORD-1003", 500, "lost")
    assert shop.issue_refund("ORD-1003", 119, "lost")["refund_id"] == "RF-0001"
    assert shop.refund_eligibility("ORD-1003")["max_amount"] == 0


def test_catalog_search_ranks_by_keywords():
    assert Bookshop().search_catalog("ai evals")[0]["title"] == "Evals Before Vibes"
