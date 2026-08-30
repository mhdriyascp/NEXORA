# NEXORA production network: a VPC with public and private subnets across two
# AZs, an internet gateway for public egress and NAT gateways for private
# subnets. Application workloads (EKS/ECS) and data stores (RDS, ElastiCache)
# live in private subnets; only the load balancer is public.

locals {
  public_subnet_cidrs  = [for i, _ in var.azs : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnet_cidrs = [for i, _ in var.azs : cidrsubnet(var.vpc_cidr, 8, i + 10)]
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "nexora-${var.environment}" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "nexora-${var.environment}-igw" }
}

resource "aws_subnet" "public" {
  count                   = length(var.azs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                     = "nexora-${var.environment}-public-${count.index}"
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]

  tags = {
    Name                              = "nexora-${var.environment}-private-${count.index}"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_eip" "nat" {
  count  = length(var.azs)
  domain = "vpc"
  tags   = { Name = "nexora-${var.environment}-nat-${count.index}" }
}

resource "aws_nat_gateway" "main" {
  count         = length(var.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = { Name = "nexora-${var.environment}-nat-${count.index}" }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "nexora-${var.environment}-public" }
}

resource "aws_route_table_association" "public" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = length(var.azs)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = { Name = "nexora-${var.environment}-private-${count.index}" }
}

resource "aws_route_table_association" "private" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
