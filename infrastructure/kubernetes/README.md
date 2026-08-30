# NEXORA Kubernetes Manifests

Base manifests (kustomize) for deploying NEXORA to a Kubernetes cluster.

## Contents
- `namespace.yaml` — `nexora` namespace
- `configmap.yaml` — non-secret configuration
- `secret.example.yaml` — **template only**; provision real secrets via a
  secrets manager (e.g. External Secrets Operator + AWS Secrets Manager)
- `api.yaml`, `ai-service.yaml`, `worker.yaml`, `web.yaml` — Deployments +
  Services (API also includes an HPA)
- `ingress.yaml` — TLS ingress for the web UI and API

## Apply
```bash
# 1) Provision secrets out-of-band (never commit real values):
kubectl -n nexora create secret generic nexora-secrets --from-literal=... 

# 2) Apply the base:
kubectl apply -k infrastructure/kubernetes/base
```

## Notes
- Images are pulled from `ghcr.io/mhdriyascp/nexora-*`; build/push via CI.
- Postgres (with pgvector) and Redis are expected to be managed services
  (RDS / ElastiCache) referenced through `nexora-secrets`.
- All pods run as non-root with dropped capabilities; API/worker use a
  read-only root filesystem.
