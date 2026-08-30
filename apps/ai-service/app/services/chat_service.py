"""Chat orchestration service.

Coordinates the LLM provider behind a stable interface: it normalises inbound
messages, enforces the configured token budget, invokes the provider, and
returns a structured result with usage accounting. CRM business logic is never
performed here — that stays in the NestJS domain layer.
"""

from __future__ import annotations

import uuid

from ..config import Settings
from ..llm.base import ChatMessage, LLMProvider
from ..schemas_ai import (
    ChatMessageSchema,
    ChatRequest,
    ChatResponse,
    UsageSchema,
)

_SYSTEM_PREAMBLE = (
    "You are the NEXORA AI assistant embedded in a multi-tenant CRM. Answer "
    "using only the provided context and clearly say when information is "
    "unavailable. Never fabricate customer data."
)


class ChatService:
    def __init__(self, provider: LLMProvider, settings: Settings) -> None:
        self._provider = provider
        self._settings = settings

    async def complete(self, request: ChatRequest) -> ChatResponse:
        conversation_id = request.conversation_id or str(uuid.uuid4())

        messages = self._with_system_preamble(request.messages)
        result = await self._provider.chat(
            messages,
            model=self._settings.llm_model,
            max_tokens=self._settings.ai_max_tokens,
            temperature=request.temperature,
        )

        return ChatResponse(
            conversation_id=conversation_id,
            message=ChatMessageSchema(role="assistant", content=result.content),
            model=result.model,
            provider=self._provider.name,
            finish_reason=result.finish_reason,
            usage=UsageSchema(
                prompt_tokens=result.usage.prompt_tokens,
                completion_tokens=result.usage.completion_tokens,
                total_tokens=result.usage.total_tokens,
            ),
            sources=result.sources,
        )

    def _with_system_preamble(
        self, messages: list[ChatMessageSchema]
    ) -> list[ChatMessage]:
        has_system = any(m.role == "system" for m in messages)
        converted = [ChatMessage(role=m.role, content=m.content) for m in messages]
        if has_system:
            return converted
        return [ChatMessage(role="system", content=_SYSTEM_PREAMBLE), *converted]
