# © 2026 Riadh MNASRI. MIT License.
"""Model choices and client factory, in one place so every example agrees."""

import os

import anthropic

# Main model: planning, agent loops, anything that needs judgment.
MODEL = os.environ.get("HANDBOOK_MODEL", "claude-opus-5-5")
# Cheaper model for high-volume, narrow sub-tasks (routing, workers, judges).
FAST_MODEL = os.environ.get("HANDBOOK_FAST_MODEL", "claude-haiku-5-5")


def make_client() -> anthropic.Anthropic:
    """Real client. Reads ANTHROPIC_API_KEY (or an `ant auth login` profile)."""
    return anthropic.Anthropic()
