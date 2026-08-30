"""Embedding provider abstraction used for semantic search / RAG."""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class EmbeddingProvider(Protocol):
    name: str
    dimensions: int

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one dense vector per input text."""
        ...
