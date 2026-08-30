# NEXORA — AI-Powered CRM

> A production-ready, enterprise-grade, **multi-tenant AI CRM SaaS platform**: an Enterprise CRM
> combined with an AI Copilot, RAG, secure AI tool-calling, analytics, automation, enterprise
> security, and observability.

NEXORA is **not** a basic CRUD app with a chatbot bolted on. It is designed as a real commercial
SaaS product where the AI acts as a **CRM Copilot** — understanding CRM data, answering questions,
surfacing insights, and taking authorized actions through controlled tools that **never** bypass
the CRM domain layer, tenant isolation, or authorization.

---

## Status

| Phase | Name | Status |
|-------|------|--------|
| **Phase 0** | Architecture | ✅ **Complete** |
| Phase 1 | Foundation (monorepo, apps, Docker Compose, health checks, CI) | ✅ **Complete** |
| Phase 2 | Authentication + Multi-Tenancy | ✅ **Complete** |
| Phase 3 | CRM Core | ✅ **Complete** |
| Phase 4 | Dashboard | ✅ **Complete** |
| Phase 5 | AI Foundation | ✅ **Complete** |
| Phase 6 | RAG | ⏳ Not started |
| Phase 7 | AI Tools | ⏳ Not started |
| Phase 8 | AI Assistant UI | ⏳ Not started |
| Phase 9 | Background Processing | ⏳ Not started |
| Phase 10 | Production Hardening | ⏳ Not started |
| Phase 11 | Docker Production | ⏳ Not started |
| Phase 12 | Kubernetes | ⏳ Not started |
| Phase 13 | AWS Infrastructure | ⏳ Not started |
| Phase 14 | Production Readiness | ⏳ Not started |

> **Phase 0 is documentation only.** No application code is implemented yet. This is intentional —
> foundation code begins in Phase 1 once the architecture is agreed.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, domain boundaries, database, API, multi-tenancy, deployment, and ADRs |
| [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) | AI service design, provider abstraction, RAG, AI tool-calling, memory, streaming, and evaluation |
| [docs/SECURITY.md](docs/SECURITY.md) | Authentication, authorization (RBAC), tenant isolation, OWASP controls, audit logging, and AI safety |

Planned additional docs (created in later phases as the corresponding features land):
`docs/DATABASE.md`, `docs/API.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `docs/DEVELOPMENT.md`.

---

## High-Level Architecture

```
                         USERS
                           │
                           ▼
                    ┌──────────────┐
                    │  Next.js Web │   (apps/web)
                    └──────┬───────┘
                           │  HTTPS / REST + SSE
                           ▼
                    ┌──────────────┐
                    │  NestJS API  │   (apps/api) — CRM domain, source of truth
                    │  CRM Domain  │
                    └──────┬───────┘
                           │
             ┌─────────────┼───────────────┬─────────────┐
             ▼             ▼               ▼             ▼
        PostgreSQL       Redis            S3        AI Gateway
        + pgvector    (cache/queue)   (documents)       │
                                                        ▼
                                                 ┌──────────────┐
                                                 │ FastAPI AI   │  (apps/ai-service)
                                                 │  LLM · RAG   │
                                                 │  Tools       │
                                                 └──────┬───────┘
                                                        │ Tool requests
                                                        ▼
                                              NestJS CRM Services
                                             (auth + tenant + RBAC)
                                                        │
                                                        ▼
                                                   PostgreSQL
```

**Golden rule:** The AI service **never** touches the database directly for CRM writes. All CRM
reads/writes triggered by AI flow back through authorized NestJS domain services, which re-verify
authentication, tenant context, and permissions. See
[docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) and [docs/SECURITY.md](docs/SECURITY.md).

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Web** | Next.js (App Router), React, TypeScript (strict), Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Recharts |
| **CRM API** | Node.js, TypeScript, NestJS, REST, WebSockets (where required), Swagger/OpenAPI |
| **AI Service** | Python, FastAPI, Pydantic, SQLAlchemy (where required), Hugging Face Transformers / PyTorch / scikit-learn (where required) |
| **Worker** | Node.js + BullMQ (Redis-backed background jobs) |
| **Database** | PostgreSQL (primary) + pgvector (embeddings / semantic search) |
| **Cache / Queue** | Redis (cache, rate limiting, queues, locks, ephemeral state) |
| **Object Storage** | AWS S3 (documents, attachments, reports, KB files) |
| **Tooling** | pnpm workspaces, Poetry/uv (Python), Docker, GitHub Actions |

Full rationale is recorded as Architecture Decision Records in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#architecture-decision-records-adrs).

---

## Target Monorepo Structure

The following layout is the structure Phase 1 scaffolds. Apps and shared
packages now exist with health checks, tests, and CI; later phases fill in
features.

```
ai-crm/ (NEXORA)
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # NestJS CRM backend (modular monolith)
│   ├── ai-service/   # FastAPI AI service
│   └── worker/       # Background job processor (BullMQ)
├── packages/
│   ├── shared-types/     # Shared TypeScript types / API contracts
│   ├── eslint-config/    # Shared lint config
│   ├── typescript-config/# Shared tsconfig bases
│   └── ui/               # Shared UI component library
├── infrastructure/
│   ├── docker/       # Dockerfiles per service
│   ├── kubernetes/   # K8s manifests (later phase)
│   └── terraform/    # AWS IaC (later phase)
├── docs/             # Architecture & engineering docs
├── scripts/          # Dev / ops scripts
├── .github/workflows/# CI/CD
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── README.md
└── .env.example
```

---

## Getting Started

> Phase 1 (Foundation) is in place: all four apps run with health checks, tests, and CI.
> Feature development (auth, CRM, AI) begins in Phase 2.

### Option A — Docker Compose (full stack)

```bash
cp .env.example .env
docker compose up --build
```

### Option B — Local dev (per app)

```bash
# Install workspace dependencies (Node/TS)
pnpm install

# Build shared types, then run any app
pnpm --filter @nexora/shared-types build
pnpm --filter @nexora/api dev      # NestJS  → http://localhost:4000/api/v1/health  (docs: /api/docs)
pnpm --filter @nexora/web dev      # Next.js → http://localhost:3000  (health: /api/health)
pnpm --filter @nexora/worker dev   # Worker  → http://localhost:4100/health

# AI service (Python)
cd apps/ai-service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # http://localhost:8000/health  (docs: /docs)
```

### Quality gates (run by CI)

```bash
pnpm -r run lint         # ESLint / next lint
pnpm -r run typecheck    # tsc --noEmit
pnpm -r run test         # Jest (api, worker)
pnpm -r run build        # nest/next/tsc builds
cd apps/ai-service && pytest   # FastAPI tests
```

Service ports (planned):
`web` → 3000 · `api` → 4000 (Swagger `/api/docs`) · `ai-service` → 8000 (OpenAPI `/docs`) ·
`worker` health → 4100 · `postgres` → 5432 · `redis` → 6379.

See [.env.example](.env.example) for the full list of configuration variables. Real production
secrets are managed via AWS Secrets Manager (or equivalent) and are **never** committed.

---

## Core Principles

1. **Modular monolith first** — clear domain boundaries so services can be extracted later; no
   premature microservices.
2. **Multi-tenant from day one** — every tenant-owned entity carries `tenant_id`; tenant context
   is always derived from the authenticated request, never trusted from the client.
3. **AI never bypasses the CRM domain** — the LLM proposes; authorized NestJS services dispose.
4. **Security is enforced in code, not prompts** — prompts are never a security boundary.
5. **Server-side truth** — pagination, filtering, sorting, aggregation, and authorization all
   happen on the server/database.
6. **Explainable AI** — responses cite sources where applicable; destructive actions require
   explicit human confirmation verified independently by the backend.

---

## License

To be determined.
