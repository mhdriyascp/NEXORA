"""Tests for Phase 7 AI Tools: registry, planner and endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app
from app.tools.registry import plan_tool_call


def _client() -> TestClient:
    return TestClient(create_app())


def test_plan_tool_call_create_task() -> None:
    call = plan_tool_call("create task: Follow up with Acme")
    assert call is not None
    assert call.name == "create_task"
    assert call.arguments["title"] == "Follow up with Acme"


def test_plan_tool_call_create_contact() -> None:
    call = plan_tool_call("add contact: Ada Lovelace")
    assert call is not None
    assert call.name == "create_contact"
    assert call.arguments == {"firstName": "Ada", "lastName": "Lovelace"}


def test_plan_tool_call_no_match() -> None:
    assert plan_tool_call("what deals are at risk?") is None


def test_list_tools_endpoint() -> None:
    resp = _client().get("/v1/ai/tools")
    assert resp.status_code == 200
    names = {t["name"] for t in resp.json()["tools"]}
    assert {"create_task", "create_contact"} <= names
    task = next(t for t in resp.json()["tools"] if t["name"] == "create_task")
    assert task["required_permission"] == "task:create"


def test_plan_endpoint_returns_tool_call() -> None:
    resp = _client().post(
        "/v1/ai/assistant/plan",
        json={"tenant_id": "t1", "message": "create task: Call the client"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["action"] == "tool_call"
    assert body["tool_call"]["name"] == "create_task"
    assert body["tool_call"]["arguments"]["title"] == "Call the client"


def test_plan_endpoint_falls_back_to_message() -> None:
    resp = _client().post(
        "/v1/ai/assistant/plan",
        json={"tenant_id": "t1", "message": "summarize my pipeline"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["action"] == "message"
    assert body["message"]
