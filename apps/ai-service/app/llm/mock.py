"""Deterministic mock LLM provider.

Used for tests and offline development so the platform runs end-to-end without
network access or API keys. It produces a stable, inspectable response derived
from the conversation, and reports realistic token usage.
"""

from __future__ import annotations

from .base import ChatMessage, ChatResult, LLMProvider, TokenUsage, estimate_tokens


class MockLLMProvider(LLMProvider):
    name = "mock"

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        model: str,
        max_tokens: int,
        temperature: float = 0.2,
    ) -> ChatResult:
        last_user = next(
            (m.content for m in reversed(messages) if m.role == "user"),
            "",
        )
        # Deterministic, obviously-mock reply that echoes intent for assertions.
        reply = f"[mock:{model}] {self._summarize(last_user)}"
        reply = reply[: max_tokens * 4]

        prompt_tokens = sum(estimate_tokens(m.content) for m in messages)
        completion_tokens = estimate_tokens(reply)
        return ChatResult(
            content=reply,
            model=model,
            usage=TokenUsage(prompt_tokens, completion_tokens),
        )

    @staticmethod
    def _summarize(text: str) -> str:
        text = text.strip()
        if not text:
            return "How can I help with your CRM today?"
        words = text.split()
        if len(words) <= 24:
            return text
        return " ".join(words[:24]) + " …"
