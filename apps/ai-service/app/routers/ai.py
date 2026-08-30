"""AI endpoints: chat completion and embeddings.

All routes require a valid internal service token (the NestJS AI gateway is the
only caller). tenant_id arrives on the request body from the trusted gateway.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..config import Settings, get_settings
from ..embeddings.base import EmbeddingProvider
from ..embeddings.factory import get_embedding_provider
from ..llm.base import LLMProvider
from ..llm.factory import get_llm_provider
from ..schemas_ai import (
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
)
from ..security import require_service_token
from ..services.chat_service import ChatService

router = APIRouter(
    prefix="/v1/ai",
    tags=["ai"],
    dependencies=[Depends(require_service_token)],
)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    provider: LLMProvider = Depends(get_llm_provider),
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
    """Generate an assistant reply for a tenant conversation."""
    service = ChatService(provider, settings)
    return await service.complete(request)


@router.post("/embeddings", response_model=EmbeddingResponse)
async def embeddings(
    request: EmbeddingRequest,
    provider: EmbeddingProvider = Depends(get_embedding_provider),
) -> EmbeddingResponse:
    """Return dense vectors for the supplied inputs (semantic search / RAG)."""
    vectors = await provider.embed(request.inputs)
    return EmbeddingResponse(
        model=get_settings().embedding_model,
        provider=provider.name,
        dimensions=provider.dimensions,
        vectors=vectors,
    )
