"""Singletons wiring the RAG service to configured providers.

The vector store defaults to the in-memory implementation so RAG runs offline
in tests/dev; a pgvector-backed store is substituted in production once a
database is configured.
"""

from __future__ import annotations

from functools import lru_cache

from ..config import get_settings
from ..embeddings.factory import get_embedding_provider
from ..llm.factory import get_llm_provider
from .service import RagService
from .vector_store import InMemoryVectorStore, VectorStore


@lru_cache
def get_vector_store() -> VectorStore:
    # A dedicated pgvector store can be selected here when DATABASE_URL is set;
    # the in-memory store keeps retrieval testable without external services.
    return InMemoryVectorStore()


def get_rag_service() -> RagService:
    return RagService(
        store=get_vector_store(),
        embeddings=get_embedding_provider(),
        llm=get_llm_provider(),
        settings=get_settings(),
    )
