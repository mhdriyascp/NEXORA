# Security groups isolating the data tier. Postgres and Redis are only
# reachable from workloads in the application security group — never from the
# public internet.

resource "aws_security_group" "app" {
  name        = "nexora-${var.environment}-app"
  description = "Application workloads (API, AI service, worker)."
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow all outbound."
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "nexora-${var.environment}-app" }
}

resource "aws_security_group" "database" {
  name        = "nexora-${var.environment}-db"
  description = "PostgreSQL — reachable only from application workloads."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from app tier."
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = { Name = "nexora-${var.environment}-db" }
}

resource "aws_security_group" "redis" {
  name        = "nexora-${var.environment}-redis"
  description = "Redis — reachable only from application workloads."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from app tier."
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = { Name = "nexora-${var.environment}-redis" }
}
