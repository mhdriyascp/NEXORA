"""OpenAI-backed LLM provider (used when configured with an API key).

The OpenAI SDK is imported lazily so the dependency is only required when this
provider is actually selected; the mock provider keeps tests and offline dev
fully functional without it.
"""

from __future__ import annotations

from .base import ChatMessage, ChatResult, LLMProvider, TokenUsage, estimate_tokens


class OpenAILLMProvider(LLMProvider):
    name = "openai"

    def __init__(self, api_key: str, base_url: str | None = None) -> None:
        self._api_key = api_key
        self._base_url = base_url

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        model: str,
        max_tokens: int,
        temperature: float = 0.2,
    ) -> ChatResult:
        # Lazy import: only require the SDK when this provider is used.
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self._api_key, base_url=self._base_url)
        completion = await client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": m.role, "content": m.content} for m in messages],
        )
        choice = completion.choices[0]
        content = choice.message.content or ""
        usage = completion.usage
        if usage is not None:
            token_usage = TokenUsage(
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens,
            )
        else:
            token_usage = TokenUsage(
                prompt_tokens=sum(estimate_tokens(m.content) for m in messages),
                completion_tokens=estimate_tokens(content),
            )
        return ChatResult(
            content=content,
            model=model,
            usage=token_usage,
            finish_reason=choice.finish_reason or "stop",
        )
