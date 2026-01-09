################################################################################
# RDS Security Configuration
# Security groups and encryption settings
################################################################################

################################################################################
# Security Group
################################################################################

resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  description = "Security group for RDS ${var.project_name} ${var.environment}"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "rds_ingress_eks" {
  count = var.create_eks_security_group_rule ? 1 : 0

  type                     = "ingress"
  from_port                = var.port
  to_port                  = var.port
  protocol                 = "tcp"
  source_security_group_id = var.eks_security_group_id
  security_group_id        = aws_security_group.rds.id
  description              = "Allow PostgreSQL access from EKS nodes"
}

resource "aws_security_group_rule" "rds_ingress_cidr" {
  count = length(var.allowed_cidr_blocks) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = var.port
  to_port           = var.port
  protocol          = "tcp"
  cidr_blocks       = var.allowed_cidr_blocks
  security_group_id = aws_security_group.rds.id
  description       = "Allow PostgreSQL access from specified CIDR blocks"
}

resource "aws_security_group_rule" "rds_ingress_additional_sgs" {
  count = length(var.additional_security_group_ids)

  type                     = "ingress"
  from_port                = var.port
  to_port                  = var.port
  protocol                 = "tcp"
  source_security_group_id = var.additional_security_group_ids[count.index]
  security_group_id        = aws_security_group.rds.id
  description              = "Allow PostgreSQL access from additional security group"
}

# SECURITY FIX: RDS should not have unrestricted egress to the internet.
# Database instances should only communicate within the VPC.
# Egress is now restricted to VPC CIDR block only.
resource "aws_security_group_rule" "rds_egress_vpc" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = [var.vpc_cidr]
  security_group_id = aws_security_group.rds.id
  description       = "Allow outbound traffic within VPC only - SECURITY HARDENED"
}

################################################################################
# IAM Database Authentication
################################################################################

data "aws_iam_policy_document" "rds_iam_auth" {
  count = var.iam_database_authentication_enabled ? 1 : 0

  statement {
    sid    = "AllowRDSIAMAuth"
    effect = "Allow"

    actions = [
      "rds-db:connect"
    ]

    resources = var.engine_mode == "aurora" ? [
      "arn:aws:rds-db:${var.aws_region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_rds_cluster.aurora[0].cluster_resource_id}/*"
      ] : [
      "arn:aws:rds-db:${var.aws_region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.postgres[0].resource_id}/*"
    ]
  }
}

resource "aws_iam_policy" "rds_iam_auth" {
  count = var.iam_database_authentication_enabled ? 1 : 0

  name        = "${var.project_name}-${var.environment}-rds-iam-auth"
  description = "Policy for RDS IAM authentication"
  policy      = data.aws_iam_policy_document.rds_iam_auth[0].json

  tags = var.tags
}

################################################################################
# Secrets Manager Integration for Master Password
################################################################################

resource "aws_secretsmanager_secret" "rds_master_password" {
  count = !var.manage_master_user_password && var.store_password_in_secrets_manager ? 1 : 0

  name        = "${var.project_name}/${var.environment}/rds/master-password"
  description = "Master password for RDS ${var.project_name} ${var.environment}"
  kms_key_id  = var.kms_key_arn

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "rds_master_password" {
  count = !var.manage_master_user_password && var.store_password_in_secrets_manager ? 1 : 0

  secret_id = aws_secretsmanager_secret.rds_master_password[0].id
  secret_string = jsonencode({
    username = var.master_username
    password = var.master_password != null ? var.master_password : random_password.master[0].result
    engine   = var.engine_mode == "aurora" ? var.engine : "postgres"
    host     = var.engine_mode == "aurora" ? aws_rds_cluster.aurora[0].endpoint : aws_db_instance.postgres[0].address
    port     = var.port
    dbname   = var.database_name
  })
}

################################################################################
# SSL/TLS Certificate
################################################################################

# Note: RDS uses AWS-managed certificates by default
# For custom certificates, you would need to configure the rds.ca_certificate parameter
# and manage certificates through AWS Certificate Manager or your own PKI
