# NEXORA — Development Guide

This guide covers local development for the NEXORA monorepo as of **Phase 1 (Foundation)**.

## Prerequisites

- **Node.js** ≥ 20 (22 recommended)
- **pnpm** 11.x (`npm install -g pnpm`)
- **Python** 3.12 (for `apps/ai-service`)
- **Docker** + Docker Compose (for the full local stack)

## Repository layout

```
apps/
  web/          Next.js frontend (App Router, TS strict, Tailwind)
  api/          NestJS CRM backend (modular monolith)
  ai-service/   FastAPI AI service (Python)
  worker/       BullMQ background job processor
packages/
  shared-types/     Shared TS types & contracts (@nexora/shared-types)
  eslint-config/    Shared ESLint flat config (@nexora/eslint-config)
  typescript-config/Shared tsconfig bases (@nexora/typescript-config)
infrastructure/docker/   Per-service Dockerfiles
.github/workflows/       CI (lint, typecheck, test, build, docker)
```

## First-time setup

```bash
cp .env.example .env
pnpm install
pnpm --filter @nexora/shared-types build   # other apps depend on its dist output
```

## Running the stack

**Everything via Docker Compose:**

```bash
docker compose up --build
```

**Individual apps (local):**

| App | Command | Health check |
|-----|---------|--------------|
| api | `pnpm --filter @nexora/api dev` | http://localhost:4000/api/v1/health |
| web | `pnpm --filter @nexora/web dev` | http://localhost:3000/api/health |
| worker | `pnpm --filter @nexora/worker dev` | http://localhost:4100/health |
| ai-service | `uvicorn app.main:app --reload` (in `apps/ai-service`) | http://localhost:8000/health |

## Quality gates

Run these before pushing (CI runs the same):

```bash
pnpm -r run lint
pnpm -r run typecheck
pnpm -r run test
pnpm -r run build
( cd apps/ai-service && pip install -r requirements.txt && pytest -q )
```

## Conventions

- **TypeScript strict mode** everywhere; shared config in `@nexora/typescript-config`.
- **Shared types** live in `@nexora/shared-types` and are imported by web/api/worker.
- **No secrets in code.** Configuration comes from environment variables; see `.env.example`.
- **Health checks** are mandatory for every service (used by Docker/K8s and CI smoke tests).
- **Migrations** (added in Phase 2) are the only mechanism for schema changes.

## Adding a dependency

Prefer existing dependencies. When a new one is required, justify it, add it to the specific
app/package (not the root unless truly shared), and keep the lockfile committed.

## Database & authentication (Phase 2)

The API uses TypeORM against PostgreSQL. Schema changes are applied only through
migrations (never `synchronize`).

```bash
# Start infra (Postgres + Redis) via Docker Compose
docker compose up -d postgres redis

# From apps/api — set DATABASE_URL and the JWT secrets first (see .env.example)
pnpm --filter @nexora/api run migration:run   # apply migrations
pnpm --filter @nexora/api run db:seed         # optional dev demo tenant/users
pnpm --filter @nexora/api run test:e2e        # auth + tenant-isolation e2e tests
```

Auth flow: `POST /api/v1/auth/register` creates a tenant and its first
`TENANT_ADMIN`; `login`/`refresh`/`logout` manage rotating JWT refresh sessions.
Every request's tenant is derived from the signed access token, never from the
request body — this is what enforces tenant isolation. Authorization is checked
server-side via the `@RequirePermissions(...)` decorator and the global
`PermissionsGuard`.
