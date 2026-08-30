"""Tests for the AI service health endpoint and app factory."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_returns_ok() -> None:
    client = TestClient(create_app())
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "ai-service"
    assert body["uptime_seconds"] >= 0


def test_openapi_documents_health() -> None:
    client = TestClient(create_app())
    schema = client.get("/openapi.json").json()
    assert "/health" in schema["paths"]
