"""Embedding provider factory (mock by default / when no key configured)."""

from __future__ import annotations

from functools import lru_cache

from ..config import Settings, get_settings
from .base import EmbeddingProvider
from .mock import MockEmbeddingProvider


def build_embedding_provider(settings: Settings) -> EmbeddingProvider:
    # Real providers (e.g. OpenAI embeddings) can be added here; the mock keeps
    # RAG wiring testable offline and is used whenever no key is configured.
    return MockEmbeddingProvider(dimensions=settings.embedding_dimensions)


@lru_cache
def get_embedding_provider() -> EmbeddingProvider:
    return build_embedding_provider(get_settings())
