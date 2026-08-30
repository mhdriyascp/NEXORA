"""Tests for the Phase 5 AI foundation: chat, embeddings, and service auth.

These run fully offline using the deterministic mock providers.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def _client(settings: Settings | None = None) -> TestClient:
    return TestClient(create_app(settings))


def test_chat_returns_assistant_reply_with_usage() -> None:
    client = _client()
    resp = client.post(
        "/v1/ai/chat",
        json={
            "tenant_id": "tenant-a",
            "messages": [{"role": "user", "content": "Summarize my pipeline"}],
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["message"]["role"] == "assistant"
    assert body["message"]["content"].startswith("[mock:")
    assert body["provider"] == "mock"
    assert body["usage"]["total_tokens"] == (
        body["usage"]["prompt_tokens"] + body["usage"]["completion_tokens"]
    )
    # A conversation id is always returned (generated when absent).
    assert body["conversation_id"]


def test_chat_preserves_conversation_id() -> None:
    client = _client()
    resp = client.post(
        "/v1/ai/chat",
        json={
            "tenant_id": "tenant-a",
            "conversation_id": "conv-123",
            "messages": [{"role": "user", "content": "hi"}],
        },
    )
    assert resp.json()["conversation_id"] == "conv-123"


def test_chat_validates_empty_messages() -> None:
    client = _client()
    resp = client.post(
        "/v1/ai/chat",
        json={"tenant_id": "tenant-a", "messages": []},
    )
    assert resp.status_code == 422


def test_embeddings_are_deterministic_and_normalised() -> None:
    client = _client()
    payload = {"tenant_id": "tenant-a", "inputs": ["acme corp", "acme corp"]}
    resp = client.post("/v1/ai/embeddings", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["dimensions"] == len(body["vectors"][0])
    # Identical inputs produce identical vectors.
    assert body["vectors"][0] == body["vectors"][1]
    # Vectors are unit-normalised (L2 norm ~= 1).
    norm = sum(v * v for v in body["vectors"][0]) ** 0.5
    assert abs(norm - 1.0) < 1e-6


def test_service_token_guard_enforced_when_configured(monkeypatch) -> None:
    import asyncio

    import pytest
    from fastapi import HTTPException

    from app import security

    # Configure a token so the guard is active.
    monkeypatch.setattr(
        security, "get_settings", lambda: Settings(service_token="secret-token")
    )

    # Missing / wrong token is rejected.
    with pytest.raises(HTTPException) as missing:
        asyncio.run(security.require_service_token(x_service_token=None))
    assert missing.value.status_code == 401

    with pytest.raises(HTTPException):
        asyncio.run(security.require_service_token(x_service_token="wrong"))

    # Correct token passes (returns None without raising).
    assert (
        asyncio.run(security.require_service_token(x_service_token="secret-token"))
        is None
    )


def test_service_token_guard_disabled_when_unset(monkeypatch) -> None:
    import asyncio

    from app import security

    monkeypatch.setattr(security, "get_settings", lambda: Settings(service_token=""))
    # No token configured -> guard is a no-op even with no header.
    assert asyncio.run(security.require_service_token(x_service_token=None)) is None

