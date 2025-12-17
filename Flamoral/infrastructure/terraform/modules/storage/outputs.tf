# Outputs for Storage Lifecycle Management Module

output "lifecycle_policy_id" {
  description = "The ID of the storage lifecycle management policy"
  value       = azurerm_storage_management_policy.lifecycle.id
}

output "lifecycle_policy_name" {
  description = "The name of the storage lifecycle management policy"
  value       = "flamoral-lifecycle-policy"
}

output "rules_configured" {
  description = "Number of lifecycle rules configured"
  value       = 10
}

output "estimated_cost_savings" {
  description = "Estimated cost savings percentage from lifecycle policies"
  value       = "35-45%"
}

output "policy_summary" {
  description = "Summary of lifecycle policy configuration"
  value = {
    profile_photos       = "Hot tier, Cool after 30 days"
    album_photos         = "Cool after 30 days, Archive after 90 days"
    verification_photos  = "Cool after 7 days, Archive after 14 days"
    temporary_files      = "Delete after 7 days"
    thumbnails           = "Cool after 60 days, Archive after 180 days"
    videos               = "Cool after 45 days, Archive after 120 days"
    inactive_user_photos = "Archive after 30 days, Delete after 365 days"
    original_photos      = "Cool after 60 days, Archive after 180 days"
    soft_deleted_items   = "Permanent delete after 14 days"
  }
}
