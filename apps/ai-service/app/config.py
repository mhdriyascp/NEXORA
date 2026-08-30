"""Typed application settings loaded from the environment.

No secrets are hardcoded; values come from environment variables (or a local
.env file in development). Production secrets are injected via AWS Secrets
Manager or equivalent.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ai-service"
    version: str = "0.1.0"
    environment: str = "development"
    port: int = 8000

    # Downstream dependencies (used from Phase 5+).
    database_url: str = ""
    redis_url: str = "redis://localhost:6379"

    # LLM provider abstraction (configuration-driven; see AI_ARCHITECTURE.md).
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"

    # AI safety limits.
    ai_max_tokens: int = 4096
    ai_max_cost: float = 1.0


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
