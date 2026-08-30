# NEXORA AI Service (FastAPI)

Internal AI orchestration service. Reached **only** through the NestJS AI Gateway — never
exposed directly to the browser (see [`docs/AI_ARCHITECTURE.md`](../../docs/AI_ARCHITECTURE.md)).

## Phase 1 scope

- FastAPI app factory + configuration (`app/config.py`)
- Structured logging
- `/health` endpoint + OpenAPI docs at `/docs`
- Tests (`tests/`)

LLM orchestration, RAG, and AI tools arrive in Phases 5–7.

## Dependency management

Per [ADR-0009](../../docs/ARCHITECTURE.md#adr-0009-python-dependency-management), the service
targets Poetry/uv. For portability this repo pins dependencies in both `pyproject.toml` and
`requirements.txt`; use whichever your workflow prefers.

## Local development

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # http://localhost:8000/health
pytest                                       # run tests
```
