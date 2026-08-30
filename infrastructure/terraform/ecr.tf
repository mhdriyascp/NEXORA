# Container registries for the application images. The EKS cluster itself is
# intentionally left to a dedicated module (see README) — this file provisions
# the ECR repositories that both ECS and EKS deployments consume.

locals {
  services = ["api", "web", "worker", "ai-service"]
}

resource "aws_ecr_repository" "this" {
  for_each = toset(local.services)

  name                 = "nexora/${each.value}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
  }

  tags = { Name = "nexora-${each.value}" }
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = { type = "expire" }
      }
    ]
  })
}
