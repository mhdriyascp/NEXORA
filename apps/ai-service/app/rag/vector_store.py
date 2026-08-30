"""Vector store abstraction for tenant-scoped semantic retrieval.

Retrieval code depends only on the ``VectorStore`` protocol. An in-memory
implementation keeps RAG fully testable offline; a pgvector-backed store is
used in production. Every record carries a ``tenant_id`` and all searches are
filtered by it, so one tenant can never retrieve another tenant's documents.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class VectorRecord:
    tenant_id: str
    document_id: str
    chunk_index: int
    content: str
    embedding: list[float]
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class SearchHit:
    document_id: str
    chunk_index: int
    content: str
    score: float
    metadata: dict[str, str] = field(default_factory=dict)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("vectors must share dimensionality")
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


@runtime_checkable
class VectorStore(Protocol):
    async def upsert(self, records: list[VectorRecord]) -> int: ...

    async def search(
        self, tenant_id: str, embedding: list[float], *, top_k: int
    ) -> list[SearchHit]: ...

    async def delete_document(self, tenant_id: str, document_id: str) -> int: ...


class InMemoryVectorStore(VectorStore):
    """Process-local store used for tests and offline development."""

    def __init__(self) -> None:
        self._records: list[VectorRecord] = []

    async def upsert(self, records: list[VectorRecord]) -> int:
        # Replace any existing chunks for the same (tenant, document, index).
        keys = {
            (r.tenant_id, r.document_id, r.chunk_index) for r in records
        }
        self._records = [
            r
            for r in self._records
            if (r.tenant_id, r.document_id, r.chunk_index) not in keys
        ]
        self._records.extend(records)
        return len(records)

    async def search(
        self, tenant_id: str, embedding: list[float], *, top_k: int
    ) -> list[SearchHit]:
        scored = [
            SearchHit(
                document_id=r.document_id,
                chunk_index=r.chunk_index,
                content=r.content,
                score=cosine_similarity(embedding, r.embedding),
                metadata=r.metadata,
            )
            for r in self._records
            if r.tenant_id == tenant_id
        ]
        scored.sort(key=lambda hit: hit.score, reverse=True)
        return scored[:top_k]

    async def delete_document(self, tenant_id: str, document_id: str) -> int:
        before = len(self._records)
        self._records = [
            r
            for r in self._records
            if not (r.tenant_id == tenant_id and r.document_id == document_id)
        ]
        return before - len(self._records)
