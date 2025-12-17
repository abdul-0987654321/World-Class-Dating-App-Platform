#!/bin/bash
#
# Azure Storage Cost Optimization Deployment Script
# Flamoral Dating Platform
#
# This script deploys storage lifecycle policies, CDN configuration,
# and validates cost optimization settings.
#
# Usage: ./deploy-storage-optimization.sh [environment]
# Example: ./deploy-storage-optimization.sh production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Azure Storage Cost Optimization Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Validate prerequisites
echo -e "${YELLOW}[1/8] Validating prerequisites...${NC}"

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI not found. Please install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli${NC}"
    exit 1
fi

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: Terraform not found. Please install: https://www.terraform.io/downloads${NC}"
    exit 1
fi

# Check Azure login
if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged into Azure. Run: az login${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites validated${NC}"
echo ""

# Load environment variables
echo -e "${YELLOW}[2/8] Loading environment configuration...${NC}"

if [ -f "$ROOT_DIR/.env.$ENVIRONMENT" ]; then
    source "$ROOT_DIR/.env.$ENVIRONMENT"
    echo -e "${GREEN}✓ Loaded .env.$ENVIRONMENT${NC}"
else
    echo -e "${RED}Error: .env.$ENVIRONMENT not found${NC}"
    exit 1
fi

# Required variables
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-flamoral-rg}"
STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-flamoralstorage}"
LOCATION="${AZURE_LOCATION:-eastus}"

echo -e "${GREEN}✓ Resource Group: $RESOURCE_GROUP${NC}"
echo -e "${GREEN}✓ Storage Account: $STORAGE_ACCOUNT${NC}"
echo -e "${GREEN}✓ Location: $LOCATION${NC}"
echo ""

# Backup existing configuration
echo -e "${YELLOW}[3/8] Backing up existing configuration...${NC}"

BACKUP_DIR="$ROOT_DIR/infrastructure/backup/storage-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing lifecycle policy (if exists)
if az storage account management-policy show \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    &> /dev/null; then
    az storage account management-policy show \
        --account-name "$STORAGE_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        > "$BACKUP_DIR/lifecycle-policy-backup.json"
    echo -e "${GREEN}✓ Backed up existing lifecycle policy${NC}"
else
    echo -e "${YELLOW}⚠ No existing lifecycle policy to backup${NC}"
fi

echo ""

# Update storage account properties
echo -e "${YELLOW}[4/8] Updating storage account properties...${NC}"

# Enable last access time tracking
az storage account blob-service-properties update \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --enable-last-access-tracking true \
    --output none

echo -e "${GREEN}✓ Enabled last access time tracking${NC}"

# Enable change feed
az storage account blob-service-properties update \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --enable-change-feed true \
    --change-feed-retention-days 7 \
    --output none

echo -e "${GREEN}✓ Enabled change feed (7 day retention)${NC}"

# Update soft delete retention to 14 days (cost optimization)
az storage account blob-service-properties update \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --enable-delete-retention true \
    --delete-retention-days 14 \
    --output none

echo -e "${GREEN}✓ Updated soft delete retention (14 days)${NC}"

echo ""

# Deploy lifecycle policies
echo -e "${YELLOW}[5/8] Deploying lifecycle management policies...${NC}"

POLICY_FILE="$ROOT_DIR/infrastructure/azure/storage-lifecycle-policy.json"

if [ ! -f "$POLICY_FILE" ]; then
    echo -e "${RED}Error: Lifecycle policy file not found: $POLICY_FILE${NC}"
    exit 1
fi

# Apply lifecycle policy
az storage account management-policy create \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --policy @"$POLICY_FILE" \
    --output none

echo -e "${GREEN}✓ Deployed lifecycle management policies${NC}"

# Verify policy deployment
RULE_COUNT=$(az storage account management-policy show \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query 'policy.rules | length(@)' \
    --output tsv)

echo -e "${GREEN}✓ Deployed $RULE_COUNT lifecycle rules${NC}"
echo ""

# Deploy/Update CDN (if using Terraform)
echo -e "${YELLOW}[6/8] Checking CDN configuration...${NC}"

CDN_ENABLED=$(az storage account show \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "tags.CDNEnabled" \
    --output tsv 2>/dev/null || echo "false")

if [ "$CDN_ENABLED" == "true" ] || [ "$CDN_ENABLED" == "enabled" ]; then
    echo -e "${GREEN}✓ CDN is enabled${NC}"

    # Check CDN cache hit ratio (if endpoint exists)
    CDN_PROFILE=$(az cdn profile list \
        --resource-group "$RESOURCE_GROUP" \
        --query "[?contains(name, 'flamoral')].name | [0]" \
        --output tsv 2>/dev/null || echo "")

    if [ -n "$CDN_PROFILE" ]; then
        echo -e "${GREEN}✓ Found CDN profile: $CDN_PROFILE${NC}"
    else
        echo -e "${YELLOW}⚠ CDN profile not found. Deploy with Terraform:${NC}"
        echo -e "${YELLOW}  cd infrastructure/terraform && terraform apply -target=module.storage_blob.azurerm_cdn_endpoint.main${NC}"
    fi
else
    echo -e "${YELLOW}⚠ CDN not enabled. Recommended for bandwidth cost savings.${NC}"
    echo -e "${YELLOW}  Enable in Terraform: var.enable_cdn = true${NC}"
fi

echo ""

# Create required containers (if missing)
echo -e "${YELLOW}[7/8] Verifying storage containers...${NC}"

CONTAINERS=("photos" "videos" "avatars" "thumbnails" "verification" "temp")

for container in "${CONTAINERS[@]}"; do
    if ! az storage container exists \
        --name "$container" \
        --account-name "$STORAGE_ACCOUNT" \
        --auth-mode login \
        --query "exists" \
        --output tsv 2>/dev/null | grep -q "true"; then

        az storage container create \
            --name "$container" \
            --account-name "$STORAGE_ACCOUNT" \
            --auth-mode login \
            --output none

        echo -e "${GREEN}✓ Created container: $container${NC}"
    else
        echo -e "${GREEN}✓ Container exists: $container${NC}"
    fi
done

echo ""

# Validation & Reporting
echo -e "${YELLOW}[8/8] Validating deployment...${NC}"

# Check storage account properties
ACCOUNT_INFO=$(az storage account show \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "{tier:sku.tier, replication:sku.name, httpsOnly:enableHttpsTrafficOnly, minTls:minimumTlsVersion}" \
    --output json)

echo -e "${BLUE}Storage Account Configuration:${NC}"
echo "$ACCOUNT_INFO" | jq '.'

# Check lifecycle policy summary
echo ""
echo -e "${BLUE}Lifecycle Policy Summary:${NC}"
az storage account management-policy show \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "policy.rules[].{Name:name, Enabled:enabled}" \
    --output table

# Estimate cost savings
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ Storage lifecycle policies deployed${NC}"
echo -e "${GREEN}✓ Last access time tracking enabled${NC}"
echo -e "${GREEN}✓ Change feed enabled${NC}"
echo -e "${GREEN}✓ Soft delete retention optimized (14 days)${NC}"
echo -e "${GREEN}✓ Storage containers verified${NC}"
echo ""
echo -e "${YELLOW}Expected Cost Savings:${NC}"
echo -e "  • Storage tiering: 35-45% reduction"
echo -e "  • CDN bandwidth: 40-50% reduction (if enabled)"
echo -e "  • LRS redundancy: 50% reduction vs GRS (if changed)"
echo -e "  • Temp file cleanup: 100% savings on temp storage"
echo -e "  • Overall estimate: 35-45% total cost reduction"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Monitor tier distribution over next 30 days"
echo -e "  2. Validate lifecycle policies execute daily (check Azure Portal)"
echo -e "  3. Review cost savings in Azure Cost Management"
echo -e "  4. Enable CDN if not already enabled (recommended)"
echo -e "  5. Update media-service with storage optimization config"
echo ""
echo -e "${BLUE}Documentation: $ROOT_DIR/STORAGE_COST_OPTIMIZATION.md${NC}"
echo -e "${BLUE}Backup location: $BACKUP_DIR${NC}"
echo ""

# Generate deployment report
REPORT_FILE="$ROOT_DIR/infrastructure/reports/storage-optimization-$(date +%Y%m%d-%H%M%S).json"
mkdir -p "$(dirname "$REPORT_FILE")"

cat > "$REPORT_FILE" <<EOF
{
  "deployment": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "environment": "$ENVIRONMENT",
    "resourceGroup": "$RESOURCE_GROUP",
    "storageAccount": "$STORAGE_ACCOUNT"
  },
  "features": {
    "lifecyclePolicies": true,
    "lastAccessTracking": true,
    "changeFeed": true,
    "softDeleteDays": 14,
    "cdnEnabled": "$CDN_ENABLED"
  },
  "policies": {
    "ruleCount": $RULE_COUNT,
    "containers": $(printf '%s\n' "${CONTAINERS[@]}" | jq -R . | jq -s .)
  },
  "estimatedSavings": {
    "storageOptimization": "35-45%",
    "bandwidthCDN": "40-50%",
    "redundancyLRS": "50%",
    "overallEstimate": "35-45%"
  }
}
EOF

echo -e "${GREEN}✓ Deployment report saved: $REPORT_FILE${NC}"
echo ""
echo -e "${GREEN}Deployment successful! 🎉${NC}"
