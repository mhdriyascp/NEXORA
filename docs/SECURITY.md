# NEXORA — Security Architecture

**Status:** Phase 0 (Architecture). This document defines the security model the implementation must
follow. Controls are implemented progressively (auth & tenancy in Phase 2; AI safety in Phases 5–7;
hardening in Phase 10), but the model and rules below are binding from the start.

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md).

---

## Table of Contents

1. [Security Principles](#1-security-principles)
2. [Authentication](#2-authentication)
3. [Authorization](#3-authorization)
4. [Multi-Tenancy & Tenant Isolation](#4-multi-tenancy--tenant-isolation)
5. [Mandatory AI Security Architecture](#5-mandatory-ai-security-architecture)
6. [AI Safety & Tool Security](#6-ai-safety--tool-security)
7. [OWASP Controls](#7-owasp-controls)
8. [Secrets Management](#8-secrets-management)
9. [Audit Logging](#9-audit-logging)
10. [Data Protection & Privacy](#10-data-protection--privacy)
11. [Rate Limiting & Abuse Prevention](#11-rate-limiting--abuse-prevention)
12. [Security Testing](#12-security-testing)

---

## 1. Security Principles

- **Security is enforced by application code, never by prompts or the frontend.**
- **Least privilege** everywhere — users, services, database roles, and AI tools.
- **Defense in depth** — multiple independent layers (context, service, data-access, optional RLS).
- **Deny by default** — access, tools, and inputs are denied unless explicitly permitted.
- **Never trust the client** — not for authorization, and never for `tenant_id`.
- **Never trust the LLM** — treat all model output as untrusted input.
- **No secrets in code or logs.** Redact PII in logs and traces.

---

## 2. Authentication

- **Passwords** hashed with a memory-hard algorithm — **Argon2id** preferred (bcrypt acceptable).
  Plaintext passwords are never stored or logged.
- **Tokens/sessions:** short-lived access JWT + rotating refresh token; refresh tokens tracked
  server-side (`sessions`) so they can be revoked. Claims include `user_id`, `tenant_id`, roles,
  permissions, and session id.
- **Cookies:** `HttpOnly`, `Secure`, `SameSite` for browser tokens. **CSRF** protection applied
  where cookie-based auth is used with state-changing requests.
- **API keys** for programmatic access are stored **hashed** and scoped to a tenant + permission
  set; they can be revoked.
- **Brute-force protection:** rate limiting + progressive lockout on authentication endpoints;
  generic error messages that don't reveal whether an account exists.
- **Service-to-service:** the NestJS AI Gateway ↔ FastAPI link uses an internal credential; when the
  AI service executes tools it carries the original user/tenant context so authorization is
  re-evaluated by the CRM services.

---

## 3. Authorization

**Model: RBAC + permission-based authorization, enforced server-side.** Frontend permission checks
exist only for UX and are never the security boundary.

**Roles**

```
SUPER_ADMIN    — platform-wide administration
TENANT_ADMIN   — full administration within a tenant
MANAGER        — team-level management within a tenant
SALES_USER     — day-to-day CRM operations
SUPPORT_USER   — support-oriented access
VIEWER         — read-only
```

**Permissions (catalog)**

```
lead:create     lead:read     lead:update     lead:delete
contact:create  contact:read  contact:update  contact:delete
deal:create     deal:read     deal:update     deal:delete
task:create     task:read     task:update     task:delete
ai:use          ai:admin
report:view     user:manage
```

**Enforcement**

- Every controller/route is protected by guards that check authentication, tenant context, and the
  specific permission(s) required for the operation.
- Roles map to permission sets; permission checks are performed against the authenticated
  principal's effective permissions, not role names alone.
- **AI tools** map to permissions too (e.g. `create_lead` requires `lead:create`, all AI use
  requires `ai:use`). The check is performed at tool-execution time, server-side, independent of
  what the LLM proposed — see [§5](#5-mandatory-ai-security-architecture).

---

## 4. Multi-Tenancy & Tenant Isolation

Isolation model: shared database / shared schema / row-level `tenant_id`
([ARCHITECTURE.md ADR-0003](ARCHITECTURE.md#adr-0003-shared-schema-multi-tenancy-with-tenant_id)).

```
Authenticated User → Tenant Context → Authorization → Domain Service → Database
                     (from the token — NEVER from the request body/LLM)
```

**Rules**

- Every tenant-owned entity has a non-null `tenant_id`. Every query touching tenant-owned data is
  scoped by the **context** tenant id.
- A shared tenant-scoping base repository makes isolation the default; forgetting to scope should be
  hard, not easy. Optional PostgreSQL **Row-Level Security** as an additional backstop.
- `tenant_id` supplied by the client or present in LLM tool arguments is **ignored** — the value is
  always taken from the authenticated context.
- **Cross-tenant access is explicitly tested** (see [§12](#12-security-testing)). Tenant isolation
  must be verified before CRM feature work proceeds (Phase 2 gate).

---

## 5. Mandatory AI Security Architecture

This flow is **mandatory** and non-negotiable:

```
                 USER
                   │
                   ▼
              NEXT.JS UI
                   │
                   ▼
             NESTJS API
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
      CRM DOMAIN        AI SERVICE
          │                 │
          │                 ▼
          │                LLM
          │                 │
          │             Tool Request
          │                 │
          │                 ▼
          │          Authorization  (tenant + permission re-check)
          │                 │
          └───────◄─────────┘
                   │
                   ▼
               PostgreSQL
```

The AI service must **NEVER**:

- ❌ Execute arbitrary SQL
- ❌ Bypass CRM services
- ❌ Bypass authorization
- ❌ Bypass tenant isolation
- ❌ Modify database tables directly
- ❌ Trust user-provided (or LLM-provided) tenant IDs

All AI-initiated reads/writes flow back through authorized NestJS CRM services, which re-verify
authentication, tenant context, and permissions.

---

## 6. AI Safety & Tool Security

Enforced in code (never via prompt instructions):

- **Untrusted output:** every LLM response is treated as untrusted input and validated.
- **Prompt-injection resistance:** untrusted content (documents, CRM records, user text) is data,
  not instructions; it can never change tool authorization or escalate privileges. Authorization is
  always re-checked server-side.
- **Tool schema validation:** strict argument schemas (Pydantic/Zod); unknown tools/args and type
  mismatches are rejected (deny by default).
- **Per-tool authorization:** each tool requires specific permissions, checked at execution time.
- **Human confirmation:** write operations may require it; destructive operations **must**. The
  backend re-verifies authorization on confirmation — confirmation ≠ authorization.
- **RAG permission filtering:** retrieval enforces `tenant_id` + user permissions **before** chunks
  reach the LLM ([AI_ARCHITECTURE.md §7](AI_ARCHITECTURE.md#7-rag-architecture)).
- **Resource limits:** rate limits, token limits, cost limits, timeouts, retries, model fallback.
- **PII-aware AI logging:** prompts/outputs are logged with sensitive data redacted.

---

## 7. OWASP Controls

Aligned with OWASP Top 10 (and LLM Top 10 for AI):

| Risk | Control |
|------|---------|
| Broken access control | Server-side RBAC + permission guards; tenant scoping; deny-by-default; cross-tenant tests |
| Cryptographic failures | Argon2id password hashing; TLS in transit; secrets in a manager, not code |
| Injection (SQL) | Parameterized queries / ORM; no string-built SQL; **LLM never issues SQL** |
| Insecure design | Threat-modeled AI tool flow; least privilege; confirmation for destructive ops |
| Security misconfiguration | Security headers, strict CORS allow-list, non-root containers, minimal images |
| Vulnerable components | Dependency scanning in CI; justify new deps; prefer existing ones |
| Auth failures | Rate limiting, lockout, session revocation, rotating refresh tokens |
| Integrity failures | Signed artifacts, migration-only schema changes, verified webhooks |
| Logging/monitoring gaps | Structured audit logs + observability (see §9, ARCHITECTURE §12) |
| SSRF | Egress controls; validate/allow-list outbound URLs (integrations/webhooks) |
| LLM prompt injection / insecure tool use | Untrusted-output handling; schema-validated, authorized tools; RAG permission filtering |

**Input validation & output encoding:** all inputs validated (DTO + Zod/class-validator); outputs
encoded to prevent XSS; errors returned in the safe envelope with **no** stack traces, SQL, secrets,
or infra details ([ARCHITECTURE.md §9.1](ARCHITECTURE.md#91-consistent-response-envelope)).

---

## 8. Secrets Management

- **Never commit secrets.** All configuration via environment variables; `.env.example` documents
  the required keys with placeholder values only.
- **Production secrets** are stored in **AWS Secrets Manager** (or equivalent) and injected at
  runtime — never baked into images or committed.
- Secrets are excluded from logs and error responses. CI includes secret scanning.

---

## 9. Audit Logging

Audit important operations to the `audit_logs` table:

```
user · tenant · action · entity · entity_id · timestamp ·
IP (where appropriate) · request_id · metadata
```

Example actions: `LOGIN`, `CREATE_LEAD`, `UPDATE_DEAL`, `DELETE_CONTACT`, `AI_TOOL_EXECUTED`,
`PERMISSION_CHANGED`.

Audit logs are tenant-scoped, append-oriented, and **must not** store unnecessary sensitive
information (no secrets, no raw PII beyond what the action requires).

---

## 10. Data Protection & Privacy

- **In transit:** TLS everywhere (client↔web↔api↔ai-service↔datastores where applicable).
- **At rest:** rely on managed encryption (e.g. RDS/S3 encryption) in AWS; sensitive columns
  hashed/encrypted as needed (passwords, API keys).
- **PII-aware handling:** minimize PII sent to the LLM; redact PII in logs/traces; least-context in
  AI ([AI_ARCHITECTURE.md §5](AI_ARCHITECTURE.md#5-conversations-messages--context)).
- **Least data to the model:** only authorized, relevant context is sent to the LLM.

---

## 11. Rate Limiting & Abuse Prevention

- Redis-backed rate limiting on auth, general API, and AI endpoints.
- AI endpoints additionally enforce **token** and **cost** limits per request (and can aggregate per
  tenant). Requests exceeding limits are rejected with a clear, safe error.
- Brute-force/enumeration protections on authentication and on ID-based lookups (UUIDs reduce
  enumeration risk).

---

## 12. Security Testing

Security tests are acceptance gates, not optional extras:

- **Tenant isolation:** every read/list/update/delete path has a negative test proving Tenant A
  cannot access Tenant B's data. (Phase 2 gate — do not continue until verified.)
- **Authorization:** each permission is tested for allow/deny across roles.
- **Auth:** password hashing, lockout, session revocation, token rotation.
- **Constraints & transactions:** DB constraints and transactional integrity are tested.
- **AI security:** prompt-injection, unauthorized-tool-access, AI tenant-isolation, tool-schema
  validation, structured-output validation, RAG permission filtering, and failure handling
  ([AI_ARCHITECTURE.md §14](AI_ARCHITECTURE.md#14-ai-observability--evaluation)).
- **Pipeline:** dependency scanning and container scanning run in CI
  ([ARCHITECTURE.md §14](ARCHITECTURE.md#14-development-phases)).
