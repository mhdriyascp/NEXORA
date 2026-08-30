"""FastAPI application factory and routes for the NEXORA AI service."""

from __future__ import annotations

import logging
import time

from fastapi import FastAPI

from .config import Settings, get_settings
from .routers.ai import router as ai_router
from .schemas import HealthResponse

logging.basicConfig(
    level=logging.INFO,
    format='{"level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
)
logger = logging.getLogger("ai-service")

_STARTED_AT = time.monotonic()


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = settings or get_settings()

    app = FastAPI(
        title="NEXORA AI Service",
        description="Internal AI orchestration service (LLM, RAG, tools)",
        version=settings.version,
    )

    @app.get("/health", response_model=HealthResponse, tags=["health"])
    def health() -> HealthResponse:
        """Liveness/readiness probe for Docker, K8s, and CI smoke tests."""
        return HealthResponse(
            status="ok",
            service=settings.app_name,
            version=settings.version,
            uptime_seconds=int(time.monotonic() - _STARTED_AT),
        )

    logger.info("ai-service application created (env=%s)", settings.environment)
    app.include_router(ai_router)
    return app


app = create_app()
