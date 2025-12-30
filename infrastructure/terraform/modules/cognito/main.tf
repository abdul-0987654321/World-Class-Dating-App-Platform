################################################################################
# Cognito Module
# Provides User Pools and Identity Pools for authentication
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
# Data Sources
################################################################################

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

################################################################################
# Cognito User Pool
################################################################################

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-user-pool"

  # Username configuration
  username_attributes      = var.username_attributes
  auto_verified_attributes = var.auto_verified_attributes

  # Username case sensitivity
  username_configuration {
    case_sensitive = var.username_case_sensitive
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 2
    }
  }

  # Password policy
  password_policy {
    minimum_length                   = var.password_minimum_length
    require_lowercase                = var.password_require_lowercase
    require_numbers                  = var.password_require_numbers
    require_symbols                  = var.password_require_symbols
    require_uppercase                = var.password_require_uppercase
    temporary_password_validity_days = var.temporary_password_validity_days
  }

  # MFA configuration
  mfa_configuration = var.mfa_configuration

  dynamic "software_token_mfa_configuration" {
    for_each = var.mfa_configuration != "OFF" ? [1] : []
    content {
      enabled = true
    }
  }

  # SMS configuration for MFA
  dynamic "sms_configuration" {
    for_each = var.sms_authentication_enabled ? [1] : []
    content {
      external_id    = "${var.project_name}-${var.environment}-sms-external-id"
      sns_caller_arn = aws_iam_role.cognito_sms[0].arn
      sns_region     = data.aws_region.current.name
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account  = var.email_sending_account
    from_email_address     = var.from_email_address
    reply_to_email_address = var.reply_to_email_address
    source_arn             = var.ses_email_identity_arn
  }

  # Verification message template
  verification_message_template {
    default_email_option  = var.default_email_option
    email_message         = var.email_verification_message
    email_message_by_link = var.email_verification_message_by_link
    email_subject         = var.email_verification_subject
    email_subject_by_link = var.email_verification_subject_by_link
    sms_message           = var.sms_verification_message
  }

  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = var.allow_admin_create_user_only

    invite_message_template {
      email_message = var.invite_email_message
      email_subject = var.invite_email_subject
      sms_message   = var.invite_sms_message
    }
  }

  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = var.challenge_required_on_new_device
    device_only_remembered_on_user_prompt = var.device_only_remembered_on_user_prompt
  }

  # User attribute update settings
  user_attribute_update_settings {
    attributes_require_verification_before_update = var.attributes_require_verification_before_update
  }

  # Schema attributes
  dynamic "schema" {
    for_each = var.schema_attributes
    content {
      name                     = schema.value.name
      attribute_data_type      = schema.value.attribute_data_type
      developer_only_attribute = lookup(schema.value, "developer_only_attribute", false)
      mutable                  = lookup(schema.value, "mutable", true)
      required                 = lookup(schema.value, "required", false)

      dynamic "string_attribute_constraints" {
        for_each = schema.value.attribute_data_type == "String" ? [1] : []
        content {
          min_length = lookup(schema.value, "min_length", 0)
          max_length = lookup(schema.value, "max_length", 2048)
        }
      }

      dynamic "number_attribute_constraints" {
        for_each = schema.value.attribute_data_type == "Number" ? [1] : []
        content {
          min_value = lookup(schema.value, "min_value", null)
          max_value = lookup(schema.value, "max_value", null)
        }
      }
    }
  }

  # Lambda triggers
  dynamic "lambda_config" {
    for_each = length(var.lambda_triggers) > 0 ? [1] : []
    content {
      create_auth_challenge          = lookup(var.lambda_triggers, "create_auth_challenge", null)
      custom_message                 = lookup(var.lambda_triggers, "custom_message", null)
      define_auth_challenge          = lookup(var.lambda_triggers, "define_auth_challenge", null)
      post_authentication            = lookup(var.lambda_triggers, "post_authentication", null)
      post_confirmation              = lookup(var.lambda_triggers, "post_confirmation", null)
      pre_authentication             = lookup(var.lambda_triggers, "pre_authentication", null)
      pre_sign_up                    = lookup(var.lambda_triggers, "pre_sign_up", null)
      pre_token_generation           = lookup(var.lambda_triggers, "pre_token_generation", null)
      user_migration                 = lookup(var.lambda_triggers, "user_migration", null)
      verify_auth_challenge_response = lookup(var.lambda_triggers, "verify_auth_challenge_response", null)
    }
  }

  # Deletion protection
  deletion_protection = var.deletion_protection

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-user-pool"
  })
}

################################################################################
# User Pool Domain
################################################################################

resource "aws_cognito_user_pool_domain" "main" {
  domain          = var.custom_domain != null ? var.custom_domain : "${var.project_name}-${var.environment}"
  user_pool_id    = aws_cognito_user_pool.main.id
  certificate_arn = var.custom_domain != null ? var.custom_domain_certificate_arn : null
}

################################################################################
# User Pool Clients
################################################################################

resource "aws_cognito_user_pool_client" "main" {
  for_each = var.user_pool_clients

  name         = each.key
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret     = each.value.generate_secret
  explicit_auth_flows = each.value.explicit_auth_flows

  supported_identity_providers = each.value.supported_identity_providers

  callback_urls                        = each.value.callback_urls
  logout_urls                          = each.value.logout_urls
  default_redirect_uri                 = each.value.default_redirect_uri
  allowed_oauth_flows                  = each.value.allowed_oauth_flows
  allowed_oauth_flows_user_pool_client = each.value.allowed_oauth_flows_user_pool_client
  allowed_oauth_scopes                 = each.value.allowed_oauth_scopes

  read_attributes  = each.value.read_attributes
  write_attributes = each.value.write_attributes

  access_token_validity  = each.value.access_token_validity
  id_token_validity      = each.value.id_token_validity
  refresh_token_validity = each.value.refresh_token_validity

  token_validity_units {
    access_token  = each.value.access_token_validity_units
    id_token      = each.value.id_token_validity_units
    refresh_token = each.value.refresh_token_validity_units
  }

  prevent_user_existence_errors = each.value.prevent_user_existence_errors
  enable_token_revocation       = each.value.enable_token_revocation

  enable_propagate_additional_user_context_data = each.value.enable_propagate_additional_user_context_data
}

################################################################################
# Resource Server (for custom scopes)
################################################################################

resource "aws_cognito_resource_server" "main" {
  for_each = var.resource_servers

  identifier   = each.value.identifier
  name         = each.key
  user_pool_id = aws_cognito_user_pool.main.id

  dynamic "scope" {
    for_each = each.value.scopes
    content {
      scope_name        = scope.value.scope_name
      scope_description = scope.value.scope_description
    }
  }
}

################################################################################
# User Pool Groups
################################################################################

resource "aws_cognito_user_group" "main" {
  for_each = var.user_groups

  name         = each.key
  user_pool_id = aws_cognito_user_pool.main.id
  description  = each.value.description
  precedence   = each.value.precedence
  role_arn     = each.value.role_arn
}

################################################################################
# Identity Pool
################################################################################

resource "aws_cognito_identity_pool" "main" {
  count = var.create_identity_pool ? 1 : 0

  identity_pool_name               = "${var.project_name}-${var.environment}-identity-pool"
  allow_unauthenticated_identities = var.allow_unauthenticated_identities
  allow_classic_flow               = var.allow_classic_flow

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main[var.identity_pool_provider_client].id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = var.server_side_token_check
  }

  dynamic "cognito_identity_providers" {
    for_each = var.additional_identity_providers
    content {
      client_id               = cognito_identity_providers.value.client_id
      provider_name           = cognito_identity_providers.value.provider_name
      server_side_token_check = lookup(cognito_identity_providers.value, "server_side_token_check", false)
    }
  }

  # Social identity providers (e.g., Facebook, Google)
  supported_login_providers = var.supported_login_providers

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-identity-pool"
  })
}

################################################################################
# Identity Pool Roles
################################################################################

resource "aws_cognito_identity_pool_roles_attachment" "main" {
  count = var.create_identity_pool ? 1 : 0

  identity_pool_id = aws_cognito_identity_pool.main[0].id

  roles = {
    "authenticated"   = aws_iam_role.cognito_authenticated[0].arn
    "unauthenticated" = var.allow_unauthenticated_identities ? aws_iam_role.cognito_unauthenticated[0].arn : null
  }

  dynamic "role_mapping" {
    for_each = var.identity_pool_role_mappings
    content {
      identity_provider         = role_mapping.value.identity_provider
      ambiguous_role_resolution = role_mapping.value.ambiguous_role_resolution
      type                      = role_mapping.value.type

      dynamic "mapping_rule" {
        for_each = role_mapping.value.mapping_rules
        content {
          claim      = mapping_rule.value.claim
          match_type = mapping_rule.value.match_type
          role_arn   = mapping_rule.value.role_arn
          value      = mapping_rule.value.value
        }
      }
    }
  }
}

################################################################################
# IAM Roles for Identity Pool
################################################################################

resource "aws_iam_role" "cognito_authenticated" {
  count = var.create_identity_pool ? 1 : 0

  name = "${var.project_name}-${var.environment}-cognito-authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main[0].id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "cognito_authenticated" {
  count = var.create_identity_pool ? 1 : 0

  name = "${var.project_name}-${var.environment}-cognito-authenticated-policy"
  role = aws_iam_role.cognito_authenticated[0].id

  policy = var.authenticated_role_policy != null ? var.authenticated_role_policy : jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "cognito_unauthenticated" {
  count = var.create_identity_pool && var.allow_unauthenticated_identities ? 1 : 0

  name = "${var.project_name}-${var.environment}-cognito-unauthenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main[0].id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "unauthenticated"
          }
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "cognito_unauthenticated" {
  count = var.create_identity_pool && var.allow_unauthenticated_identities ? 1 : 0

  name = "${var.project_name}-${var.environment}-cognito-unauthenticated-policy"
  role = aws_iam_role.cognito_unauthenticated[0].id

  policy = var.unauthenticated_role_policy != null ? var.unauthenticated_role_policy : jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "mobileanalytics:PutEvents",
          "cognito-sync:*"
        ]
        Resource = "*"
      }
    ]
  })
}

################################################################################
# IAM Role for SMS
################################################################################

resource "aws_iam_role" "cognito_sms" {
  count = var.sms_authentication_enabled ? 1 : 0

  name = "${var.project_name}-${var.environment}-cognito-sms"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cognito-idp.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = "${var.project_name}-${var.environment}-sms-external-id"
          }
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "cognito_sms" {
  count = var.sms_authentication_enabled ? 1 : 0

  name = "${var.project_name}-${var.environment}-cognito-sms-policy"
  role = aws_iam_role.cognito_sms[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "sns:publish"
        Resource = "*"
      }
    ]
  })
}
