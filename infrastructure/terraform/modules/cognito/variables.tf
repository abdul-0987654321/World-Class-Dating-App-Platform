################################################################################
# Cognito Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

################################################################################
# User Pool Configuration
################################################################################

variable "username_attributes" {
  description = "Attributes that can be used as username"
  type        = list(string)
  default     = ["email"]
}

variable "auto_verified_attributes" {
  description = "Attributes to be automatically verified"
  type        = list(string)
  default     = ["email"]
}

variable "username_case_sensitive" {
  description = "Whether username is case sensitive"
  type        = bool
  default     = false
}

################################################################################
# Password Policy
################################################################################

variable "password_minimum_length" {
  description = "Minimum password length"
  type        = number
  default     = 12
}

variable "password_require_lowercase" {
  description = "Require lowercase characters"
  type        = bool
  default     = true
}

variable "password_require_numbers" {
  description = "Require numbers"
  type        = bool
  default     = true
}

variable "password_require_symbols" {
  description = "Require symbols"
  type        = bool
  default     = true
}

variable "password_require_uppercase" {
  description = "Require uppercase characters"
  type        = bool
  default     = true
}

variable "temporary_password_validity_days" {
  description = "Number of days a temporary password is valid"
  type        = number
  default     = 7
}

################################################################################
# MFA Configuration
################################################################################

variable "mfa_configuration" {
  description = "MFA configuration: OFF, ON, or OPTIONAL"
  type        = string
  default     = "OPTIONAL"

  validation {
    condition     = contains(["OFF", "ON", "OPTIONAL"], var.mfa_configuration)
    error_message = "mfa_configuration must be OFF, ON, or OPTIONAL"
  }
}

variable "sms_authentication_enabled" {
  description = "Enable SMS-based MFA"
  type        = bool
  default     = false
}

################################################################################
# Email Configuration
################################################################################

variable "email_sending_account" {
  description = "Email sending account: COGNITO_DEFAULT or DEVELOPER"
  type        = string
  default     = "COGNITO_DEFAULT"
}

variable "from_email_address" {
  description = "Email address to send from"
  type        = string
  default     = null
}

variable "reply_to_email_address" {
  description = "Reply-to email address"
  type        = string
  default     = null
}

variable "ses_email_identity_arn" {
  description = "ARN of SES email identity"
  type        = string
  default     = null
}

################################################################################
# Verification Messages
################################################################################

variable "default_email_option" {
  description = "Default email option: CONFIRM_WITH_CODE or CONFIRM_WITH_LINK"
  type        = string
  default     = "CONFIRM_WITH_CODE"
}

variable "email_verification_message" {
  description = "Email verification message"
  type        = string
  default     = "Your verification code is {####}"
}

variable "email_verification_message_by_link" {
  description = "Email verification message by link"
  type        = string
  default     = "Please click the link below to verify your email address. {##Verify Email##}"
}

variable "email_verification_subject" {
  description = "Email verification subject"
  type        = string
  default     = "Your verification code"
}

variable "email_verification_subject_by_link" {
  description = "Email verification subject by link"
  type        = string
  default     = "Verify your email"
}

variable "sms_verification_message" {
  description = "SMS verification message"
  type        = string
  default     = "Your verification code is {####}"
}

################################################################################
# Admin Create User Configuration
################################################################################

variable "allow_admin_create_user_only" {
  description = "Only allow admin to create users"
  type        = bool
  default     = false
}

variable "invite_email_message" {
  description = "Invite email message"
  type        = string
  default     = "Your username is {username} and temporary password is {####}"
}

variable "invite_email_subject" {
  description = "Invite email subject"
  type        = string
  default     = "Your temporary password"
}

variable "invite_sms_message" {
  description = "Invite SMS message"
  type        = string
  default     = "Your username is {username} and temporary password is {####}"
}

################################################################################
# Device Configuration
################################################################################

variable "challenge_required_on_new_device" {
  description = "Require challenge on new device"
  type        = bool
  default     = true
}

variable "device_only_remembered_on_user_prompt" {
  description = "Only remember device on user prompt"
  type        = bool
  default     = true
}

################################################################################
# User Attribute Update Settings
################################################################################

variable "attributes_require_verification_before_update" {
  description = "Attributes that require verification before update"
  type        = list(string)
  default     = ["email"]
}

################################################################################
# Schema Attributes
################################################################################

variable "schema_attributes" {
  description = "Custom schema attributes"
  type = list(object({
    name                     = string
    attribute_data_type      = string
    developer_only_attribute = optional(bool, false)
    mutable                  = optional(bool, true)
    required                 = optional(bool, false)
    min_length               = optional(number, 0)
    max_length               = optional(number, 2048)
    min_value                = optional(string, null)
    max_value                = optional(string, null)
  }))
  default = []
}

################################################################################
# Lambda Triggers
################################################################################

variable "lambda_triggers" {
  description = "Map of Lambda trigger ARNs"
  type        = map(string)
  default     = {}
}

################################################################################
# Domain Configuration
################################################################################

variable "custom_domain" {
  description = "Custom domain for the user pool"
  type        = string
  default     = null
}

variable "custom_domain_certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  type        = string
  default     = null
}

################################################################################
# User Pool Clients
################################################################################

variable "user_pool_clients" {
  description = "Map of user pool client configurations"
  type = map(object({
    generate_secret     = optional(bool, false)
    explicit_auth_flows = optional(list(string), ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"])

    supported_identity_providers = optional(list(string), ["COGNITO"])

    callback_urls                        = optional(list(string), [])
    logout_urls                          = optional(list(string), [])
    default_redirect_uri                 = optional(string, null)
    allowed_oauth_flows                  = optional(list(string), ["code"])
    allowed_oauth_flows_user_pool_client = optional(bool, true)
    allowed_oauth_scopes                 = optional(list(string), ["email", "openid", "profile"])

    read_attributes  = optional(list(string), null)
    write_attributes = optional(list(string), null)

    access_token_validity  = optional(number, 1)
    id_token_validity      = optional(number, 1)
    refresh_token_validity = optional(number, 30)

    access_token_validity_units  = optional(string, "hours")
    id_token_validity_units      = optional(string, "hours")
    refresh_token_validity_units = optional(string, "days")

    prevent_user_existence_errors = optional(string, "ENABLED")
    enable_token_revocation       = optional(bool, true)

    enable_propagate_additional_user_context_data = optional(bool, false)
  }))
  default = {
    web = {
      generate_secret = false
    }
  }
}

################################################################################
# Resource Servers
################################################################################

variable "resource_servers" {
  description = "Map of resource server configurations"
  type = map(object({
    identifier = string
    scopes = list(object({
      scope_name        = string
      scope_description = string
    }))
  }))
  default = {}
}

################################################################################
# User Groups
################################################################################

variable "user_groups" {
  description = "Map of user group configurations"
  type = map(object({
    description = optional(string, null)
    precedence  = optional(number, null)
    role_arn    = optional(string, null)
  }))
  default = {}
}

################################################################################
# Identity Pool Configuration
################################################################################

variable "create_identity_pool" {
  description = "Create an identity pool"
  type        = bool
  default     = true
}

variable "allow_unauthenticated_identities" {
  description = "Allow unauthenticated identities"
  type        = bool
  default     = false
}

variable "allow_classic_flow" {
  description = "Allow classic flow"
  type        = bool
  default     = false
}

variable "identity_pool_provider_client" {
  description = "User pool client to use for identity pool"
  type        = string
  default     = "web"
}

variable "server_side_token_check" {
  description = "Enable server-side token check"
  type        = bool
  default     = false
}

variable "additional_identity_providers" {
  description = "Additional identity providers"
  type = list(object({
    client_id               = string
    provider_name           = string
    server_side_token_check = optional(bool, false)
  }))
  default = []
}

variable "supported_login_providers" {
  description = "Supported login providers (social providers)"
  type        = map(string)
  default     = {}
}

variable "identity_pool_role_mappings" {
  description = "Identity pool role mappings"
  type = list(object({
    identity_provider         = string
    ambiguous_role_resolution = string
    type                      = string
    mapping_rules = optional(list(object({
      claim      = string
      match_type = string
      role_arn   = string
      value      = string
    })), [])
  }))
  default = []
}

variable "authenticated_role_policy" {
  description = "Custom IAM policy for authenticated role"
  type        = string
  default     = null
}

variable "unauthenticated_role_policy" {
  description = "Custom IAM policy for unauthenticated role"
  type        = string
  default     = null
}

################################################################################
# Protection
################################################################################

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = string
  default     = "ACTIVE"

  validation {
    condition     = contains(["ACTIVE", "INACTIVE"], var.deletion_protection)
    error_message = "deletion_protection must be ACTIVE or INACTIVE"
  }
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
