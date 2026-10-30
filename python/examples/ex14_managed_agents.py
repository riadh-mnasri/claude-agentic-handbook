# © 2026 Riadh MNASRI. MIT License.
"""14. Claude Managed Agents: Anthropic runs the loop and a sandbox per session.

Two phases, never mixed:
- setup (once): create the environment and the versioned agent, store the ids;
- run (every time): create a session pinned to an agent version, open the
  event stream FIRST, then send the task, and read events until the agent is idle.

The agent here analyses the bookshop dataset uploaded to its sandbox.
Beta API. Needs ANTHROPIC_API_KEY.

Run: uv run python examples/ex14_managed_agents.py setup   # prints the ids to export
     HANDBOOK_AGENT_ID=... HANDBOOK_AGENT_VERSION=... HANDBOOK_ENV_ID=... \
       uv run python examples/ex14_managed_agents.py run
"""

import os
import sys

from handbook.config import MODEL, make_client

SYSTEM = """You are a data analyst for Paperleaf Books. You work in your sandbox:
write and run Python to answer, and show the numbers you computed."""


def setup(client) -> dict:
    environment = client.beta.environments.create(
        name="paperleaf-analysis",
        # Limited networking: the sandbox can install packages, nothing else.
        config={"type": "cloud", "networking": {"type": "limited", "allow_package_managers": True}},
    )
    agent = client.beta.agents.create(
        name="Paperleaf analyst",
        model=MODEL,
        system=SYSTEM,
        tools=[{
            "type": "agent_toolset_20260401",  # bash, files, code in the sandbox
            "default_config": {"enabled": True, "permission_policy": {"type": "auto"}},
            # This job needs no web access: turn the web tools off.
            "configs": [{"name": "web_fetch", "enabled": False}, {"name": "web_search", "enabled": False}],
        }],
    )
    return {"HANDBOOK_ENV_ID": environment.id, "HANDBOOK_AGENT_ID": agent.id,
            "HANDBOOK_AGENT_VERSION": str(agent.version)}


def run(client, agent_id: str, agent_version: int, environment_id: str, task: str, dataset: str) -> str:
    session = client.beta.sessions.create(
        agent={"type": "agent", "id": agent_id, "version": agent_version},
        environment_id=environment_id,
        title="Weekly order analysis",
    )
    output: list[str] = []
    # Stream first: events emitted before the stream opens would arrive late, in one batch.
    with client.beta.sessions.events.stream(session_id=session.id) as stream:
        client.beta.sessions.events.send(session_id=session.id, events=[{
            "type": "user.message",
            "content": [{"type": "text", "text": f"{task}\n\nDataset (JSON):\n{dataset}"}],
        }])
        for event in stream:
            if event.type == "agent.message":
                output.extend(b.text for b in event.content if b.type == "text")
            elif event.type == "session.status_idle" and event.stop_reason.type != "requires_action":
                break
            elif event.type == "session.status_terminated":
                break
    return "".join(output)


if __name__ == "__main__":
    from handbook.bookshop import shared_dir

    client = make_client()
    if sys.argv[1:] == ["setup"]:
        for key, value in setup(client).items():
            print(f"export {key}={value}")
    else:
        print(run(client, os.environ["HANDBOOK_AGENT_ID"], int(os.environ["HANDBOOK_AGENT_VERSION"]),
                  os.environ["HANDBOOK_ENV_ID"],
                  "Which orders are refundable today, and what is the total amount at stake?",
                  (shared_dir() / "bookshop.json").read_text()))
