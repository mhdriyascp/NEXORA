# NEXORA — AWS Infrastructure (Terraform)

This directory contains the Terraform configuration that provisions the AWS
foundation for a production NEXORA deployment.

> **Status:** This is a reviewed, `terraform validate`-clean skeleton. It has
> **not** been applied to a live AWS account from this repository. Review
> instance sizes, CIDR ranges, and cost implications before `terraform apply`.

## What it provisions

| File            | Resources |
|-----------------|-----------|
| `providers.tf`  | AWS + random providers, default tags, remote-backend template |
| `vpc.tf`        | VPC, public/private subnets (2 AZ), IGW, NAT gateways, routing |
| `security.tf`   | Security groups isolating the app / database / redis tiers |
| `rds.tf`        | RDS PostgreSQL 16 (Multi-AZ, encrypted), generated password + Secrets Manager `DATABASE_URL` |
| `redis.tf`      | ElastiCache Redis (Multi-AZ, encryption in transit + at rest) |
| `s3.tf`         | Private, versioned, KMS-encrypted buckets: documents, attachments, reports, knowledge base |
| `ecr.tf`        | ECR repositories (scan-on-push, immutable tags, lifecycle policy) for api/web/worker/ai-service |
| `outputs.tf`    | VPC, subnet, RDS/Redis endpoints, bucket names, ECR URLs, secret ARN |

## Design notes

- **Secrets never live in code or state output in plaintext.** The RDS master
  password is generated with the `random` provider and the assembled connection
  string is stored in AWS Secrets Manager. Workloads read it at runtime.
- **Network isolation:** RDS and Redis sit in private subnets and only accept
  traffic from the application security group. Only load balancers are public.
- **Compute:** ECR repositories are provisioned here. The cluster (EKS or ECS
  Fargate) is intentionally left to a dedicated module so teams can pick the
  runtime that fits. The Kubernetes manifests under
  `infrastructure/kubernetes/` target EKS.

## Usage

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars   # then edit
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
```

Configure a remote state backend (see the commented `backend "s3"` block in
`providers.tf`) before collaborating across a team.
