# ============================================================================
# FLAMORAL IDENTITY MODULE - OUTPUTS
# ============================================================================
#
# This file exports all identity resources for use in other modules,
# CI/CD pipelines, and application configuration.
# ============================================================================

# ============================================================================
# APP REGISTRATION OUTPUTS - WEB APP
# ============================================================================

output "web_app_client_id" {
  description = "FLAMORAL Web Application Client ID (use in frontend config)"
  value       = azuread_application.web_app.client_id
}

output "web_app_object_id" {
  description = "FLAMORAL Web Application Object ID"
  value       = azuread_application.web_app.object_id
}

output "web_app_application_id" {
  description = "FLAMORAL Web Application ID (same as client_id, for compatibility)"
  value       = azuread_application.web_app.application_id
}

# ============================================================================
# APP REGISTRATION OUTPUTS - BACKEND API
# ============================================================================

output "backend_api_client_id" {
  description = "FLAMORAL Backend API Application Client ID"
  value       = azuread_application.backend_api.client_id
}

output "backend_api_object_id" {
  description = "FLAMORAL Backend API Application Object ID"
  value       = azuread_application.backend_api.object_id
}

output "backend_api_application_id" {
  description = "FLAMORAL Backend API Application ID"
  value       = azuread_application.backend_api.application_id
}

output "backend_api_identifier_uri" {
  description = "FLAMORAL Backend API Application Identifier URI"
  value       = var.api_app_identifier
}

output "backend_api_service_principal_id" {
  description = "FLAMORAL Backend API Service Principal Object ID"
  value       = azuread_service_principal.backend_api.object_id
}

# ============================================================================
# APP REGISTRATION OUTPUTS - AUTOMATION
# ============================================================================

output "automation_app_client_id" {
  description = "FLAMORAL Automation Application Client ID (for Graph API group-sync)"
  value       = azuread_application.automation.client_id
}

output "automation_app_object_id" {
  description = "FLAMORAL Automation Application Object ID"
  value       = azuread_application.automation.object_id
}

output "automation_app_secret" {
  description = "FLAMORAL Automation Application Secret (store securely in Key Vault)"
  value       = azuread_application_password.automation.value
  sensitive   = true
}

output "automation_app_secret_key_id" {
  description = "FLAMORAL Automation Application Secret Key ID"
  value       = azuread_application_password.automation.key_id
}

# ============================================================================
# SECURITY GROUP IDs - Individual Outputs
# ============================================================================

output "group_id_free" {
  description = "Object ID of the saas-free security group"
  value       = var.create_security_groups ? azuread_group.saas_free[0].object_id : null
}

output "group_id_standard" {
  description = "Object ID of the saas-standard security group"
  value       = var.create_security_groups ? azuread_group.saas_standard[0].object_id : null
}

output "group_id_premium" {
  description = "Object ID of the saas-premium security group"
  value       = var.create_security_groups ? azuread_group.saas_premium[0].object_id : null
}

output "group_id_verified" {
  description = "Object ID of the saas-verified security group"
  value       = var.create_security_groups ? azuread_group.saas_verified[0].object_id : null
}

output "group_id_moderator" {
  description = "Object ID of the saas-moderator security group"
  value       = var.create_security_groups ? azuread_group.saas_moderator[0].object_id : null
}

output "group_id_operator" {
  description = "Object ID of the saas-operator security group"
  value       = var.create_security_groups ? azuread_group.saas_operator[0].object_id : null
}

output "group_id_admin" {
  description = "Object ID of the saas-admin security group"
  value       = var.create_security_groups ? azuread_group.saas_admin[0].object_id : null
}

output "group_id_banned" {
  description = "Object ID of the banned security group"
  value       = var.create_security_groups ? azuread_group.banned[0].object_id : null
}

# ============================================================================
# SECURITY GROUP IDs - Map Output (for CI/CD pipelines)
# ============================================================================

output "group_ids" {
  description = "Map of security group names to their Object IDs (use in pipelines and backend config)"
  value = {
    free      = var.create_security_groups ? azuread_group.saas_free[0].object_id : null
    standard  = var.create_security_groups ? azuread_group.saas_standard[0].object_id : null
    premium   = var.create_security_groups ? azuread_group.saas_premium[0].object_id : null
    verified  = var.create_security_groups ? azuread_group.saas_verified[0].object_id : null
    moderator = var.create_security_groups ? azuread_group.saas_moderator[0].object_id : null
    operator  = var.create_security_groups ? azuread_group.saas_operator[0].object_id : null
    admin     = var.create_security_groups ? azuread_group.saas_admin[0].object_id : null
    banned    = var.create_security_groups ? azuread_group.banned[0].object_id : null
  }
}

# ============================================================================
# SECURITY GROUP NAMES - Map Output
# ============================================================================

output "group_names" {
  description = "Map of security group roles to their display names"
  value = {
    free      = var.create_security_groups ? azuread_group.saas_free[0].display_name : null
    standard  = var.create_security_groups ? azuread_group.saas_standard[0].display_name : null
    premium   = var.create_security_groups ? azuread_group.saas_premium[0].display_name : null
    verified  = var.create_security_groups ? azuread_group.saas_verified[0].display_name : null
    moderator = var.create_security_groups ? azuread_group.saas_moderator[0].display_name : null
    operator  = var.create_security_groups ? azuread_group.saas_operator[0].display_name : null
    admin     = var.create_security_groups ? azuread_group.saas_admin[0].display_name : null
    banned    = var.create_security_groups ? azuread_group.banned[0].display_name : null
  }
}

# ============================================================================
# SCOPE IDs (for pre-authorized clients and token validation)
# ============================================================================

output "scope_ids" {
  description = "OAuth2 permission scope IDs"
  value = {
    user_impersonation = random_uuid.user_impersonation.result
    profile_read       = random_uuid.profile_read.result
    profile_write      = random_uuid.profile_write.result
    messages_send      = random_uuid.messages_send.result
    messages_read      = random_uuid.messages_read.result
    premium_access     = random_uuid.premium_access.result
  }
}

# ============================================================================
# ROLE IDs (for app role assignments and token validation)
# ============================================================================

output "role_ids" {
  description = "Application role IDs"
  value = {
    free      = random_uuid.role_free.result
    standard  = random_uuid.role_standard.result
    premium   = random_uuid.role_premium.result
    verified  = random_uuid.role_verified.result
    moderator = random_uuid.role_moderator.result
    operator  = random_uuid.role_operator.result
    admin     = random_uuid.role_admin.result
  }
}

# ============================================================================
# B2C CONFIGURATION OUTPUTS
# ============================================================================

output "b2c_issuer_url" {
  description = "B2C Token Issuer URL (for token validation in backend)"
  value       = var.b2c_tenant_name != "" ? "https://${var.b2c_tenant_name}.b2clogin.com/${var.b2c_tenant_name}.onmicrosoft.com/v2.0/" : null
}

output "b2c_jwks_uri" {
  description = "B2C JWKS URI (for token signature verification)"
  value       = var.b2c_tenant_name != "" ? "https://${var.b2c_tenant_name}.b2clogin.com/${var.b2c_tenant_name}.onmicrosoft.com/discovery/v2.0/keys" : null
}

output "b2c_authority" {
  description = "B2C Authority URL (for MSAL configuration)"
  value       = var.b2c_tenant_name != "" ? "https://${var.b2c_tenant_name}.b2clogin.com/${var.b2c_tenant_name}.onmicrosoft.com" : null
}

# ============================================================================
# CI/CD PIPELINE OUTPUTS
# These outputs are formatted for easy consumption in GitHub Actions, Azure DevOps, etc.
# ============================================================================

output "cicd_config" {
  description = "Configuration values for CI/CD pipelines (as JSON)"
  value = jsonencode({
    web_app = {
      client_id = azuread_application.web_app.client_id
      object_id = azuread_application.web_app.object_id
    }
    backend_api = {
      client_id      = azuread_application.backend_api.client_id
      object_id      = azuread_application.backend_api.object_id
      identifier_uri = var.api_app_identifier
    }
    automation = {
      client_id = azuread_application.automation.client_id
      object_id = azuread_application.automation.object_id
    }
    groups = {
      free      = var.create_security_groups ? azuread_group.saas_free[0].object_id : null
      standard  = var.create_security_groups ? azuread_group.saas_standard[0].object_id : null
      premium   = var.create_security_groups ? azuread_group.saas_premium[0].object_id : null
      verified  = var.create_security_groups ? azuread_group.saas_verified[0].object_id : null
      moderator = var.create_security_groups ? azuread_group.saas_moderator[0].object_id : null
      operator  = var.create_security_groups ? azuread_group.saas_operator[0].object_id : null
      admin     = var.create_security_groups ? azuread_group.saas_admin[0].object_id : null
      banned    = var.create_security_groups ? azuread_group.banned[0].object_id : null
    }
    environment = var.environment
  })
}

# ============================================================================
# SUMMARY OUTPUT
# Human-readable summary for verification
# ============================================================================

output "identity_summary" {
  description = "Human-readable summary of created identity resources"
  value       = <<-EOT
    ============================================================================
    FLAMORAL Identity Module - ${upper(var.environment)} Environment
    ============================================================================

    App Registrations:
    - Web App:    ${azuread_application.web_app.display_name} (${azuread_application.web_app.client_id})
    - Backend API: ${azuread_application.backend_api.display_name} (${azuread_application.backend_api.client_id})
    - Automation:  ${azuread_application.automation.display_name} (${azuread_application.automation.client_id})

    Security Groups (${var.group_name_prefix}-* prefix):
    - Subscription Tiers: free, standard, premium
    - Additive Groups: verified
    - Staff Groups: moderator, operator, admin
    - Restriction: banned

    Group IDs are available in the 'group_ids' output for use in:
    - Backend service configuration
    - CI/CD pipeline variables
    - Group-sync automation
    ============================================================================
  EOT
}
