################################################################################
# VPC and Networking Module
# Provides VPC, subnets, NAT gateways, and routing for AWS infrastructure
################################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

################################################################################
# Local Variables
################################################################################

locals {
  # Use existing VPC or create new one
  vpc_id = var.use_existing_vpc ? var.existing_vpc_id : aws_vpc.main[0].id

  # Use existing subnets or created ones
  public_subnet_ids = var.use_existing_vpc ? var.existing_public_subnet_ids : aws_subnet.public[*].id
  private_subnet_ids = var.use_existing_vpc ? var.existing_private_subnet_ids : aws_subnet.private[*].id
  database_subnet_ids = var.use_existing_vpc ? (
    length(var.existing_database_subnet_ids) > 0 ? var.existing_database_subnet_ids : var.existing_private_subnet_ids
  ) : aws_subnet.database[*].id
}

################################################################################
# VPC
################################################################################

resource "aws_vpc" "main" {
  count = var.use_existing_vpc ? 0 : 1

  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-vpc"
  })
}

################################################################################
# Internet Gateway
################################################################################

resource "aws_internet_gateway" "main" {
  count = var.use_existing_vpc ? 0 : 1

  vpc_id = aws_vpc.main[0].id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-igw"
  })
}

################################################################################
# Public Subnets
################################################################################

resource "aws_subnet" "public" {
  count = var.use_existing_vpc ? 0 : length(var.availability_zones)

  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name                                        = "${var.project_name}-${var.environment}-public-${var.availability_zones[count.index]}"
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  })
}

################################################################################
# Private Subnets (Application Tier)
################################################################################

resource "aws_subnet" "private" {
  count = var.use_existing_vpc ? 0 : length(var.availability_zones)

  vpc_id            = aws_vpc.main[0].id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name                                        = "${var.project_name}-${var.environment}-private-${var.availability_zones[count.index]}"
    "kubernetes.io/role/internal-elb"           = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  })
}

################################################################################
# Database Subnets
################################################################################

resource "aws_subnet" "database" {
  count = var.use_existing_vpc ? 0 : length(var.availability_zones)

  vpc_id            = aws_vpc.main[0].id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + (2 * length(var.availability_zones)))
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-database-${var.availability_zones[count.index]}"
  })
}

################################################################################
# Elastic IPs for NAT Gateways
################################################################################

resource "aws_eip" "nat" {
  count  = var.use_existing_vpc ? 0 : (var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0)
  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
  })

  depends_on = [aws_internet_gateway.main]
}

################################################################################
# NAT Gateways
################################################################################

resource "aws_nat_gateway" "main" {
  count = var.use_existing_vpc ? 0 : (var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-nat-${count.index + 1}"
  })

  depends_on = [aws_internet_gateway.main]
}

################################################################################
# Route Tables - Public
################################################################################

resource "aws_route_table" "public" {
  count = var.use_existing_vpc ? 0 : 1

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  count = var.use_existing_vpc ? 0 : length(var.availability_zones)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

################################################################################
# Route Tables - Private
################################################################################

resource "aws_route_table" "private" {
  count = var.use_existing_vpc ? 0 : (var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 1)

  vpc_id = aws_vpc.main[0].id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.main[0].id : aws_nat_gateway.main[count.index].id
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
  })
}

resource "aws_route_table_association" "private" {
  count = var.use_existing_vpc ? 0 : length(var.availability_zones)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id
}

resource "aws_route_table_association" "database" {
  count = var.use_existing_vpc ? 0 : length(var.availability_zones)

  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[min(count.index, length(aws_route_table.private) - 1)].id
}

################################################################################
# VPC Flow Logs
################################################################################

resource "aws_flow_log" "main" {
  count = var.use_existing_vpc ? 0 : (var.enable_flow_logs ? 1 : 0)

  iam_role_arn    = aws_iam_role.flow_logs[0].arn
  log_destination = aws_cloudwatch_log_group.flow_logs[0].arn
  traffic_type    = "ALL"
  vpc_id          = local.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-flow-logs"
  })
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  count = var.use_existing_vpc ? 0 : (var.enable_flow_logs ? 1 : 0)

  name              = "/aws/vpc/${var.project_name}-${var.environment}/flow-logs"
  retention_in_days = var.flow_logs_retention_days
  kms_key_id        = var.kms_key_arn

  tags = var.tags
}

resource "aws_iam_role" "flow_logs" {
  count = var.use_existing_vpc ? 0 : (var.enable_flow_logs ? 1 : 0)

  name = "${var.project_name}-${var.environment}-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.use_existing_vpc ? 0 : (var.enable_flow_logs ? 1 : 0)

  name = "${var.project_name}-${var.environment}-flow-logs-policy"
  role = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

################################################################################
# VPC Endpoints
################################################################################

resource "aws_vpc_endpoint" "s3" {
  count = var.use_existing_vpc ? 0 : (var.enable_vpc_endpoints ? 1 : 0)

  vpc_id            = local.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-s3-endpoint"
  })
}

resource "aws_vpc_endpoint" "ecr_api" {
  count = var.use_existing_vpc ? 0 : (var.enable_vpc_endpoints ? 1 : 0)

  vpc_id              = local.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ecr-api-endpoint"
  })
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  count = var.use_existing_vpc ? 0 : (var.enable_vpc_endpoints ? 1 : 0)

  vpc_id              = local.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ecr-dkr-endpoint"
  })
}

resource "aws_vpc_endpoint" "secretsmanager" {
  count = var.use_existing_vpc ? 0 : (var.enable_vpc_endpoints ? 1 : 0)

  vpc_id              = local.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-secretsmanager-endpoint"
  })
}

resource "aws_security_group" "vpc_endpoints" {
  count = var.use_existing_vpc ? 0 : (var.enable_vpc_endpoints ? 1 : 0)

  name_prefix = "${var.project_name}-${var.environment}-vpc-endpoints-"
  description = "Security group for VPC endpoints"
  vpc_id      = local.vpc_id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-vpc-endpoints-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

################################################################################
# Database Subnet Group
################################################################################

resource "aws_db_subnet_group" "main" {
  count = var.use_existing_vpc ? 0 : 1

  name        = "${var.project_name}-${var.environment}-db-subnet-group"
  description = "Database subnet group for ${var.project_name} ${var.environment}"
  subnet_ids  = local.database_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  })
}

################################################################################
# ElastiCache Subnet Group
################################################################################

resource "aws_elasticache_subnet_group" "main" {
  count = var.use_existing_vpc ? 0 : 1

  name        = "${var.project_name}-${var.environment}-cache-subnet-group"
  description = "ElastiCache subnet group for ${var.project_name} ${var.environment}"
  subnet_ids  = local.database_subnet_ids

  tags = var.tags
}
