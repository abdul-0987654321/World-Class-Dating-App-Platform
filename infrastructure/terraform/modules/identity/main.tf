# ============================================================================
# FLAMORAL IDENTITY MODULE
# Microsoft Entra ID B2C Configuration
# Group-Driven Authorization Model
# ============================================================================

terraform {
  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# ============================================================================
# RANDOM UUIDs FOR SCOPES AND ROLES
# ============================================================================

resource "random_uuid" "user_impersonation" {}
resource "random_uuid" "profile_read" {}
resource "random_uuid" "profile_write" {}
resource "random_uuid" "messages_send" {}
resource "random_uuid" "messages_read" {}
resource "random_uuid" "premium_access" {}
resource "random_uuid" "role_free" {}
resource "random_uuid" "role_premium" {}
resource "random_uuid" "role_verified" {}
resource "random_uuid" "role_moderator" {}
resource "random_uuid" "role_admin" {}

# ============================================================================
# APP REGISTRATION: FLAMORAL WEB (SPA/Mobile)
# Consumer-facing application
# ============================================================================

resource "azuread_application" "flamoral_web" {
  display_name     = "flamoral-web-${var.environment}"
  sign_in_audience = "AzureADandPersonalMicrosoftAccount"

  web {
    redirect_uris = var.web_app_redirect_uris

    implicit_grant {
      access_token_issuance_enabled = false
      id_token_issuance_enabled     = true
    }
  }

  single_page_application {
    redirect_uris = var.spa_redirect_uris
  }

  api {
    requested_access_token_version = 2
  }

  # Request access to FLAMORAL API
  required_resource_access {
    resource_app_id = azuread_application.flamoral_api.application_id

    resource_access {
      id   = random_uuid.user_impersonation.result
      type = "Scope"
    }

    resource_access {
      id   = random_uuid.profile_read.result
      type = "Scope"
    }

    resource_access {
      id   = random_uuid.messages_send.result
      type = "Scope"
    }
  }

  tags = [var.environment, "flamoral", "consumer-app", "web"]
}

resource "azuread_service_principal" "flamoral_web" {
  application_id = azuread_application.flamoral_web.application_id
}

# ============================================================================
# APP REGISTRATION: FLAMORAL API (Backend)
# Exposes scopes and roles for authorization
# ============================================================================

resource "azuread_application" "flamoral_api" {
  display_name     = "flamoral-api-${var.environment}"
  identifier_uris  = [var.api_app_identifier]
  sign_in_audience = "AzureADandPersonalMicrosoftAccount"

  api {
    requested_access_token_version = 2

    # User impersonation scope
    oauth2_permission_scope {
      admin_consent_description  = "Allow the application to access FLAMORAL API on behalf of the signed-in user"
      admin_consent_display_name = "Access FLAMORAL API"
      enabled                    = true
      id                         = random_uuid.user_impersonation.result
      type                       = "User"
      user_consent_description   = "Allow the application to access FLAMORAL on your behalf"
      user_consent_display_name  = "Access FLAMORAL"
      value                      = "user_impersonation"
    }

    # Profile read scope
    oauth2_permission_scope {
      admin_consent_description  = "Read user profile information"
      admin_consent_display_name = "Read Profile"
      enabled                    = true
      id                         = random_uuid.profile_read.result
      type                       = "User"
      user_consent_description   = "Read your profile information"
      user_consent_display_name  = "Read Profile"
      value                      = "profile.read"
    }

    # Profile write scope
    oauth2_permission_scope {
      admin_consent_description  = "Update user profile information"
      admin_consent_display_name = "Update Profile"
      enabled                    = true
      id                         = random_uuid.profile_write.result
      type                       = "User"
      user_consent_description   = "Update your profile information"
      user_consent_display_name  = "Update Profile"
      value                      = "profile.write"
    }

    # Messages send scope
    oauth2_permission_scope {
      admin_consent_description  = "Send messages to other users"
      admin_consent_display_name = "Send Messages"
      enabled                    = true
      id                         = random_uuid.messages_send.result
      type                       = "User"
      user_consent_description   = "Send messages to other users"
      user_consent_display_name  = "Send Messages"
      value                      = "messages.send"
    }

    # Messages read scope
    oauth2_permission_scope {
      admin_consent_description  = "Read your messages"
      admin_consent_display_name = "Read Messages"
      enabled                    = true
      id                         = random_uuid.messages_read.result
      type                       = "User"
      user_consent_description   = "Read your messages"
      user_consent_display_name  = "Read Messages"
      value                      = "messages.read"
    }

    # Premium access scope
    oauth2_permission_scope {
      admin_consent_description  = "Access premium features"
      admin_consent_display_name = "Premium Access"
      enabled                    = true
      id                         = random_uuid.premium_access.result
      type                       = "User"
      user_consent_description   = "Access premium features"
      user_consent_display_name  = "Premium Access"
      value                      = "premium.access"
    }
  }

  # App Roles for subscription tiers
  app_role {
    allowed_member_types = ["User"]
    description          = "Free tier user with basic access"
    display_name         = "Free User"
    enabled              = true
    id                   = random_uuid.role_free.result
    value                = "User.Free"
  }

  app_role {
    allowed_member_types = ["User"]
    description          = "Premium tier user with full consumer features"
    display_name         = "Premium User"
    enabled              = true
    id                   = random_uuid.role_premium.result
    value                = "User.Premium"
  }

  app_role {
    allowed_member_types = ["User"]
    description          = "Identity-verified user"
    display_name         = "Verified User"
    enabled              = true
    id                   = random_uuid.role_verified.result
    value                = "User.Verified"
  }

  app_role {
    allowed_member_types = ["User"]
    description          = "Content moderator (internal staff only)"
    display_name         = "Moderator"
    enabled              = true
    id                   = random_uuid.role_moderator.result
    value                = "Moderator"
  }

  app_role {
    allowed_member_types = ["User"]
    description          = "Platform administrator (internal staff only)"
    display_name         = "Administrator"
    enabled              = true
    id                   = random_uuid.role_admin.result
    value                = "Administrator"
  }

  # Group Claims Configuration
  group_membership_claims = ["SecurityGroup"]

  optional_claims {
    access_token {
      name                  = "groups"
      essential             = true
      additional_properties = ["emit_as_roles"]
    }

    id_token {
      name                  = "groups"
      essential             = true
      additional_properties = ["emit_as_roles"]
    }

    access_token {
      name      = "email"
      essential = true
    }

    id_token {
      name      = "email"
      essential = true
    }
  }

  tags = [var.environment, "flamoral", "api", "backend"]
}

resource "azuread_service_principal" "flamoral_api" {
  application_id = azuread_application.flamoral_api.application_id
}

# ============================================================================
# APP REGISTRATION: FLAMORAL AUTOMATION (Graph API Access)
# Daemon/service for group management automation
# ============================================================================

resource "azuread_application" "flamoral_automation" {
  display_name = "flamoral-automation-${var.environment}"

  required_resource_access {
    resource_app_id = "00000003-0000-0000-c000-000000000000" # Microsoft Graph

    # Application permissions (daemon/service - no user context)
    resource_access {
      id   = "df021288-bdef-4463-88db-98f22de89214" # User.Read.All
      type = "Role"
    }
    resource_access {
      id   = "62a82d76-70ea-41e2-9197-370581804d09" # Group.ReadWrite.All
      type = "Role"
    }
    resource_access {
      id   = "19dbc75e-c2e2-444c-a770-ec69d8559fc7" # Directory.ReadWrite.All
      type = "Role"
    }
    resource_access {
      id   = "246dd0d5-5bd0-4def-940b-0421030a5b68" # Policy.Read.All
      type = "Role"
    }
    resource_access {
      id   = "9e3f62cf-ca93-4989-b6ce-bf83c28f9fe8" # RoleManagement.ReadWrite.Directory
      type = "Role"
    }
  }

  tags = [var.environment, "flamoral", "automation", "internal-only", "daemon"]
}

resource "azuread_service_principal" "flamoral_automation" {
  application_id = azuread_application.flamoral_automation.application_id
}

resource "azuread_application_password" "flamoral_automation" {
  application_object_id = azuread_application.flamoral_automation.object_id
  display_name          = "automation-secret-${var.environment}"
  end_date_relative     = "8760h" # 1 year
}

# ============================================================================
# SECURITY GROUPS
# Group-Driven Authorization Model
# ============================================================================

# FREE TIER - Default group for all new signups
resource "azuread_group" "flamoral_free" {
  count                   = var.create_security_groups ? 1 : 0
  display_name            = "flamoral-free-${var.environment}"
  description             = "FLAMORAL Free tier users - basic matching, limited likes, standard messaging"
  security_enabled        = true
  prevent_duplicate_names = true

  lifecycle {
    ignore_changes = [members] # Members managed by automation
  }
}

# PREMIUM TIER - Paid subscription users
resource "azuread_group" "flamoral_premium" {
  count                   = var.create_security_groups ? 1 : 0
  display_name            = "flamoral-premium-${var.environment}"
  description             = "FLAMORAL Premium tier users - unlimited likes, see who liked you, priority matching, read receipts"
  security_enabled        = true
  prevent_duplicate_names = true

  lifecycle {
    ignore_changes = [members]
  }
}

# VERIFIED - Identity-verified users (additive, can combine with Free or Premium)
resource "azuread_group" "flamoral_verified" {
  count                   = var.create_security_groups ? 1 : 0
  display_name            = "flamoral-verified-${var.environment}"
  description             = "FLAMORAL Verified users - verified badge, higher trust score, verified-only features"
  security_enabled        = true
  prevent_duplicate_names = true

  lifecycle {
    ignore_changes = [members]
  }
}

# MODERATOR - Internal staff with content review access
resource "azuread_group" "flamoral_moderator" {
  count                   = var.create_security_groups ? 1 : 0
  display_name            = "flamoral-moderator-${var.environment}"
  description             = "FLAMORAL Content moderators (internal staff only) - review reports, issue warnings, temp suspensions"
  security_enabled        = true
  prevent_duplicate_names = true

  lifecycle {
    ignore_changes = [members]
  }
}

# ADMIN - Internal staff with full platform access
resource "azuread_group" "flamoral_admin" {
  count                   = var.create_security_groups ? 1 : 0
  display_name            = "flamoral-admin-${var.environment}"
  description             = "FLAMORAL Platform administrators (internal staff only) - full access, user management, system config"
  security_enabled        = true
  prevent_duplicate_names = true

  lifecycle {
    ignore_changes = [members]
  }
}

# BANNED - Users with revoked access
resource "azuread_group" "flamoral_banned" {
  count                   = var.create_security_groups ? 1 : 0
  display_name            = "flamoral-banned-${var.environment}"
  description             = "FLAMORAL Banned users - no API access, tokens rejected at validation"
  security_enabled        = true
  prevent_duplicate_names = true

  lifecycle {
    ignore_changes = [members]
  }
}
