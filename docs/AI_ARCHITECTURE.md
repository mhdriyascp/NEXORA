# NEXORA — AI Architecture

**Status:** Phase 0 (Architecture). Design documentation for the AI subsystem. The AI features are
implemented from Phase 5 (AI Foundation) onward; this document defines how they must be built.

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [SECURITY.md](SECURITY.md).

---

## Table of Contents

1. [Objectives](#1-objectives)
2. [Guiding Principles](#2-guiding-principles)
3. [AI Service Overview](#3-ai-service-overview)
4. [Provider Abstraction](#4-provider-abstraction)
5. [Conversations, Messages & Context](#5-conversations-messages--context)
6. [AI Memory](#6-ai-memory)
7. [RAG Architecture](#7-rag-architecture)
8. [Document Processing Pipeline](#8-document-processing-pipeline)
9. [AI Tool Architecture](#9-ai-tool-architecture)
10. [Human Confirmation](#10-human-confirmation)
11. [Streaming](#11-streaming)
12. [AI Safety](#12-ai-safety)
13. [Cost, Tokens & Usage Tracking](#13-cost-tokens--usage-tracking)
14. [AI Observability & Evaluation](#14-ai-observability--evaluation)

---

## 1. Objectives

The AI Assistant is a **CRM Copilot**, available throughout the product, capable of:

- Understanding CRM data and answering questions about customers, leads, deals, and activities.
- Natural-language search over CRM records and company documents (RAG).
- Summarizing customers, generating sales insights, analyzing pipelines, identifying at-risk deals.
- Creating/updating CRM records, creating tasks, drafting emails — **only** through authorized
  tools.
- Maintaining conversations and providing explainable answers with **sources** where applicable.

Example queries: *"Show my open deals." · "Which leads haven't been contacted in 7 days?" ·
"Summarize this customer." · "Which deals are at risk?" · "Create a follow-up task for John
tomorrow." · "Draft an email to this customer." · "Give me this month's sales summary."*

---

## 2. Guiding Principles

1. **The AI never bypasses the CRM domain.** The LLM proposes actions; authorized NestJS CRM
   services execute them. No direct SQL, no direct table writes from Python.
2. **Treat every LLM response as untrusted.** Validate inputs, outputs, and tool arguments in code.
3. **Security is not a prompt.** Authorization, tenant isolation, and limits are enforced by
   application code, never by instructions to the model.
4. **Least context.** Send the LLM only the authorized, relevant context — never bulk CRM data.
5. **Explainability.** Where answers derive from documents/records, return citations.
6. **Provider-agnostic.** The app depends on an abstraction, not a specific LLM vendor.

---

## 3. AI Service Overview

The AI service (`apps/ai-service`, **Python + FastAPI + Pydantic**) is responsible for LLM
orchestration, RAG, embeddings, AI agents/tool orchestration, document processing, summarization,
classification, inference, evaluation, conversation context, and AI usage tracking. It does **not**
duplicate CRM business logic.

```
NestJS AI Gateway  ──►  FastAPI AI Service
                          │
        ┌─────────────────┼─────────────────────┐
        ▼                 ▼                       ▼
   LLM Orchestrator   RAG Pipeline           Tool Orchestrator
   (provider abstr.)  (pgvector retrieval)   (schema-validated tool calls
        │                 │                    routed back to NestJS CRM)
        ▼                 ▼
   Streaming (SSE)   Embeddings
```

The service is **internal-only** — it is reached exclusively through the NestJS AI Gateway
(see [ARCHITECTURE.md ADR-0007](ARCHITECTURE.md#adr-0007-nestjs-ai-gateway-in-front-of-the-ai-service)),
which supplies the authenticated user + tenant context and enforces rate/token/cost limits.

---

## 4. Provider Abstraction

The application must not be tightly coupled to a single LLM vendor.

```
LLMProvider (interface)
    ├── OpenAIProvider
    ├── AnthropicProvider
    └── LocalModelProvider   (e.g. self-hosted / HF Transformers)
```

- A common `LLMProvider` interface exposes `complete()`, `stream()`, and tool/function-calling
  primitives; an `EmbeddingProvider` interface exposes `embed()`.
- Provider, model, and limits are chosen via configuration (`LLM_PROVIDER`, `LLM_MODEL`,
  `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `AI_MAX_TOKENS`, `AI_MAX_COST`). Switching providers is a
  configuration change, not an architecture rewrite.
- **Model fallback:** on provider error/timeout, fall back to a configured secondary model/provider.

---

## 5. Conversations, Messages & Context

- **Persistence:** `conversations` and `messages` tables (PostgreSQL, tenant-scoped) store history.
  `ai_tool_calls` records each tool invocation and outcome; `ai_usage` records token/cost per call.
- **Context assembly:** For each turn the service builds context from (a) recent conversation
  messages (short-term memory), (b) explicitly relevant long-term memory, (c) RAG-retrieved chunks,
  and (d) the **current CRM entity context** the user is viewing.
- **Entity-aware context:** If the user has `Company → ABC Corporation` open and asks "Summarize
  this customer", the gateway passes the entity reference; the service fetches **authorized** context
  via CRM tools (not by dumping the whole record set). Context is filtered to what the user may see.
- **Least-context rule:** Never send unnecessary CRM data to the LLM. Context is trimmed to token
  budgets and to the user's permissions.

---

## 6. AI Memory

Two levels, kept deliberately conservative:

- **Short-term memory:** the current conversation's recent turns, windowed to a token budget.
- **Long-term memory:** only *explicitly useful* facts — user preferences, organization
  information, important business context. It is **not** an automatic dump of every conversation.
  Writes to long-term memory are deliberate (user- or heuristic-triggered) and tenant-scoped.

---

## 7. RAG Architecture

Retrieval-Augmented Generation over company documents and knowledge base.

```
Document
  ↓ Text Extraction
  ↓ Cleaning
  ↓ Chunking
  ↓ Metadata attachment
  ↓ Embedding
pgvector (document_chunks)
  ↓ Permission-aware retrieval   ◄── enforces tenant_id + user permissions FIRST
  ↓ Optional reranking
LLM
  ↓
Response (+ citations/sources)
```

**Chunk metadata (stored on every `document_chunks` row):**

```
tenant_id · document_id · entity_type · entity_id · permissions · created_at
```

**Permission-aware retrieval (mandatory):** retrieval filters by `tenant_id` **and** the requesting
user's permissions/ACL **before** any chunk is returned to the LLM. A user must never receive
context derived from documents they are not authorized to read. This is enforced in the retrieval
query/filter, not by prompting.

**Citations:** responses grounded in retrieved chunks return source references (document + chunk)
so the UI can show provenance.

**Future migration:** retrieval sits behind an interface; a dedicated vector DB or reranker can be
swapped in without changing callers.

---

## 8. Document Processing Pipeline

Processing is **asynchronous** — uploads never block API requests.

```
Upload (via NestJS Documents API)
  ↓
S3 (object stored; metadata row created)
  ↓
Job enqueued (Redis / BullMQ)
  ↓
Python Worker consumes job
  ↓
Extract Text  (PDF, TXT, Markdown; DOCX where practical)
  ↓
Chunk + attach metadata
  ↓
Embed (EmbeddingProvider)
  ↓
Store in pgvector (document_chunks)
```

Supported formats: **PDF, TXT, Markdown**, and **DOCX where practical**. Jobs follow the standard
retry/backoff/idempotency/logging conventions
([ARCHITECTURE.md §10](ARCHITECTURE.md#10-background-jobs--async-processing)).

---

## 9. AI Tool Architecture

The LLM **never** executes SQL and **never** modifies PostgreSQL. It can only act through a
controlled catalog of tools whose arguments are schema-validated and whose execution is authorized
and routed back through NestJS CRM services.

**Tool catalog (initial):**

```
Read-only:  search_contacts, search_companies, search_leads, search_deals,
            get_customer, get_pipeline, get_sales_metrics, summarize_customer,
            generate_report
Write:      create_lead, update_lead, create_task, create_note, draft_email
```

**Execution pipeline (every tool call):**

```
User
 ↓
LLM  (selects a tool + proposes arguments)
 ↓
Tool Selection
 ↓
Schema Validation      (Pydantic/Zod — reject malformed or unexpected args)
 ↓
Authentication         (who is the user?)
 ↓
Tenant Authorization   (tenant_id from context, never from the LLM)
 ↓
Permission Check       (RBAC: e.g. lead:create for create_lead)
 ↓
CRM Domain Service     (NestJS — the source of truth)
 ↓
Database
```

**Rules:**

- Tool arguments are validated against a strict schema before anything else. Unknown fields and
  type mismatches are rejected.
- The tenant id used for execution comes from the **authenticated context**, never from
  LLM-provided arguments.
- Each tool maps to a required permission and is denied if the user lacks it — regardless of what
  the LLM "decided".
- `draft_email`, `summarize_customer`, `generate_report` produce content/artifacts; they do not
  themselves send email or mutate records unless a corresponding authorized write tool is invoked.

---

## 10. Human Confirmation

The model does not get to unilaterally perform sensitive actions.

- **Read-only tools:** may execute automatically when the user is authorized.
- **Write operations:** may require confirmation depending on impact/configuration.
- **Destructive operations:** **must** require explicit human confirmation.

```
AI: I found 23 duplicate contacts. Would you like me to merge them?
    [Cancel] [Review] [Confirm]
```

Confirmation happens **outside the LLM** in the UI. When the user confirms, the backend
**independently re-verifies authorization** (tenant + permissions) before executing — it does not
trust that a confirmation implies authorization.

---

## 11. Streaming

- **Transport:** Server-Sent Events for standard AI text streaming
  ([ARCHITECTURE.md ADR-0010](ARCHITECTURE.md#adr-0010-sse-for-ai-streaming-websockets-only-where-required));
  WebSockets only where genuinely bidirectional.
- **Event types streamed to the client:** token stream, **tool execution events** (started /
  awaiting-confirmation / completed / failed), status updates, completion, and errors.
- The NestJS AI Gateway proxies the SSE stream from FastAPI to the browser, preserving event
  boundaries.

---

## 12. AI Safety

Every LLM response is untrusted. Enforced in application code (not prompts):

- **Prompt-injection resistance** — untrusted content (documents, records, user text) is treated as
  data, never as instructions that can escalate privileges or change tool authorization. Tool
  authorization is always re-checked server-side.
- **Input validation** and **output validation** (including structured-output/schema checks).
- **Tool validation** — strict argument schemas; deny-by-default for unknown tools/args.
- **Authorization, tenant isolation** — re-verified on every tool execution.
- **PII-aware logging** — sensitive fields redacted in logs/traces.
- **Rate limits, token limits, cost limits, timeouts, retries, model fallback.**
- **Human confirmation** for write/destructive operations.

**Do not rely on prompts as a security boundary.** See
[SECURITY.md](SECURITY.md#ai-safety--tool-security) for the full control set.

---

## 13. Cost, Tokens & Usage Tracking

- Every LLM/embedding call records tokens and computed cost in `ai_usage`, attributed to tenant,
  user, conversation, and provider/model.
- **Limits** (`AI_MAX_TOKENS`, `AI_MAX_COST`) are enforced per request and can be aggregated per
  tenant for budgeting/billing. Requests exceeding limits are rejected with a clear error.
- Usage data feeds observability dashboards and the billing architecture.

---

## 14. AI Observability & Evaluation

- **Tracing/metrics:** AI latency, LLM errors, token usage, cost, tool execution outcomes, and RAG
  retrieval quality are instrumented; designed to be **Langfuse-compatible** and to export via
  OpenTelemetry (see [ARCHITECTURE.md §12](ARCHITECTURE.md#12-observability)).
- **Evaluation & testing (from Phase 5+):** prompt-injection tests, unauthorized-tool-access tests,
  tenant-isolation tests, tool-schema-validation tests, structured-output tests, RAG
  permission-filtering tests, retrieval-quality checks, and failure-handling tests. These are gates
  on AI feature completion.
