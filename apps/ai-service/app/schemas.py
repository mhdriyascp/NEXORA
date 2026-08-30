"""Pydantic schemas mirroring the shared health contract."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

HealthStatus = Literal["ok", "degraded", "down"]


class HealthResponse(BaseModel):
    status: HealthStatus
    service: str
    version: str
    uptime_seconds: int
