# Azure Storage Lifecycle Management Module

This Terraform module configures intelligent Azure Blob Storage lifecycle management policies for the Flamoral dating platform to optimize storage costs.

## Features

- **Intelligent Tiering**: Automatically moves blobs between Hot, Cool, and Archive tiers based on access patterns
- **Automatic Cleanup**: Deletes temporary files and old snapshots
- **Cost Optimization**: Reduces storage costs by 35-45%
- **Customizable Policies**: All retention periods are configurable via variables

## Usage

```hcl
module "storage_lifecycle" {
  source = "./modules/storage"

  storage_account_id = azurerm_storage_account.main.id

  # Optional: Customize retention periods
  profile_photo_cool_days = 30
  album_photo_cool_days   = 30
  album_photo_archive_days = 90
  verification_archive_days = 14
  temp_file_delete_days   = 7

  tags = {
    Environment = "production"
    ManagedBy   = "Terraform"
    CostCenter  = "media-storage"
  }
}
```

## Lifecycle Rules

### 1. Profile Photos (Hot Tier)
- **Path**: `avatars/`, `photos/profile/`
- **Policy**: Move to Cool tier after 30 days
- **Rationale**: Profile photos are frequently accessed initially, less so over time
- **Savings**: 15-20%

### 2. Album Photos
- **Path**: `photos/albums/`, `photos/gallery/`
- **Policy**: Cool after 30 days, Archive after 90 days
- **Rationale**: Album photos have decreasing access patterns
- **Savings**: 30-40%

### 3. Verification Photos
- **Path**: `verification/`
- **Policy**: Cool after 7 days, Archive after 14 days
- **Rationale**: Only accessed during verification, rarely needed after approval
- **Savings**: 60-70%

### 4. Temporary Uploads
- **Path**: `temp/`, `uploads/temp/`, `processing/`
- **Policy**: Delete after 7 days
- **Rationale**: Temporary files should be cleaned up automatically
- **Savings**: 100%

### 5. Thumbnails
- **Path**: `thumbnails/`
- **Policy**: Cool after 60 days, Archive after 180 days
- **Rationale**: Can be regenerated if needed
- **Savings**: 25-35%

### 6. Videos
- **Path**: `videos/`
- **Policy**: Cool after 45 days, Archive after 120 days
- **Rationale**: Video content has high initial views, then decreases
- **Savings**: 40-50%

### 7. Inactive User Photos
- **Path**: `photos/inactive/`
- **Policy**: Archive after 30 days, Delete after 365 days
- **Rationale**: Inactive users' content should be archived and eventually removed
- **Savings**: 50-60%

### 8. Original Photos
- **Path**: `photos/original/`, `*/original/`
- **Policy**: Cool after 60 days, Archive after 180 days
- **Rationale**: Originals are only needed for regeneration
- **Savings**: 40-50%

### 9. Standard/HD Versions
- **Path**: `*/standard/`, `*/hd/`
- **Policy**: Cool after 45 days, Archive after 120 days
- **Rationale**: These versions have moderate access patterns
- **Savings**: 30-40%

### 10. Soft-Deleted Items
- **Policy**: Permanent delete after 14 days
- **Rationale**: Provides recovery window while freeing up storage
- **Savings**: Storage reclamation

## Storage Tier Comparison

| Tier    | Cost (relative) | Access Time | Best For |
|---------|----------------|-------------|----------|
| Hot     | 100%           | Instant     | Frequently accessed (profile photos) |
| Cool    | ~50%           | Instant     | Infrequently accessed (old albums) |
| Archive | ~10%           | Hours*      | Rarely accessed (verification, originals) |

*Archive tier requires rehydration before access (1-15 hours)

## Cost Savings Estimate

Assuming 1TB of storage:

| Category | Size | Before | After | Savings |
|----------|------|--------|-------|---------|
| Profile Photos | 200GB | $40/mo | $32/mo | 20% |
| Album Photos | 300GB | $60/mo | $36/mo | 40% |
| Verification | 50GB | $10/mo | $3/mo | 70% |
| Temp Files | 100GB | $20/mo | $0/mo | 100% |
| Thumbnails | 100GB | $20/mo | $13/mo | 35% |
| Videos | 200GB | $40/mo | $24/mo | 40% |
| Originals | 50GB | $10/mo | $5/mo | 50% |
| **Total** | **1TB** | **$200/mo** | **$113/mo** | **43.5%** |

## Variables

| Name | Description | Type | Default |
|------|-------------|------|---------|
| storage_account_id | Azure Storage Account ID | string | required |
| enable_lifecycle_management | Enable lifecycle policies | bool | true |
| profile_photo_cool_days | Days to Cool tier for profiles | number | 30 |
| album_photo_cool_days | Days to Cool tier for albums | number | 30 |
| album_photo_archive_days | Days to Archive tier for albums | number | 90 |
| verification_cool_days | Days to Cool tier for verification | number | 7 |
| verification_archive_days | Days to Archive tier for verification | number | 14 |
| temp_file_delete_days | Days before deleting temp files | number | 7 |
| soft_delete_retention_days | Soft delete retention period | number | 14 |
| thumbnail_cool_days | Days to Cool tier for thumbnails | number | 60 |
| thumbnail_archive_days | Days to Archive tier for thumbnails | number | 180 |
| video_cool_days | Days to Cool tier for videos | number | 45 |
| video_archive_days | Days to Archive tier for videos | number | 120 |
| inactive_user_archive_days | Days to archive inactive photos | number | 30 |
| inactive_user_delete_days | Days to delete inactive photos | number | 365 |
| original_photo_cool_days | Days to Cool tier for originals | number | 60 |
| original_photo_archive_days | Days to Archive tier for originals | number | 180 |
| tags | Resource tags | map(string) | {} |

## Outputs

| Name | Description |
|------|-------------|
| lifecycle_policy_id | The ID of the lifecycle policy |
| lifecycle_policy_name | The name of the lifecycle policy |
| rules_configured | Number of rules configured |
| estimated_cost_savings | Estimated cost savings percentage |
| policy_summary | Summary of all policies |

## Best Practices

1. **Monitor Access Patterns**: Review Azure Storage Analytics to verify tiering assumptions
2. **Adjust Thresholds**: Fine-tune days based on actual usage patterns
3. **Test in Staging**: Verify policies in non-production environment first
4. **Set Alerts**: Configure alerts for Archive tier access (indicates possible misconfiguration)
5. **Document Changes**: Update this README when modifying policies

## Deployment

1. Reference this module in your main Terraform configuration
2. Run `terraform plan` to preview changes
3. Run `terraform apply` to deploy lifecycle policies
4. Monitor Azure Portal for policy execution (runs daily)

## Monitoring

Monitor lifecycle policy effectiveness:

```bash
# Check storage metrics
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{account} \
  --metric BlobCapacity \
  --interval PT1H

# View lifecycle policy execution
az storage account management-policy show \
  --account-name {account} \
  --resource-group {rg}
```

## Troubleshooting

### Blobs Not Tiering
- Verify lifecycle policy is enabled
- Check blob last modified date
- Ensure prefix matches your blob paths
- Wait 24-48 hours (policies run daily)

### Unexpected Deletions
- Review soft delete settings
- Check deletion rules carefully
- Enable blob versioning for important data
- Set up alerts for deletion events

## References

- [Azure Blob Storage Lifecycle Management](https://docs.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- [Access Tiers Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [Cost Optimization Best Practices](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-storage-tiers)
