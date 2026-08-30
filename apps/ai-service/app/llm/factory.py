"""Provider factories that select concrete implementations from settings.

Falling back to the mock provider when credentials are absent keeps the service
runnable in development and CI without external dependencies, while production
uses the configured real provider.
"""

from __future__ import annotations

from functools import lru_cache

from ..config import Settings, get_settings
from .base import LLMProvider
from .mock import MockLLMProvider
from .openai_provider import OpenAILLMProvider


def build_llm_provider(settings: Settings) -> LLMProvider:
    provider = settings.llm_provider.lower()
    if provider == "openai" and settings.openai_api_key:
        return OpenAILLMProvider(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url or None,
        )
    # Default/offline path: deterministic mock (also used when no key is set).
    return MockLLMProvider()


@lru_cache
def get_llm_provider() -> LLMProvider:
    return build_llm_provider(get_settings())
