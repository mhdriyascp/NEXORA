# NEXORA — Architecture

**Status:** Phase 0 (Architecture). This document is the authoritative description of the intended
system architecture. It is design documentation; application code is implemented from Phase 1
onward. Documentation is kept in sync with the actual implementation as phases land.

---

## Table of Contents

1. [Current Repository Assessment](#1-current-repository-assessment)
2. [Architecture Goals & Constraints](#2-architecture-goals--constraints)
3. [System Architecture](#3-system-architecture)
4. [Monorepo Structure](#4-monorepo-structure)
5. [Domain Boundaries](#5-domain-boundaries)
6. [Database Architecture](#6-database-architecture)
7. [Multi-Tenancy Architecture](#7-multi-tenancy-architecture)
8. [Authentication Architecture](#8-authentication-architecture)
9. [API Architecture](#9-api-architecture)
10. [Background Jobs & Async Processing](#10-background-jobs--async-processing)
11. [Search Architecture](#11-search-architecture)
12. [Observability](#12-observability)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Development Phases](#14-development-phases)
15. [Architecture Decision Records (ADRs)](#15-architecture-decision-records-adrs)

Related documents: [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) · [SECURITY.md](SECURITY.md).

---

## 1. Current Repository Assessment

At the start of Phase 0 the repository contained:

- A single `README.md` with the project name (`NEXORA`) and the tagline "AI-Powered CRM".
- No application code, monorepo tooling, infrastructure, tests, or CI.
- Git history: a single `Initial commit`.

**Implication:** This is a greenfield project. There is no existing architecture to preserve or
migrate, and no working functionality to avoid breaking. Phase 0 therefore defines the architecture
from scratch. No assumptions are made about pre-existing files.

---

## 2. Architecture Goals & Constraints

**Functional goals**

- Full CRM: companies, contacts, leads, opportunities/deals, pipelines, activities, tasks, notes.
- Integrated AI Copilot: natural-language search, Q&A, summarization, insights, record actions,
  task creation, email drafting, pipeline analysis, at-risk detection, document search (RAG).

**Non-functional goals**

- Multi-tenancy, enterprise security, horizontal scalability, high availability, observability,
  AI safety, future microservice extraction, AWS deployability.

**Constraints & guardrails (from the specification)**

- Modular monolith for the CRM backend; do **not** create unnecessary microservices.
- PostgreSQL + pgvector only for storage/vectors initially; no Milvus/Elasticsearch/OpenSearch
  until a demonstrated requirement exists.
- The AI service must **never** execute SQL, modify the DB directly, bypass CRM services, bypass
  authorization/tenant isolation, or trust client-provided tenant IDs.
- Do not over-engineer. When multiple valid choices exist, pick one, record the reason as an ADR,
  and proceed.

---

## 3. System Architecture

NEXORA is composed of four deployable applications plus shared infrastructure. The CRM backend is
the **source of truth** for all business logic and data.

```
                 USER (browser)
                   │
                   ▼
              NEXT.JS UI  (apps/web)
                   │  REST (JSON) + SSE for AI streaming
                   ▼
             NESTJS API  (apps/api) ── Swagger/OpenAPI
                   │  modular monolith, CRM domain = source of truth
        ┌──────────┼───────────────────────────┐
        │          │                            │
        ▼          ▼                            ▼
   CRM DOMAIN   PLATFORM                    AI GATEWAY
   SERVICES     (auth, tenancy,             (thin proxy in NestJS)
        │        RBAC, audit)                    │
        │          │                             ▼
        │          │                     AI SERVICE (apps/ai-service, FastAPI)
        │          │                             │
        │          │                            LLM
        │          │                             │
        │          │                        Tool Request
        │          │                             │
        │          │        (calls back over authenticated internal API)
        │          └───────────────◄─────────────┘
        │                          Authorization + Tenant + Permission re-check
        ▼
   PostgreSQL + pgvector      Redis (cache/queue/locks)      S3 (objects)
                                   │
                                   ▼
                          Worker (apps/worker, BullMQ)
```

**Request classes**

- **CRM request:** Web → NestJS → CRM domain service → PostgreSQL. Standard synchronous REST.
- **AI request:** Web → NestJS AI Gateway → FastAPI AI service → LLM. The AI service orchestrates
  the LLM and RAG. When the LLM wants to read/write CRM data it emits a **tool request**, which is
  executed by calling authorized NestJS CRM services (not the DB). Responses stream to the client
  via SSE.
- **Async work:** Long-running work (document processing, embeddings, emails, reports,
  notifications) is enqueued to Redis and processed by the worker. API requests never block on it.

**Why a NestJS "AI Gateway" in front of the Python service?** It keeps a single authenticated
entry point, enforces rate/token/cost limits and tenant context centrally, and prevents the browser
from talking to the AI service directly. The AI service is not internet-exposed.

---

## 4. Monorepo Structure

A single monorepo managed with **pnpm workspaces** for Node/TypeScript, and **Poetry (or uv)** for
the Python service (decision recorded in [ADR-0009](#adr-0009-python-dependency-management)).

```
NEXORA/
├── apps/
│   ├── web/          # Next.js frontend (feature-based)
│   ├── api/          # NestJS CRM backend (modular monolith)
│   ├── ai-service/   # FastAPI AI service (Python)
│   └── worker/       # BullMQ background job processor (Node)
├── packages/
│   ├── shared-types/     # Shared TS types & API contracts (source: Zod/OpenAPI)
│   ├── eslint-config/    # Shared ESLint config
│   ├── typescript-config/# Shared tsconfig bases
│   └── ui/               # Shared shadcn/ui-based component library
├── infrastructure/
│   ├── docker/       # Per-service Dockerfiles
│   ├── kubernetes/   # K8s manifests (Phase 12)
│   └── terraform/    # AWS IaC (Phase 13)
├── docs/
├── scripts/
├── .github/workflows/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── README.md
└── .env.example
```

Rationale for a monorepo: shared types across web/api, atomic cross-cutting changes, unified CI,
and simpler local orchestration. See [ADR-0002](#adr-0002-monorepo-with-pnpm-workspaces).

---

## 5. Domain Boundaries

The CRM backend is a **modular monolith**: one deployable, internally partitioned into modules with
explicit boundaries so any module can later be extracted into a service without a rewrite. Modules
communicate through service interfaces (and, where decoupling is needed, domain events), never by
reaching into another module's tables directly.

| Bounded Context | Modules | Responsibility |
|-----------------|---------|----------------|
| **Identity** | auth, users, organizations, tenants, roles, permissions, sessions | Who the caller is, which tenant they belong to, and what they may do |
| **CRM** | leads, contacts, companies, opportunities, deals, pipelines, pipeline-stages, activities, tasks, notes, calendar | Core CRM business logic — the source of truth |
| **Communication** | email, notifications, webhooks, integrations | Outbound/inbound messaging and 3rd-party integration |
| **Documents** | documents, attachments, knowledge-base, document-processing | File storage lifecycle and text extraction feeding RAG |
| **Intelligence** | ai-assistant, ai-insights, rag, conversations, ai-tools, ai-memory, ai-usage, ai-cost | AI orchestration metadata (the heavy lifting lives in the FastAPI service) |
| **Administration** | dashboard, reports, analytics, audit-logs, api-keys, settings, billing | Cross-cutting admin, reporting, and platform config |

**Boundary rules**

- Each module owns its tables; cross-module reads go through the owning module's service.
- The **Intelligence** context stores AI *metadata* (conversations, tool calls, usage) in
  PostgreSQL, but delegates model orchestration to the Python AI service. CRM business logic is
  **never** duplicated in Python — see [ADR-0006](#adr-0006-ai-service-is-orchestration-only).
- A module's public surface is its service interface + DTOs; internal entities are not exported.

Typical module layout (NestJS): `entity`, `dto`, `controller`, `service`, `repository/data-access`,
`*.guard`/authorization, `*.spec` tests.

---

## 6. Database Architecture

**Primary store:** PostgreSQL. **Vectors:** the `pgvector` extension in the same database.

### 6.1 Conventions

- **UUID** primary keys (v4/v7) — avoids cross-tenant enumeration and eases future sharding.
- **Foreign keys** with appropriate `ON DELETE` behavior; **unique constraints** for natural keys.
- **Indexes** on all foreign keys, on `tenant_id`, and on common filter/sort columns.
- **Timestamps** `created_at` / `updated_at` (UTC) on every table.
- **Soft deletion** (`deleted_at`) where records must be recoverable/auditable (CRM entities);
  hard delete where retention adds no value.
- **Optimistic locking** via a `version` column on entities with concurrent edits (e.g. deals).
- **Transactions** for all multi-write operations; migrations are the only way to change schema
  ([ADR-0008](#adr-0008-migrations-as-the-only-schema-change-mechanism)).

### 6.2 Core Entities (minimum set)

```
Identity:      tenants, users, roles, permissions, user_roles, sessions
CRM:           companies, contacts, leads, opportunities, pipelines,
               pipeline_stages, deals, activities, tasks, notes
Documents:     documents, document_chunks
Intelligence:  conversations, messages, ai_tool_calls, ai_usage
Platform:      notifications, audit_logs, api_keys, webhooks, integrations
```

### 6.3 Tenant Ownership

Every tenant-owned table carries a non-null `tenant_id` referencing `tenants(id)`, with a
composite index leading on `tenant_id`. Global tables (`tenants`, `permissions`, and other
platform-level catalogs) are the only exceptions.

### 6.4 Vector Storage (pgvector)

`document_chunks` stores the chunk text, an `embedding vector(N)` column, and retrieval metadata
(`tenant_id`, `document_id`, `entity_type`, `entity_id`, `permissions`, `created_at`). An
approximate-nearest-neighbor index (HNSW or IVFFlat) accelerates semantic search. Retrieval always
filters by `tenant_id` (and user permissions) **before** returning chunks. Details in
[AI_ARCHITECTURE.md](AI_ARCHITECTURE.md#rag-architecture).

### 6.5 Migration to a dedicated vector/search system

pgvector is sufficient at current scale. The retrieval layer is placed behind an interface so a
dedicated vector DB or OpenSearch can be adopted later without touching call sites
([ADR-0004](#adr-0004-postgresql--pgvector-first)).

A dedicated `docs/DATABASE.md` with full ER diagrams and column-level detail is produced in Phase 2
as the schema is implemented via migrations.

---

## 7. Multi-Tenancy Architecture

NEXORA is multi-tenant from day one using a **shared database, shared schema, row-level
`tenant_id`** model ([ADR-0003](#adr-0003-shared-schema-multi-tenancy-with-tenant_id)).

```
Authenticated User
       ↓
Tenant Context   (derived from the auth token / session — NEVER from the request body)
       ↓
Authorization    (RBAC + permission checks)
       ↓
Domain Service   (injects tenant_id into every query)
       ↓
Database         (every tenant-owned query is scoped by tenant_id)
```

**Enforcement layers (defense in depth):**

1. **Request context** — a `TenantContext` is established from the authenticated principal on every
   request and propagated (e.g. via NestJS request scope / async local storage). Any `tenant_id`
   in the client payload is ignored.
2. **Data-access layer** — repositories automatically apply `WHERE tenant_id = :ctxTenantId`. A
   shared base repository makes tenant scoping the default, not an opt-in.
3. **Database (optional hardening)** — PostgreSQL Row-Level Security policies can be enabled per
   tenant-owned table as an additional backstop.

**Testing:** Cross-tenant access is explicitly tested — every list/read/update/delete path has a
negative test asserting that Tenant A cannot see or mutate Tenant B's data. Tenant isolation must
be verified before CRM feature work continues (Phase 2 gate).

---

## 8. Authentication Architecture

- **Credentials:** email + password. Passwords hashed with a memory-hard algorithm (Argon2id
  preferred, bcrypt acceptable). Never stored or logged in plaintext.
- **Sessions/tokens:** short-lived access token (JWT) + longer-lived refresh token. Refresh tokens
  are rotated and stored server-side (`sessions` table) so they can be revoked. Tokens carry
  `user_id`, `tenant_id`, roles/permission claims, and a session id.
- **Transport:** tokens delivered via `HttpOnly`, `Secure`, `SameSite` cookies for the browser;
  API keys (hashed at rest) for programmatic/service access.
- **Brute-force protection:** Redis-backed rate limiting and progressive lockout on auth endpoints.
- **Service-to-service:** the NestJS AI Gateway authenticates to the FastAPI service with an
  internal credential; the FastAPI service authenticates back to NestJS CRM services when executing
  tools, carrying the original user/tenant context so authorization is re-evaluated.

Full authorization model (RBAC roles, permission catalog, and enforcement) is in
[SECURITY.md](SECURITY.md#authorization).

---

## 9. API Architecture

- **Versioned** under `/api/v1/*`: `auth`, `users`, `tenants`, `leads`, `contacts`, `companies`,
  `opportunities`, `deals`, `tasks`, `activities`, `documents`, `reports`, `notifications`, `ai`.
- **Every list endpoint supports** pagination, filtering, sorting, and search — all executed
  server-side/in the database. Unbounded queries are prohibited.
- **Cross-cutting concerns:** request validation (DTO + Zod/class-validator), rate limiting,
  correlation via `requestId`, structured errors, and Swagger/OpenAPI generation.
- **HTTP status codes** used correctly (`200/201/204`, `400/401/403/404/409/422`, `429`, `5xx`).

### 9.1 Consistent Response Envelope

Success:

```json
{ "success": true, "data": { }, "meta": { "requestId": "req_123", "page": 1, "pageSize": 20, "total": 137 } }
```

Error (never leaks stack traces, SQL, secrets, or infra details):

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Lead not found",
    "requestId": "req_123"
  }
}
```

A dedicated `docs/API.md` with endpoint-level contracts is generated from OpenAPI starting in
Phase 3.

---

## 10. Background Jobs & Async Processing

Redis + **BullMQ** ([ADR-0005](#adr-0005-redis--bullmq-for-background-jobs)) power the `worker` app.

Job types: email processing, document processing, embeddings, AI summarization, notifications,
reports, imports, webhooks, scheduled tasks.

Every job supports: **retry** with **exponential backoff**, **dead-letter** handling where
appropriate, **idempotency** (idempotency keys / natural dedupe), and structured **logging**.
API requests enqueue and return immediately; they never block on job completion.

---

## 11. Search Architecture

Global search across contacts, companies, leads, deals, tasks, notes, and documents.

- **Start with PostgreSQL full-text search** (`tsvector`/`tsquery` + GIN indexes), scoped by
  `tenant_id` and permissions.
- Search is placed behind a **`SearchProvider` abstraction** so OpenSearch/Elasticsearch can be
  introduced later without changing callers ([ADR-0004](#adr-0004-postgresql--pgvector-first)).
- Semantic/document search uses pgvector (see RAG). Keyword and semantic search are complementary.

---

## 12. Observability

- **Structured logging** (JSON) with `requestId`/trace correlation across web → api → ai-service →
  worker. Logs are **PII-aware** — sensitive fields are redacted.
- **Metrics tracked:** API latency & errors, DB latency, queue latency & failures, AI latency, LLM
  errors, token usage, AI cost, tool execution, RAG retrieval quality.
- **Designed for** OpenTelemetry tracing, Prometheus-compatible metrics, CloudWatch (AWS), and
  Langfuse-compatible AI observability. Instrumentation is added incrementally; Phase 10 hardens it.

---

## 13. Deployment Architecture

**Local:** `docker-compose.yml` orchestrates `web`, `api`, `ai-service`, `worker`, `postgres`,
`redis`. Multi-stage, minimal, non-root images with health checks; production containers never run
dev servers.

**AWS (introduced only when a phase requires it):**

```
Route 53 → CloudFront → ALB → EKS ┬ web (Next.js)
                                  ├ api (NestJS)
                                  ├ ai-service (FastAPI)
                                  └ worker (BullMQ)
        RDS PostgreSQL (+pgvector) · ElastiCache Redis · S3 · ECR
        CloudWatch (logs/metrics) · Secrets Manager · SES (email)
```

**Kubernetes** manifests (Namespace, Deployment, Service, Ingress, ConfigMap, Secret, HPA, PDB)
allow each app to scale independently. K8s is not deployed until the app runs correctly locally.
IaC via **Terraform**. Full detail lands in `docs/DEPLOYMENT.md` (Phases 11–13).

---

## 14. Development Phases

| Phase | Focus | Exit criteria (summary) |
|-------|-------|-------------------------|
| **0** | Architecture | This documentation set complete and agreed |
| **1** | Foundation | All four apps + Postgres + Redis start; health checks pass; Docker Compose works; CI runs tests |
| **2** | Auth + Multi-Tenancy | Register/login/logout, RBAC, **tenant isolation verified by tests** |
| **3** | CRM Core | All CRM modules with entity/DTO/validation/controller/service/repo/authz/tests |
| **4** | Dashboard | Server-aggregated metrics + charts + activity feed + AI insight placeholders |
| **5** | AI Foundation | Provider abstraction, FastAPI service, conversation/message models, token & cost tracking, streaming |
| **6** | RAG | S3 storage → processing → chunking → embeddings → pgvector → permission-aware retrieval → citations |
| **7** | AI Tools | Read/write CRM tools, each with schema validation + authorization |
| **8** | AI Assistant UI | Panel/workspace, streaming, history, prompts, tool status, confirmation UI, sources, feedback |
| **9** | Background Processing | Redis queues, workers, document/embedding/email/notification/scheduled jobs |
| **10** | Production Hardening | Security & perf review, load testing, observability, audit logs, rate limits, AI safety |
| **11** | Docker Production | Optimized production images |
| **12** | Kubernetes | Deployment manifests |
| **13** | AWS | IaC deployment architecture |
| **14** | Production Readiness | Security/architecture/perf/DB/AI reviews, DR & backup/restore testing |

Phases are delivered incrementally with small, atomic changes. A feature is complete only when it
meets the acceptance checklist (implemented, validated, authorized, tenant-isolated, tested,
linted, type-checked, migrated, documented, with loading/error/empty UI states where applicable).

---

## 15. Architecture Decision Records (ADRs)

ADRs capture significant decisions, their context, and consequences. Format: Context → Decision →
Consequences. When a future decision supersedes one below, add a new ADR rather than editing
history.

### ADR-0001: Four applications (web / api / ai-service / worker)
- **Context:** Need clear separation between UI, CRM business logic, AI orchestration, and async
  work, without premature microservice sprawl.
- **Decision:** Four deployables. CRM logic is a **modular monolith** in NestJS; the AI service is
  a separate Python app because the AI/ML ecosystem is Python-first; the worker is separate so
  background load scales independently of the API.
- **Consequences:** Independent scaling and clear boundaries; slightly more orchestration than a
  single process. Modules within `api` remain extractable later.

### ADR-0002: Monorepo with pnpm workspaces
- **Context:** Web and API share types/contracts; changes often cross app boundaries.
- **Decision:** Single monorepo; pnpm workspaces for Node/TS packages; shared `packages/*` for
  types, configs, and UI.
- **Consequences:** Atomic cross-cutting changes and shared CI; requires workspace discipline.

### ADR-0003: Shared-schema multi-tenancy with `tenant_id`
- **Context:** Must be multi-tenant from day one with strong isolation and reasonable cost.
- **Decision:** Shared database, shared schema, row-level `tenant_id` on every tenant-owned table.
  Tenant context always derived from authentication; client-supplied tenant IDs are ignored.
  Optional PostgreSQL RLS as a backstop.
- **Consequences:** Simple operations and low overhead; isolation depends on disciplined,
  test-verified query scoping (mitigated by a tenant-scoping base repository + negative tests).
  Schema-per-tenant/DB-per-tenant can be revisited for very large tenants.

### ADR-0004: PostgreSQL + pgvector first
- **Context:** Need relational data, full-text search, and vector similarity without operating
  multiple datastores early.
- **Decision:** Use PostgreSQL as the single primary store and `pgvector` for embeddings. Keyword
  search via Postgres FTS. Hide retrieval/search behind interfaces.
- **Consequences:** One datastore to operate; may hit scaling limits for very large vector/search
  workloads — at which point a dedicated vector DB / OpenSearch is introduced behind the existing
  abstraction.

### ADR-0005: Redis + BullMQ for background jobs
- **Context:** Need reliable async processing for documents, embeddings, emails, and notifications.
- **Decision:** Redis-backed BullMQ, with retry/backoff, dead-letter, and idempotency conventions.
- **Consequences:** Reuses the Redis already needed for cache/rate-limiting; mature Node ecosystem.
  Not a full streaming platform — acceptable for current needs.

### ADR-0006: AI service is orchestration-only
- **Context:** Risk of duplicating CRM business logic (and bypassing authorization) inside Python.
- **Decision:** The FastAPI service performs LLM orchestration, RAG, and tool *selection* only. All
  CRM reads/writes go back through authorized NestJS CRM services. The AI service never executes SQL
  or writes CRM tables directly.
- **Consequences:** Single source of truth for business rules and authorization; one extra network
  hop for AI-initiated CRM operations (acceptable, and the security boundary requires it).

### ADR-0007: NestJS AI Gateway in front of the AI service
- **Context:** The browser must not call the AI service directly; limits and context must be
  enforced centrally.
- **Decision:** A thin AI Gateway module in NestJS is the only entry point to the AI service. It
  applies auth, tenant context, and rate/token/cost limits, and proxies SSE streams to the client.
- **Consequences:** Central control and a non-internet-facing AI service; the gateway must forward
  streams efficiently.

### ADR-0008: Migrations as the only schema-change mechanism
- **Context:** Schema drift and manual production changes are a common failure source.
- **Decision:** All schema changes go through versioned migrations checked into the repo; no manual
  production DDL.
- **Consequences:** Reproducible, reviewable schema evolution; contributors must author migrations.

### ADR-0009: Python dependency management
- **Context:** The AI service needs reproducible Python dependency management alongside pnpm.
- **Decision:** Use **Poetry** (or **uv**) for the `ai-service`, with a lockfile committed. Final
  choice confirmed when the service is scaffolded in Phase 5; documented here and in the service
  README.
- **Consequences:** Reproducible Python builds; a second package manager in the repo (isolated to
  `apps/ai-service`).

### ADR-0010: SSE for AI streaming (WebSockets only where required)
- **Context:** Need to stream tokens, tool events, and status to the browser.
- **Decision:** Prefer Server-Sent Events for standard AI text streaming; reserve WebSockets for
  genuinely bidirectional/real-time features (e.g. live notifications/presence).
- **Consequences:** Simpler, HTTP-friendly streaming for the common case; WebSockets added
  selectively.
