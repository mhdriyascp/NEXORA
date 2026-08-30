# NEXORA Production Readiness Checklist

Use this checklist before promoting NEXORA to production. Each item should be
verified and owned. Items marked ✅ are implemented in this repository; items
marked ☐ are deployment-time responsibilities for the operating team.

## Architecture & code
- ✅ Modular monorepo (`apps/web`, `apps/api`, `apps/ai-service`, `apps/worker`).
- ✅ Clear domain boundaries; AI service cannot bypass the CRM domain layer.
- ✅ TypeScript strict mode; typed shared packages.
- ✅ Automated CI (`.github/workflows/ci.yml`) running lint, typecheck, test, build.

## Security
- ✅ JWT access/refresh auth with argon2id hashing and rotating hashed sessions.
- ✅ Tenant isolation enforced server-side (`tenantId` from JWT, never client input).
- ✅ RBAC via permissions guard on every CRM/AI route.
- ✅ AI service protected by an internal service token.
- ✅ Secrets kept out of code; RDS password generated + stored in Secrets Manager.
- ✅ Containers run as non-root, drop capabilities, read-only root FS where possible.
- ✅ Network isolation: data stores in private subnets, SG-restricted.
- ☐ TLS certificates provisioned (cert-manager / ACM) and enforced end-to-end.
- ☐ WAF / rate limiting at the edge configured.
- ☐ Penetration test / dependency audit completed.

## Data
- ✅ Single source of truth: PostgreSQL; schema via TypeORM migrations (`synchronize: false`).
- ✅ pgvector for embeddings/RAG with tenant scoping.
- ☐ `CREATE EXTENSION vector` run on the production database.
- ☐ Backup restore drill performed and documented.
- ☐ Data retention & GDPR/deletion policy defined.

## Reliability & scale
- ✅ Health/readiness endpoints on every service.
- ✅ Horizontal Pod Autoscaler for the API.
- ✅ Multi-AZ RDS and Redis in Terraform.
- ✅ Idempotent background jobs (Redis queue, re-drivable).
- ☐ Load test executed against target SLOs.
- ☐ On-call rotation and alerting thresholds configured.

## Observability
- ✅ Structured logging to stdout.
- ✅ Per-tenant AI usage tracking.
- ☐ Metrics dashboards and alerts wired to your provider.
- ☐ Distributed tracing across web → api → ai-service verified.

## Deployment
- ✅ Production multi-stage Dockerfiles (non-root, healthchecks).
- ✅ `docker-compose.prod.yml` with required-secret guards and resource limits.
- ✅ Kubernetes kustomize base manifests (validated).
- ✅ Terraform AWS foundation (VPC, RDS, Redis, S3, ECR) — `validate` clean.
- ☐ Terraform applied to a real account and reviewed for cost/sizing.
- ☐ Images built and pushed to registry with immutable tags.
- ☐ Remote Terraform state backend (S3 + DynamoDB lock) configured.

## Sign-off
- ☐ Security review sign-off.
- ☐ SRE / operations sign-off.
- ☐ Product owner go-live approval.

---

> **Note on scope:** The infrastructure code (Docker, Kubernetes, Terraform) in
> this repository is validated but has **not** been applied to a live cloud
> account or cluster from here. The ☐ items above are the remaining
> deployment-time actions required for an actual production launch.
