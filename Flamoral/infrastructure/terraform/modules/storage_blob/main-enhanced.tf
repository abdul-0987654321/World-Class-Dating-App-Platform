# Azure Storage Account and CDN Module - Enhanced with Cost Optimization
# This is an enhanced version with intelligent tiering and CDN optimizations
# To use: Rename to main.tf after backing up the existing file

resource "azurerm_storage_account" "main" {
  name                     = "${var.prefix}${var.env}storage"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = var.account_tier
  account_replication_type = var.replication_type
  account_kind             = "StorageV2"
  access_tier              = "Hot"

  min_tls_version                 = "TLS1_2"
  enable_https_traffic_only       = true
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true

  # Enable infrastructure encryption for additional security
  infrastructure_encryption_enabled = true

  blob_properties {
    versioning_enabled = var.enable_versioning

    # Change feed for tracking blob changes (useful for analytics and compliance)
    change_feed_enabled           = true
    change_feed_retention_in_days = 7

    # Last access time tracking - enables better lifecycle management decisions
    last_access_time_enabled = true

    delete_retention_policy {
      days = var.soft_delete_retention_days
    }

    container_delete_retention_policy {
      days = var.soft_delete_retention_days
    }

    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "POST", "PUT", "OPTIONS"]
      allowed_origins    = var.cors_allowed_origins
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }

  network_rules {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    ip_rules                   = var.allowed_ip_addresses
    virtual_network_subnet_ids = var.allowed_subnet_ids
  }

  tags = merge(var.tags, {
    CostOptimization    = "enabled"
    LifecycleManagement = "enabled"
    CDNEnabled          = var.enable_cdn ? "true" : "false"
  })
}

# Storage Containers with metadata
resource "azurerm_storage_container" "photos" {
  name                  = "photos"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"

  metadata = {
    tier        = "Hot"
    description = "User photo albums and gallery images"
  }
}

resource "azurerm_storage_container" "videos" {
  name                  = "videos"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"

  metadata = {
    tier        = "Hot"
    description = "User video content with multiple quality variants"
  }
}

resource "azurerm_storage_container" "avatars" {
  name                  = "avatars"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"

  metadata = {
    tier        = "Hot"
    description = "Profile photos - frequently accessed"
  }
}

resource "azurerm_storage_container" "thumbnails" {
  name                  = "thumbnails"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"

  metadata = {
    tier        = "Hot-Cool"
    description = "Generated thumbnails - can be regenerated"
  }
}

resource "azurerm_storage_container" "verification" {
  name                  = "verification"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"

  metadata = {
    tier        = "Cool-Archive"
    description = "Identity verification photos - archive after approval"
  }
}

# New container for temporary uploads
resource "azurerm_storage_container" "temp" {
  name                  = "temp"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"

  metadata = {
    tier        = "Hot"
    description = "Temporary uploads - auto-deleted after 7 days"
  }
}

# Enhanced Blob Lifecycle Management - Use separate module for complex policies
# This provides basic policies; for advanced use the ../storage lifecycle module
resource "azurerm_storage_management_policy" "main" {
  storage_account_id = azurerm_storage_account.main.id

  # Verification photos - Archive quickly after approval
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

  # Profile photos - Move to Cool tier after 30 days
  rule {
    name    = "profilePhotosCoolTier"
    enabled = true

    filters {
      prefix_match = ["avatars/"]
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

  # Album photos - Intelligent tiering
  rule {
    name    = "albumPhotosIntelligentTier"
    enabled = true

    filters {
      prefix_match = ["photos/"]
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

  # Temporary files - Delete after 7 days
  rule {
    name    = "tempFilesCleanup"
    enabled = true

    filters {
      prefix_match = ["temp/"]
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

  # Videos - Cool after 45 days, Archive after 120 days
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

  # Thumbnails - Archive old thumbnails
  rule {
    name    = "thumbnailsArchive"
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

  # Soft-deleted items - Permanent delete after retention period
  rule {
    name    = "softDeletedCleanup"
    enabled = true

    filters {
      blob_types = ["blockBlob"]
    }

    actions {
      version {
        delete_after_days_since_creation_greater_than = var.soft_delete_retention_days
      }
    }
  }
}

# Enhanced CDN Profile
resource "azurerm_cdn_profile" "main" {
  count               = var.enable_cdn ? 1 : 0
  name                = "${var.prefix}-${var.env}-cdn"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.cdn_sku

  tags = merge(var.tags, {
    Purpose = "media-delivery"
    Service = "storage-cdn"
  })
}

# Enhanced CDN Endpoint with compression and caching rules
resource "azurerm_cdn_endpoint" "main" {
  count               = var.enable_cdn ? 1 : 0
  name                = "${var.prefix}-${var.env}-cdn-endpoint"
  profile_name        = azurerm_cdn_profile.main[0].name
  location            = var.location
  resource_group_name = var.resource_group_name
  origin_host_header  = azurerm_storage_account.main.primary_blob_host

  origin {
    name      = "storage"
    host_name = azurerm_storage_account.main.primary_blob_host
  }

  # Enforce HTTPS
  delivery_rule {
    name  = "EnforceHTTPS"
    order = 1

    request_scheme_condition {
      operator     = "Equal"
      match_values = ["HTTP"]
    }

    url_redirect_action {
      redirect_type = "Found"
      protocol      = "Https"
    }
  }

  # Cache images for 7 days
  delivery_rule {
    name  = "CacheImages"
    order = 2

    url_file_extension_condition {
      operator     = "Equal"
      match_values = ["jpg", "jpeg", "png", "gif", "webp"]
    }

    cache_expiration_action {
      behavior = "Override"
      duration = "7.00:00:00"
    }

    modify_response_header_action {
      action = "Append"
      name   = "Cache-Control"
      value  = "public, max-age=604800, immutable"
    }
  }

  # Cache videos for 7 days
  delivery_rule {
    name  = "CacheVideos"
    order = 3

    url_file_extension_condition {
      operator     = "Equal"
      match_values = ["mp4", "webm", "mov"]
    }

    cache_expiration_action {
      behavior = "Override"
      duration = "7.00:00:00"
    }

    modify_response_header_action {
      action = "Append"
      name   = "Cache-Control"
      value  = "public, max-age=604800"
    }
  }

  # Enable WebP content negotiation
  delivery_rule {
    name  = "WebPSupport"
    order = 4

    request_header_condition {
      operator     = "Contains"
      selector     = "Accept"
      match_values = ["image/webp"]
    }

    modify_response_header_action {
      action = "Append"
      name   = "Vary"
      value  = "Accept"
    }
  }

  is_http_allowed                   = false
  is_https_allowed                  = true
  querystring_caching_behaviour     = "IgnoreQueryString"
  is_compression_enabled            = true
  content_types_to_compress = [
    "application/json",
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4"
  ]

  tags = merge(var.tags, {
    CostSavings = "bandwidth-optimization"
  })
}

# Private Endpoint for Blob Storage
resource "azurerm_private_endpoint" "blob" {
  count               = var.enable_private_endpoint ? 1 : 0
  name                = "${var.prefix}-${var.env}-blob-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.prefix}-${var.env}-blob-psc"
    private_connection_resource_id = azurerm_storage_account.main.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  tags = var.tags
}

# Storage Analytics Logging (for access pattern analysis)
resource "azurerm_storage_account_blob_inventory_policy" "main" {
  count              = var.enable_analytics ? 1 : 0
  storage_account_id = azurerm_storage_account.main.id

  rules {
    name                   = "blob-inventory"
    storage_container_name = azurerm_storage_container.photos.name
    format                 = "Csv"
    schedule               = "Daily"
    scope                  = "Container"
    schema_fields = [
      "Name",
      "Content-Length",
      "Last-Modified",
      "AccessTier",
      "Content-Type",
      "AccessTierChangeTime"
    ]
  }
}
