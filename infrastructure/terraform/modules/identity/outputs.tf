# ============================================================================
# FLAMORAL IDENTITY MODULE - OUTPUTS
# ============================================================================

# ============================================================================
# APP REGISTRATION OUTPUTS
# ============================================================================

output "web_app_client_id" {
  description = "FLAMORAL Web Application Client ID"
  value       = azuread_application.flamoral_web.application_id
}

output "web_app_object_id" {
  description = "FLAMORAL Web Application Object ID"
  value       = azuread_application.flamoral_web.object_id
}

output "api_app_client_id" {
  description = "FLAMORAL API Application Client ID"
  value       = azuread_application.flamoral_api.application_id
}

output "api_app_object_id" {
  description = "FLAMORAL API Application Object ID"
  value       = azuread_application.flamoral_api.object_id
}

output "api_app_identifier_uri" {
  description = "FLAMORAL API Application Identifier URI"
  value       = var.api_app_identifier
}

output "automation_app_client_id" {
  description = "FLAMORAL Automation Application Client ID (for Graph API)"
  value       = azuread_application.flamoral_automation.application_id
}

output "automation_app_object_id" {
  description = "FLAMORAL Automation Application Object ID"
  value       = azuread_application.flamoral_automation.object_id
}

output "automation_app_secret" {
  description = "FLAMORAL Automation Application Secret (store securely in Key Vault)"
  value       = azuread_application_password.flamoral_automation.value
  sensitive   = true
}

# ============================================================================
# SECURITY GROUP OUTPUTS
# ============================================================================

output "group_ids" {
  description = "Map of security group names to their Object IDs"
  value = {
    free      = var.create_security_groups ? azuread_group.flamoral_free[0].object_id : null
    premium   = var.create_security_groups ? azuread_group.flamoral_premium[0].object_id : null
    verified  = var.create_security_groups ? azuread_group.flamoral_verified[0].object_id : null
    moderator = var.create_security_groups ? azuread_group.flamoral_moderator[0].object_id : null
    admin     = var.create_security_groups ? azuread_group.flamoral_admin[0].object_id : null
    banned    = var.create_security_groups ? azuread_group.flamoral_banned[0].object_id : null
  }
}

output "group_names" {
  description = "Map of security group roles to their display names"
  value = {
    free      = var.create_security_groups ? azuread_group.flamoral_free[0].display_name : null
    premium   = var.create_security_groups ? azuread_group.flamoral_premium[0].display_name : null
    verified  = var.create_security_groups ? azuread_group.flamoral_verified[0].display_name : null
    moderator = var.create_security_groups ? azuread_group.flamoral_moderator[0].display_name : null
    admin     = var.create_security_groups ? azuread_group.flamoral_admin[0].display_name : null
    banned    = var.create_security_groups ? azuread_group.flamoral_banned[0].display_name : null
  }
}

# ============================================================================
# SCOPE IDs (for pre-authorized clients)
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
# ROLE IDs (for app role assignments)
# ============================================================================

output "role_ids" {
  description = "Application role IDs"
  value = {
    free      = random_uuid.role_free.result
    premium   = random_uuid.role_premium.result
    verified  = random_uuid.role_verified.result
    moderator = random_uuid.role_moderator.result
    admin     = random_uuid.role_admin.result
  }
}

# ============================================================================
# B2C CONFIGURATION OUTPUTS
# ============================================================================

output "b2c_issuer_url" {
  description = "B2C Token Issuer URL (for token validation)"
  value       = var.b2c_tenant_name != "" ? "https://${var.b2c_tenant_name}.b2clogin.com/${var.b2c_tenant_name}.onmicrosoft.com/v2.0/" : null
}

output "b2c_jwks_uri" {
  description = "B2C JWKS URI (for token signature verification)"
  value       = var.b2c_tenant_name != "" ? "https://${var.b2c_tenant_name}.b2clogin.com/${var.b2c_tenant_name}.onmicrosoft.com/discovery/v2.0/keys" : null
}
