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
| **Phase 0** | Architecture | ✅ **In progress (this deliverable)** |
| Phase 1 | Foundation (monorepo, apps, Docker Compose, health checks, CI) | ⏳ Not started |
| Phase 2 | Authentication + Multi-Tenancy | ⏳ Not started |
| Phase 3 | CRM Core | ⏳ Not started |
| Phase 4 | Dashboard | ⏳ Not started |
| Phase 5 | AI Foundation | ⏳ Not started |
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

The following layout is the **target** structure that Phase 1 will scaffold. It does not fully
exist yet.

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

> ⚠️ Application scaffolding lands in **Phase 1**. Until then, this repository contains
> architecture documentation only. The commands below describe the **intended** developer workflow.

```bash
# 1. Copy environment template and fill in local values
cp .env.example .env

# 2. Install workspace dependencies (Node/TS)
pnpm install

# 3. Start infrastructure + services locally
docker compose up

# Services (planned):
#   web         → http://localhost:3000
#   api         → http://localhost:4000  (Swagger at /api/docs)
#   ai-service  → http://localhost:8000  (OpenAPI at /docs)
#   postgres    → localhost:5432
#   redis       → localhost:6379
```

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
