"""Internal service authentication.

The AI service is not internet-facing: only the NestJS AI gateway may call it.
Requests must carry the shared ``X-Service-Token`` header matching
``settings.service_token``. When the token is unset (local dev / tests) the
guard is disabled so the service stays easy to run offline.
"""

from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, status

from .config import get_settings


async def require_service_token(
    x_service_token: str | None = Header(default=None),
) -> None:
    settings = get_settings()
    expected = settings.service_token
    if not expected:
        # No token configured -> guard disabled (development / CI).
        return
    if not x_service_token or not hmac.compare_digest(x_service_token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing service token",
        )
