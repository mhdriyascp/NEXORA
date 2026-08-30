"""LLM provider abstraction.

The AI service is provider-agnostic: orchestration code depends only on the
``LLMProvider`` protocol, never on a concrete SDK. Concrete providers (mock,
OpenAI, …) are selected at runtime from configuration. This keeps the platform
portable and makes tests deterministic by using the mock provider offline.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Protocol, runtime_checkable

Role = Literal["system", "user", "assistant", "tool"]


@dataclass(frozen=True)
class ChatMessage:
    role: Role
    content: str


@dataclass(frozen=True)
class TokenUsage:
    prompt_tokens: int
    completion_tokens: int

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens


@dataclass(frozen=True)
class ChatResult:
    content: str
    model: str
    usage: TokenUsage
    finish_reason: str = "stop"
    sources: list[str] = field(default_factory=list)


@runtime_checkable
class LLMProvider(Protocol):
    """Minimal chat-completion contract implemented by every provider."""

    name: str

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        model: str,
        max_tokens: int,
        temperature: float = 0.2,
    ) -> ChatResult: ...


def estimate_tokens(text: str) -> int:
    """Rough token estimate (~4 chars/token) used for accounting and limits.

    A precise tokenizer is provider-specific; this heuristic is deliberately
    cheap and dependency-free, and is only used for budgeting/telemetry.
    """
    if not text:
        return 0
    return max(1, len(text) // 4)
