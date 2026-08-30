terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Configure a remote backend before use, e.g.:
  # backend "s3" {
  #   bucket         = "nexora-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "nexora-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "nexora"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
