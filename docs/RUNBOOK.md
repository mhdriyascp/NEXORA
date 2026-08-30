# NEXORA Production Deployment Runbook

This runbook describes how to deploy, operate, and recover the NEXORA platform
in production. It assumes the AWS foundation from `infrastructure/terraform/`
and the Kubernetes manifests from `infrastructure/kubernetes/`.

## 1. Topology

| Component   | Runtime                         | Notes |
|-------------|---------------------------------|-------|
| `web`       | Next.js (container)             | Public via ingress / ALB |
| `api`       | NestJS (container)              | CRM domain, source of truth |
| `ai-service`| FastAPI (container)             | LLM/RAG/tools; internal only |
| `worker`    | Node background jobs (container)| Consumes Redis queues |
| PostgreSQL  | RDS PostgreSQL 16 + pgvector    | Multi-AZ, encrypted |
| Redis       | ElastiCache Redis 7             | Multi-AZ, TLS |
| Object store| S3 (documents/attachments/reports/knowledge) | Private, versioned, KMS |

The AI service **never** writes CRM data directly — all CRM mutations flow
through the NestJS API domain layer.

## 2. Prerequisites

- AWS account with the Terraform stack applied (`infrastructure/terraform`).
- Container images built and pushed to ECR/GHCR for all four services.
- An EKS cluster (or ECS Fargate) with access to the private subnets.
- Secrets populated in AWS Secrets Manager / Kubernetes secrets:
  - `DATABASE_URL` (from Terraform output secret)
  - `REDIS_URL`
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - `AI_SERVICE_INTERNAL_TOKEN`
  - S3 bucket names / IAM role for service accounts (IRSA)

## 3. First deploy

1. Apply infrastructure:
   ```bash
   cd infrastructure/terraform && terraform init && terraform apply
   ```
2. Enable the `vector` extension on the database once:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Run database migrations (job or one-off pod):
   ```bash
   pnpm --filter @nexora/api run migration:run
   ```
4. Deploy workloads:
   ```bash
   kubectl apply -k infrastructure/kubernetes/base
   ```
5. Verify health checks (see §5).

## 4. Routine deploys

- Images are tagged immutably (git SHA). Update the image tags in the kustomize
  overlay and `kubectl apply -k`.
- Migrations run **before** the new API version receives traffic. The API uses
  `synchronize: false`; schema changes only ever go through TypeORM migrations.
- Roll back by re-applying the previous image tag; migrations must be
  backward-compatible (expand/contract pattern).

## 5. Health & readiness probes

| Service    | Path                  | Port |
|------------|-----------------------|------|
| api        | `/api/v1/health`      | 4000 |
| ai-service | `/health`             | 8000 |
| worker     | `/health`             | 4100 |
| web        | `/`                   | 3000 |

## 6. Observability

- **Logs:** structured JSON to stdout, shipped to CloudWatch / your log stack.
- **Metrics:** scrape service metrics; alert on error rate, p95 latency, queue
  depth, DB connections, Redis memory.
- **Tracing:** propagate request/trace IDs from `web` → `api` → `ai-service`.
- **AI usage:** the AI service tracks per-tenant token/usage; monitor for cost
  and abuse.

## 7. Backups & disaster recovery

- **RDS:** automated backups retained 7 days; Multi-AZ failover. Test restore
  quarterly. Point-in-time recovery enabled.
- **S3:** versioning enabled on all buckets; enable cross-region replication for
  critical buckets if RPO requires.
- **Redis:** treated as ephemeral cache/queue; jobs must be idempotent and
  re-drivable. Do not rely on Redis as a system of record.
- **DR target:** RPO ≤ 24h (RDS backups), RTO ≤ 1h via IaC re-apply in a second
  region.

## 8. Scaling

- `api` has an HPA (2–10 replicas @ 70% CPU). Tune per load.
- `worker` scales on queue depth.
- RDS: scale vertically (instance class) or add read replicas for read-heavy
  reporting.
- Redis: increase node type or shards.

## 9. Incident response

1. Check service health/probes and recent deploys.
2. Inspect logs and metrics dashboards for the failing tier.
3. Roll back the last deploy if it correlates with the incident.
4. For data-tier issues, fail over RDS/Redis (Multi-AZ) and open an AWS support
   case if needed.
5. Record a post-incident review.

See `PRODUCTION_READINESS.md` for the go-live checklist.
