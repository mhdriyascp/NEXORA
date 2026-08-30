# ElastiCache Redis for caching, rate limiting, job queues and distributed
# locks. Deployed in private subnets, encrypted in transit and at rest.

resource "aws_elasticache_subnet_group" "main" {
  name       = "nexora-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "nexora-${var.environment}"
  description          = "NEXORA ${var.environment} Redis"

  engine         = "redis"
  engine_version = "7.1"
  node_type      = var.redis_node_type
  port           = 6379

  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  tags = { Name = "nexora-${var.environment}" }
}
