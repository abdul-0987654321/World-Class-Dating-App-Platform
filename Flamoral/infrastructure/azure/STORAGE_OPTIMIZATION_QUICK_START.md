# Azure Storage Cost Optimization - Quick Start Guide

**Estimated Time:** 15-30 minutes
**Estimated Savings:** 35-45% on storage costs

---

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Terraform installed (optional, for CDN deployment)
- Access to Azure subscription with Contributor role
- Storage account already created

---

## Quick Deploy (Automated)

### Option 1: Bash (Linux/Mac/WSL)

```bash
cd infrastructure/scripts
chmod +x deploy-storage-optimization.sh
./deploy-storage-optimization.sh production
```

### Option 2: PowerShell (Windows)

```powershell
cd infrastructure\scripts
.\deploy-storage-optimization.ps1 -Environment production
```

---

## Manual Deploy (Step-by-Step)

### Step 1: Enable Storage Features (2 minutes)

```bash
# Set variables
RESOURCE_GROUP="flamoral-rg"
STORAGE_ACCOUNT="flamoralstorage"

# Enable last access time tracking
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --enable-last-access-tracking true

# Enable change feed
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --enable-change-feed true \
  --change-feed-retention-days 7

# Optimize soft delete retention (14 days instead of 30)
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --enable-delete-retention true \
  --delete-retention-days 14
```

### Step 2: Deploy Lifecycle Policies (3 minutes)

```bash
# Apply lifecycle policy
az storage account management-policy create \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --policy @infrastructure/azure/storage-lifecycle-policy.json

# Verify deployment
az storage account management-policy show \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP
```

### Step 3: Create Storage Containers (1 minute)

```bash
# Create required containers
for container in photos videos avatars thumbnails verification temp; do
  az storage container create \
    --name $container \
    --account-name $STORAGE_ACCOUNT \
    --auth-mode login
done
```

### Step 4: Enable CDN (Optional, 5 minutes)

```bash
# Using Terraform (recommended)
cd infrastructure/terraform
terraform apply -target=module.storage_blob.azurerm_cdn_endpoint.main

# Or using Azure CLI
az cdn profile create \
  --name flamoral-cdn \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_Microsoft

az cdn endpoint create \
  --name flamoral-cdn-endpoint \
  --profile-name flamoral-cdn \
  --resource-group $RESOURCE_GROUP \
  --origin $STORAGE_ACCOUNT.blob.core.windows.net
```

### Step 5: Update Application Config (5 minutes)

Update `backend/services/media-service/.env`:

```env
# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=flamoralstorage
AZURE_STORAGE_ACCOUNT_KEY=<your-key>
AZURE_CDN_URL=https://flamoral-cdn.azureedge.net

# Image Optimization
ENABLE_WEBP=true
ENABLE_LAZY_LOADING=true
IMAGE_QUALITY=85
```

Update application code to use storage optimization:

```typescript
// Import storage config
import storageConfig from './config/storage-optimization';

// Use when uploading blobs
const tier = storageConfig.getInitialTier(blobPath);
const cacheControl = storageConfig.getCacheControl(blobPath);

await blockBlobClient.upload(buffer, buffer.length, {
  tier: tier,
  blobHTTPHeaders: {
    blobCacheControl: cacheControl
  }
});
```

---

## Validation Checklist

After deployment, verify:

- [ ] Lifecycle policies are enabled (10 rules should be active)
- [ ] Last access time tracking is enabled
- [ ] Change feed is enabled (7 day retention)
- [ ] Soft delete retention is set to 14 days
- [ ] All containers created (photos, videos, avatars, thumbnails, verification, temp)
- [ ] CDN endpoint is created and enabled (optional)
- [ ] Application config updated with CDN URL

### Validation Commands

```bash
# Check lifecycle policy
az storage account management-policy show \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query "policy.rules[].{Name:name, Enabled:enabled}" \
  --output table

# Check blob service properties
az storage account blob-service-properties show \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP

# List containers
az storage container list \
  --account-name $STORAGE_ACCOUNT \
  --auth-mode login \
  --output table

# Check CDN (if deployed)
az cdn endpoint list \
  --profile-name flamoral-cdn \
  --resource-group $RESOURCE_GROUP \
  --output table
```

---

## Expected Results

### Immediate (Day 1)
- ✅ Lifecycle policies active
- ✅ Change feed capturing blob events
- ✅ Soft delete protecting against accidental deletion
- ✅ CDN reducing bandwidth costs (if enabled)

### Short-term (7-14 days)
- ✅ Temporary files being deleted automatically
- ✅ Verification photos moving to Cool/Archive tiers
- ✅ Soft-deleted items being purged
- ✅ CDN cache hit ratio improving (target: >80%)

### Medium-term (30-90 days)
- ✅ Profile photos moving to Cool tier (30+ days old)
- ✅ Album photos tiering to Cool (30 days) and Archive (90 days)
- ✅ Thumbnails archiving (60-180 days)
- ✅ Significant cost reduction visible in Azure Cost Management

### Cost Savings Timeline

| Timeframe | Expected Savings | Reason |
|-----------|------------------|--------|
| Week 1 | 10-15% | Temp file cleanup, CDN bandwidth savings |
| Week 2-4 | 20-30% | Verification photos archived, profile photos tiered |
| Month 2-3 | 35-45% | Full tiering strategy in effect, all policies active |

---

## Monitoring

### Daily (First Week)
- Check lifecycle policy execution in Azure Portal
- Monitor CDN cache hit ratio
- Verify temp files are being deleted

### Weekly (First Month)
- Review tier distribution (Hot/Cool/Archive)
- Check cost trends in Azure Cost Management
- Validate policies are working as expected

### Monthly (Ongoing)
- Review cost savings vs. baseline
- Adjust policies if needed based on access patterns
- Monitor for anomalies or unexpected behavior

### Key Metrics to Track

```bash
# Storage capacity by tier
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{account} \
  --metric BlobCapacity \
  --dimension AccessTier \
  --interval PT1H

# CDN cache hit ratio
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Cdn/profiles/{cdn}/endpoints/{endpoint} \
  --metric CacheHitRatio \
  --interval PT1H

# Storage costs
az consumption usage list \
  --start-date 2025-12-01 \
  --end-date 2025-12-31 \
  --query "[?contains(instanceName, 'storage')]"
```

---

## Troubleshooting

### Lifecycle policies not executing

**Problem:** Blobs not moving between tiers

**Solution:**
1. Wait 24-48 hours (policies run daily)
2. Verify blob last modified date is older than threshold
3. Check blob prefix matches policy filter
4. Ensure blob is `blockBlob` type

```bash
# Force policy execution (not recommended, wait for daily run)
# Policies execute automatically every 24 hours
```

### CDN cache hit ratio low (<50%)

**Problem:** High bandwidth costs due to poor caching

**Solution:**
1. Check cache-control headers are set correctly
2. Verify query string caching is set to "IgnoreQueryString"
3. Increase cache duration (7 days recommended)
4. Review CDN delivery rules order

```bash
# Check CDN configuration
az cdn endpoint show \
  --name flamoral-cdn-endpoint \
  --profile-name flamoral-cdn \
  --resource-group $RESOURCE_GROUP
```

### High storage costs despite policies

**Problem:** Cost savings not materializing

**Solution:**
1. Verify lifecycle policies are enabled
2. Check tier distribution (should be 30% Hot, 40% Cool, 30% Archive)
3. Ensure temp files are being cleaned up
4. Validate redundancy is LRS (not GRS)

```bash
# Check tier distribution
az storage blob list \
  --account-name $STORAGE_ACCOUNT \
  --container-name photos \
  --auth-mode login \
  --query "group_by(@, &properties.blobTier)"
```

---

## Rollback Plan

If you need to rollback the changes:

### 1. Restore Lifecycle Policy

```bash
# Restore from backup
BACKUP_FILE="infrastructure/backup/storage-YYYYMMDD-HHMMSS/lifecycle-policy-backup.json"

az storage account management-policy create \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --policy @$BACKUP_FILE
```

### 2. Revert Soft Delete Retention

```bash
# Restore to 30 days
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --enable-delete-retention true \
  --delete-retention-days 30
```

### 3. Disable Change Feed

```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --enable-change-feed false
```

---

## Support & Resources

### Documentation
- [Full Guide](../../STORAGE_COST_OPTIMIZATION.md)
- [Terraform Lifecycle Module](../terraform/modules/storage/README.md)
- [Storage Optimization Config](../../backend/services/media-service/src/config/storage-optimization.ts)

### Azure Documentation
- [Lifecycle Management](https://docs.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- [Access Tiers](https://docs.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [CDN Documentation](https://docs.microsoft.com/en-us/azure/cdn/)

### Commands Reference

```bash
# View all lifecycle policies
az storage account management-policy show --account-name <storage> --resource-group <rg>

# Check blob tier
az storage blob show --name <blob> --container-name <container> --account-name <storage> --query "properties.blobTier"

# View storage costs
az consumption usage list --start-date YYYY-MM-DD --end-date YYYY-MM-DD

# CDN cache purge
az cdn endpoint purge --name <endpoint> --profile-name <profile> --resource-group <rg> --content-paths '/*'
```

---

## Success Criteria

✅ **Deployment Successful** if:
- 10 lifecycle rules are active
- All 6 containers created
- Last access tracking enabled
- Change feed enabled
- Soft delete set to 14 days
- (Optional) CDN endpoint created and caching

✅ **Cost Optimization Successful** if (after 30 days):
- Storage costs reduced by 35-45%
- Tier distribution: ~30% Hot, ~40% Cool, ~30% Archive
- Temp files automatically cleaned up
- CDN cache hit ratio >80%
- No performance degradation for users

---

**Questions?** Refer to [STORAGE_COST_OPTIMIZATION.md](../../STORAGE_COST_OPTIMIZATION.md) for detailed information.
