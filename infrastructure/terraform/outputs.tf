output "vpc_id" {
  description = "ID of the NEXORA VPC."
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs (workloads and data stores)."
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (load balancers)."
  value       = aws_subnet.public[*].id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint."
  value       = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint."
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "database_url_secret_arn" {
  description = "Secrets Manager ARN holding the assembled DATABASE_URL."
  value       = aws_secretsmanager_secret.db_url.arn
}

output "s3_bucket_names" {
  description = "Provisioned S3 bucket names by purpose."
  value       = { for k, b in aws_s3_bucket.this : k => b.id }
}

output "ecr_repository_urls" {
  description = "ECR repository URLs by service."
  value       = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}
