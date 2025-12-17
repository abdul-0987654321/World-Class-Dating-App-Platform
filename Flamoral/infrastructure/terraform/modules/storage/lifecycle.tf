# Azure Storage Lifecycle Management for Flamoral Dating Platform
# Cost-optimized tiering and retention policies

resource "azurerm_storage_management_policy" "lifecycle" {
  storage_account_id = var.storage_account_id

  # Profile Photos - Hot to Cool after 30 days (frequently accessed)
  rule {
    name    = "profilePhotosHotTier"
    enabled = true

    filters {
      prefix_match = ["avatars/", "photos/profile/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = 30
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 30
      }
    }
  }

  # Album Photos - Intelligent tiering for older photos
  rule {
    name    = "albumPhotosCoolTier"
    enabled = true

    filters {
      prefix_match = ["photos/albums/", "photos/gallery/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 60
      }
    }
  }

  # Verification Photos - Archive after approval (rarely accessed)
  rule {
    name    = "verificationPhotosArchive"
    enabled = true

    filters {
      prefix_match = ["verification/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 7
        tier_to_archive_after_days_since_modification_greater_than = 14
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 14
      }
    }
  }

  # Temporary Uploads - Delete after 7 days
  rule {
    name    = "temporaryUploadsCleanup"
    enabled = true

    filters {
      prefix_match = ["temp/", "uploads/temp/", "processing/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 7
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 1
      }
    }
  }

  # Soft-deleted items cleanup - Permanent delete after 14 days
  rule {
    name    = "softDeletedItemsCleanup"
    enabled = true

    filters {
      blob_types = ["blockBlob"]
    }

    actions {
      snapshot {
        delete_after_days_since_creation_greater_than = 14
      }
      version {
        delete_after_days_since_creation_greater_than = 14
      }
    }
  }

  # Thumbnails - Archive older thumbnails (frequently regenerated)
  rule {
    name    = "thumbnailsOptimization"
    enabled = true

    filters {
      prefix_match = ["thumbnails/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 60
        tier_to_archive_after_days_since_modification_greater_than = 180
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 30
      }
    }
  }

  # Videos - Optimize storage for video content
  rule {
    name    = "videosOptimization"
    enabled = true

    filters {
      prefix_match = ["videos/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 45
        tier_to_archive_after_days_since_modification_greater_than = 120
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 45
      }
    }
  }

  # Inactive User Photos - Archive and eventually delete
  rule {
    name    = "inactiveUserPhotosArchive"
    enabled = true

    filters {
      prefix_match = ["photos/inactive/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_archive_after_days_since_modification_greater_than = 30
        delete_after_days_since_modification_greater_than          = 365
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 30
      }
    }
  }

  # Original Photos - Archive originals (used for regeneration only)
  rule {
    name    = "originalPhotosArchive"
    enabled = true

    filters {
      prefix_match = ["photos/original/", "*/original/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 60
        tier_to_archive_after_days_since_modification_greater_than = 180
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 90
      }
    }
  }

  # Standard and HD versions - Optimize based on access patterns
  rule {
    name    = "standardHdPhotosOptimization"
    enabled = true

    filters {
      prefix_match = ["*/standard/", "*/hd/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 45
        tier_to_archive_after_days_since_modification_greater_than = 120
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 60
      }
    }
  }
}

# Outputs for reference
output "lifecycle_policy_id" {
  description = "ID of the storage lifecycle management policy"
  value       = azurerm_storage_management_policy.lifecycle.id
}

output "lifecycle_rules_count" {
  description = "Number of lifecycle rules configured"
  value       = 10
}
