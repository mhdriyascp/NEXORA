"""RAG orchestration: document ingestion and grounded question answering.

Ingestion chunks a document, embeds each chunk, and upserts tenant-scoped
vectors. Querying embeds the question, retrieves the most similar chunks for the
tenant, builds a grounded prompt, and asks the LLM to answer using only that
context — returning the source chunks so responses are explainable.
"""

from __future__ import annotations

from ..config import Settings
from ..embeddings.base import EmbeddingProvider
from ..llm.base import ChatMessage, LLMProvider
from .chunking import chunk_text
from .vector_store import SearchHit, VectorRecord, VectorStore


class RagService:
    def __init__(
        self,
        *,
        store: VectorStore,
        embeddings: EmbeddingProvider,
        llm: LLMProvider,
        settings: Settings,
    ) -> None:
        self._store = store
        self._embeddings = embeddings
        self._llm = llm
        self._settings = settings

    async def ingest(
        self,
        *,
        tenant_id: str,
        document_id: str,
        text: str,
        metadata: dict[str, str] | None = None,
    ) -> int:
        """Chunk, embed and store a document. Returns the chunk count."""
        chunks = chunk_text(text)
        if not chunks:
            return 0
        vectors = await self._embeddings.embed(chunks)
        records = [
            VectorRecord(
                tenant_id=tenant_id,
                document_id=document_id,
                chunk_index=index,
                content=chunk,
                embedding=vector,
                metadata=metadata or {},
            )
            for index, (chunk, vector) in enumerate(zip(chunks, vectors))
        ]
        # Re-ingesting a document replaces its previous chunks.
        await self._store.delete_document(tenant_id, document_id)
        await self._store.upsert(records)
        return len(records)

    async def retrieve(
        self, *, tenant_id: str, query: str, top_k: int
    ) -> list[SearchHit]:
        [embedding] = await self._embeddings.embed([query])
        return await self._store.search(tenant_id, embedding, top_k=top_k)

    async def answer(
        self, *, tenant_id: str, query: str, top_k: int = 4
    ) -> tuple[str, list[SearchHit], object]:
        """Return (answer, hits, usage) grounded in retrieved context."""
        hits = await self.retrieve(tenant_id=tenant_id, query=query, top_k=top_k)
        context = "\n\n".join(
            f"[Source {i + 1}] {hit.content}" for i, hit in enumerate(hits)
        )
        system = (
            "You are the NEXORA assistant. Answer the question using ONLY the "
            "context below. If the answer is not in the context, say you don't "
            "have that information. Cite sources as [Source N].\n\n"
            f"Context:\n{context if context else '(no documents found)'}"
        )
        result = await self._llm.chat(
            [
                ChatMessage(role="system", content=system),
                ChatMessage(role="user", content=query),
            ],
            model=self._settings.llm_model,
            max_tokens=self._settings.ai_max_tokens,
        )
        return result.content, hits, result.usage
