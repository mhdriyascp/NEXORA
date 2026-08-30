# S3 buckets for CRM documents, attachments, generated reports and the AI
# knowledge base. All buckets are private, encrypted and versioned, with public
# access fully blocked.

locals {
  buckets = {
    documents   = "nexora-${var.environment}-documents"
    attachments = "nexora-${var.environment}-attachments"
    reports     = "nexora-${var.environment}-reports"
    knowledge   = "nexora-${var.environment}-knowledge-base"
  }
}

resource "aws_s3_bucket" "this" {
  for_each = local.buckets
  bucket   = each.value
  tags     = { Name = each.value }
}

resource "aws_s3_bucket_public_access_block" "this" {
  for_each = aws_s3_bucket.this

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}
