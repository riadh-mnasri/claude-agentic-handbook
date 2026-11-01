from contextlib import contextmanager
from types import SimpleNamespace as NS

import ex13_tool_runner as ex13
import ex14_managed_agents as ex14


def test_13_docstrings_and_signatures_become_tool_schemas():
    schema = ex13.search_catalog.to_dict()
    assert schema["name"] == "search_catalog"
    assert schema["input_schema"]["required"] == ["query"]
    assert "Keywords" in schema["input_schema"]["properties"]["query"]["description"]
    assert '"status": "lost"' in ex13.get_order.call({"order_id": "ORD-1003"})


class FakeManagedClient:
    """Records the calls and replays a scripted event stream."""

    def __init__(self, events):
        self.log = []
        sessions = NS(create=self._session, events=NS(stream=self._stream, send=self._send))
        self.beta = NS(sessions=sessions)
        self._events = events

    def _session(self, **kwargs):
        self.log.append(("session", kwargs))
        return NS(id="sesn_1")

    @contextmanager
    def _stream(self, session_id):
        self.log.append(("stream", session_id))
        yield iter(self._events)

    def _send(self, session_id, events):
        self.log.append(("send", events[0]["type"]))
        self.sent = getattr(self, "sent", []) + events


def test_14_session_pins_the_version_and_opens_the_stream_before_sending():
    text = NS(type="text", text="2 refundable orders, 158 EUR.")
    client = FakeManagedClient([
        NS(type="agent.message", content=[text]),
        NS(type="session.status_idle", stop_reason=NS(type="end_turn")),
        NS(type="agent.message", content=[NS(type="text", text="never read")]),
    ])
    result = ex14.run(client, "agent_1", 3, "env_1", "task", "{}")
    assert result == "2 refundable orders, 158 EUR."
    assert [entry[0] for entry in client.log] == ["session", "stream", "send"]
    assert client.log[0][1]["agent"] == {"type": "agent", "id": "agent_1", "version": 3}


def test_14_paused_tool_calls_are_denied_when_nobody_watches():
    client = FakeManagedClient([
        NS(type="agent.tool_use", id="tu_1", evaluated_permission="ask"),
        NS(type="session.status_idle", stop_reason=NS(type="requires_action")),  # keeps streaming
        NS(type="agent.message", content=[NS(type="text", text="Done without it.")]),
        NS(type="session.status_idle", stop_reason=NS(type="end_turn")),
    ])
    assert ex14.run(client, "agent_1", 1, "env_1", "task", "{}") == "Done without it."
    confirmation = client.sent[-1]
    assert confirmation == {"type": "user.tool_confirmation", "tool_use_id": "tu_1", "result": "deny"}
