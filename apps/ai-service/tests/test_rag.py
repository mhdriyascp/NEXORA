"""Tests for Phase 6 RAG: chunking, ingestion, retrieval and isolation."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app
from app.rag.chunking import chunk_text


def _client() -> TestClient:
    return TestClient(create_app())


def test_chunk_text_overlaps_and_covers() -> None:
    words = " ".join(f"w{i}" for i in range(500))
    chunks = chunk_text(words, chunk_size=100, overlap=20)
    assert len(chunks) > 1
    # First chunk has exactly chunk_size words.
    assert len(chunks[0].split()) == 100
    # Consecutive chunks overlap (share trailing/leading words).
    first_tail = chunks[0].split()[-20:]
    second_head = chunks[1].split()[:20]
    assert first_tail == second_head


def test_chunk_text_empty() -> None:
    assert chunk_text("   ") == []


def test_ingest_then_query_returns_grounded_sources() -> None:
    client = _client()
    ingest = client.post(
        "/v1/ai/documents",
        json={
            "tenant_id": "tenant-rag-a",
            "document_id": "policy-1",
            "text": "Acme refund policy. Refunds are issued within 30 days of purchase.",
        },
    )
    assert ingest.status_code == 200
    assert ingest.json()["chunks_indexed"] >= 1

    query = client.post(
        "/v1/ai/rag/query",
        json={"tenant_id": "tenant-rag-a", "query": "refund policy", "top_k": 3},
    )
    assert query.status_code == 200
    body = query.json()
    assert body["sources"]
    assert body["sources"][0]["document_id"] == "policy-1"
    assert body["usage"]["total_tokens"] > 0


def test_rag_is_tenant_isolated() -> None:
    client = _client()
    client.post(
        "/v1/ai/documents",
        json={
            "tenant_id": "tenant-rag-x",
            "document_id": "secret",
            "text": "The launch code is alpha-bravo-nine.",
        },
    )
    # A different tenant must not retrieve tenant-x's document.
    resp = client.post(
        "/v1/ai/rag/query",
        json={"tenant_id": "tenant-rag-y", "query": "launch code", "top_k": 5},
    )
    assert resp.status_code == 200
    doc_ids = [s["document_id"] for s in resp.json()["sources"]]
    assert "secret" not in doc_ids
