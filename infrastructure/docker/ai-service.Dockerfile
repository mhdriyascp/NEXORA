# syntax=docker/dockerfile:1
# Multi-stage build for the FastAPI AI service.

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

# ---- Dependencies ---------------------------------------------------------
FROM base AS deps
COPY apps/ai-service/requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Runtime --------------------------------------------------------------
FROM base AS runtime
# Create a non-root user.
RUN groupadd --system app && useradd --system --gid app --home /app app
COPY --from=deps /install /usr/local
COPY --chown=app:app apps/ai-service/app ./app
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status==200 else 1)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
