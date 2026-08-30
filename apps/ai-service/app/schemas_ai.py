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
