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
    ChatMessageSchema,
    ChatRequest,
    ChatResponse,
    DocumentIngestRequest,
    DocumentIngestResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    PlanRequest,
    PlanResponse,
    RagQueryRequest,
    RagQueryResponse,
    RagSource,
    ToolCallSchema,
    ToolParameterSchema,
    ToolsListResponse,
    ToolSpecSchema,
    UsageSchema,
)
from ..rag.factory import get_rag_service
from ..rag.service import RagService
from ..security import require_service_token
from ..services.chat_service import ChatService
from ..tools.registry import TOOLS, plan_tool_call

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


@router.post("/documents", response_model=DocumentIngestResponse)
async def ingest_document(
    request: DocumentIngestRequest,
    service: RagService = Depends(get_rag_service),
) -> DocumentIngestResponse:
    """Chunk, embed and index a tenant document for retrieval."""
    count = await service.ingest(
        tenant_id=request.tenant_id,
        document_id=request.document_id,
        text=request.text,
        metadata=request.metadata,
    )
    return DocumentIngestResponse(
        document_id=request.document_id, chunks_indexed=count
    )


@router.post("/rag/query", response_model=RagQueryResponse)
async def rag_query(
    request: RagQueryRequest,
    service: RagService = Depends(get_rag_service),
) -> RagQueryResponse:
    """Answer a question grounded in the tenant's indexed documents."""
    answer, hits, usage = await service.answer(
        tenant_id=request.tenant_id, query=request.query, top_k=request.top_k
    )
    return RagQueryResponse(
        answer=answer,
        sources=[
            RagSource(
                document_id=hit.document_id,
                chunk_index=hit.chunk_index,
                score=hit.score,
                content=hit.content,
            )
            for hit in hits
        ],
        usage=UsageSchema(
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens,
        ),
    )


@router.get("/tools", response_model=ToolsListResponse)
async def list_tools() -> ToolsListResponse:
    """Expose the catalogue of authorized CRM tools the assistant may request."""
    return ToolsListResponse(
        tools=[
            ToolSpecSchema(
                name=tool.name,
                description=tool.description,
                required_permission=tool.required_permission,
                parameters=[
                    ToolParameterSchema(
                        name=param.name,
                        type=param.type,
                        description=param.description,
                        required=param.required,
                    )
                    for param in tool.parameters
                ],
            )
            for tool in TOOLS
        ]
    )


@router.post("/assistant/plan", response_model=PlanResponse)
async def plan(
    request: PlanRequest,
    provider: LLMProvider = Depends(get_llm_provider),
    settings: Settings = Depends(get_settings),
) -> PlanResponse:
    """Decide whether the message maps to an authorized tool call.

    The AI service only *plans* the action; the NestJS gateway executes it via
    the CRM domain layer (enforcing RBAC + tenant isolation). If no tool is
    matched, fall back to a conversational answer.
    """
    tool_call = plan_tool_call(request.message)
    if tool_call is not None:
        return PlanResponse(
            action="tool_call",
            tool_call=ToolCallSchema(
                name=tool_call.name, arguments=tool_call.arguments
            ),
        )

    service = ChatService(provider, settings)
    result = await service.complete(
        ChatRequest(
            tenant_id=request.tenant_id,
            messages=[ChatMessageSchema(role="user", content=request.message)],
        )
    )
    return PlanResponse(action="message", message=result.message.content)
