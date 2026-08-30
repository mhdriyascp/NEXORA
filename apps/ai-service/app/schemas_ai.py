"""Request/response schemas for AI chat and embedding endpoints."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["system", "user", "assistant", "tool"]


class ChatMessageSchema(BaseModel):
    role: Role
    content: str = Field(min_length=1, max_length=32_000)


class ChatRequest(BaseModel):
    # tenant_id is supplied by the trusted NestJS gateway (from the JWT), never
    # by an end user directly; it scopes conversation + usage accounting.
    tenant_id: str = Field(min_length=1)
    conversation_id: str | None = None
    messages: list[ChatMessageSchema] = Field(min_length=1)
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)


class UsageSchema(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatResponse(BaseModel):
    conversation_id: str
    message: ChatMessageSchema
    model: str
    provider: str
    finish_reason: str
    usage: UsageSchema
    sources: list[str] = Field(default_factory=list)


class EmbeddingRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    inputs: list[str] = Field(min_length=1, max_length=128)


class EmbeddingResponse(BaseModel):
    model: str
    provider: str
    dimensions: int
    vectors: list[list[float]]


class DocumentIngestRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    document_id: str = Field(min_length=1)
    text: str = Field(min_length=1)
    metadata: dict[str, str] = Field(default_factory=dict)


class DocumentIngestResponse(BaseModel):
    document_id: str
    chunks_indexed: int


class RagQueryRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    query: str = Field(min_length=1, max_length=8_000)
    top_k: int = Field(default=4, ge=1, le=20)


class RagSource(BaseModel):
    document_id: str
    chunk_index: int
    score: float
    content: str


class RagQueryResponse(BaseModel):
    answer: str
    sources: list[RagSource]
    usage: UsageSchema


class ToolParameterSchema(BaseModel):
    name: str
    type: str
    description: str
    required: bool


class ToolSpecSchema(BaseModel):
    name: str
    description: str
    required_permission: str
    parameters: list[ToolParameterSchema]


class ToolsListResponse(BaseModel):
    tools: list[ToolSpecSchema]


class PlanRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    message: str = Field(min_length=1, max_length=8_000)


class ToolCallSchema(BaseModel):
    name: str
    arguments: dict[str, str]


class PlanResponse(BaseModel):
    # Either the assistant wants to call a tool, or it returns a direct message.
    action: Literal["tool_call", "message"]
    tool_call: ToolCallSchema | None = None
    message: str | None = None
