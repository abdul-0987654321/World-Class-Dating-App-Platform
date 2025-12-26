#!/bin/bash
# ============================================================================
# FLAMORAL - Azure AD Group Provisioning Script
# Provisions Azure AD security groups for the FLAMORAL SAAS platform
# ============================================================================
#
# Prerequisites:
#   - Azure CLI installed and configured
#   - Logged in with: az login
#   - Required permissions: Group.Create, Group.ReadWrite.All
#
# Usage:
#   ./provision-ad-groups.sh [--dry-run]
#
# Options:
#   --dry-run    Show what would be created without making changes
#
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}[DRY RUN] No changes will be made${NC}"
    echo ""
fi

# ============================================================================
# GROUP DEFINITIONS
# Format: "name:description:mail_nickname"
# ============================================================================

GROUPS=(
    "saas-free:Free tier users - Basic FLAMORAL access:saas-free"
    "saas-standard:Standard subscription users - Enhanced features:saas-standard"
    "saas-premium:Premium subscription users - Full feature access:saas-premium"
    "saas-verified:Identity verified users - Completed verification:saas-verified"
    "saas-moderator:Content moderators - Review and moderate content:saas-moderator"
    "saas-operator:Operations staff - System monitoring and management:saas-operator"
    "saas-admin:Platform administrators - Full administrative access:saas-admin"
    "banned:Banned users - Account suspended:banned"
)

# ============================================================================
# FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it first."
        log_info "Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi

    # Check if logged in
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi

    # Get and display current account info
    ACCOUNT=$(az account show --query "{name:name, tenantId:tenantId}" -o tsv)
    TENANT_ID=$(az account show --query "tenantId" -o tsv)

    log_success "Logged in to Azure"
    log_info "Tenant ID: $TENANT_ID"

    # Verify permissions by checking if we can list groups
    if ! az ad group list --top 1 &> /dev/null; then
        log_error "Insufficient permissions to manage groups."
        log_info "Required permissions: Group.Create, Group.ReadWrite.All"
        exit 1
    fi

    log_success "Permissions verified"
    echo ""
}

check_group_exists() {
    local name="$1"
    local existing=$(az ad group list --display-name "$name" --query "[0].id" -o tsv 2>/dev/null)
    echo "$existing"
}

create_group() {
    local name="$1"
    local description="$2"
    local mail_nickname="$3"

    # Check if group already exists
    local existing_id=$(check_group_exists "$name")

    if [[ -n "$existing_id" ]]; then
        log_warning "Group '$name' already exists with ID: $existing_id"
        echo "$existing_id"
        return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create group: $name"
        echo "dry-run-id-$(date +%s)"
        return 0
    fi

    log_info "Creating group: $name"

    # Create the security group
    local group_id=$(az ad group create \
        --display-name "$name" \
        --mail-nickname "$mail_nickname" \
        --description "$description" \
        --security-enabled true \
        --query "id" -o tsv 2>&1)

    if [[ $? -eq 0 && -n "$group_id" ]]; then
        log_success "Created group '$name' with ID: $group_id"
        echo "$group_id"
        return 0
    else
        log_error "Failed to create group '$name': $group_id"
        return 1
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

echo "=============================================="
echo "  FLAMORAL Azure AD Group Provisioning"
echo "=============================================="
echo ""

check_prerequisites

# Arrays to store results
declare -A GROUP_IDS
CREATED_COUNT=0
EXISTING_COUNT=0
FAILED_COUNT=0

log_info "Provisioning ${#GROUPS[@]} groups..."
echo ""

for group_def in "${GROUPS[@]}"; do
    # Parse group definition
    IFS=':' read -r name description mail_nickname <<< "$group_def"

    echo "----------------------------------------"
    log_info "Processing: $name"
    log_info "Description: $description"

    group_id=$(create_group "$name" "$description" "$mail_nickname")

    if [[ -n "$group_id" ]]; then
        GROUP_IDS["$name"]="$group_id"

        if [[ "$group_id" == "dry-run-id-"* ]]; then
            ((CREATED_COUNT++))
        elif [[ $(check_group_exists "$name") == "$group_id" ]]; then
            # Group existed before
            existing_before=$(az ad group list --display-name "$name" --query "[0].id" -o tsv 2>/dev/null)
            if [[ "$existing_before" == "$group_id" ]]; then
                ((EXISTING_COUNT++))
            else
                ((CREATED_COUNT++))
            fi
        fi
    else
        ((FAILED_COUNT++))
    fi

    echo ""
done

# ============================================================================
# OUTPUT SUMMARY
# ============================================================================

echo "=============================================="
echo "  Provisioning Summary"
echo "=============================================="
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    log_info "DRY RUN - No actual changes were made"
    echo ""
fi

echo -e "Created:  ${GREEN}$CREATED_COUNT${NC}"
echo -e "Existing: ${YELLOW}$EXISTING_COUNT${NC}"
echo -e "Failed:   ${RED}$FAILED_COUNT${NC}"
echo ""

# ============================================================================
# ENVIRONMENT VARIABLES OUTPUT
# ============================================================================

echo "=============================================="
echo "  Environment Variables"
echo "=============================================="
echo ""
echo "Add these to your .env file or GitHub Secrets:"
echo ""

for name in "saas-free" "saas-standard" "saas-premium" "saas-verified" "saas-moderator" "saas-operator" "saas-admin" "banned"; do
    env_name="GROUP_ID_${name^^}"
    env_name="${env_name//-/_}"

    if [[ -n "${GROUP_IDS[$name]}" ]]; then
        echo "${env_name}=${GROUP_IDS[$name]}"
    else
        echo "${env_name}="
    fi
done

echo ""

# ============================================================================
# GITHUB SECRETS INSTRUCTIONS
# ============================================================================

echo "=============================================="
echo "  GitHub Secrets"
echo "=============================================="
echo ""
echo "Add these secrets to your GitHub repository:"
echo "Settings -> Secrets and variables -> Actions -> New repository secret"
echo ""

for name in "saas-free" "saas-standard" "saas-premium" "saas-verified" "saas-moderator" "saas-operator" "saas-admin" "banned"; do
    env_name="GROUP_ID_${name^^}"
    env_name="${env_name//-/_}"

    if [[ -n "${GROUP_IDS[$name]}" ]]; then
        echo "  $env_name = ${GROUP_IDS[$name]}"
    fi
done

echo ""

# ============================================================================
# VERIFICATION INSTRUCTIONS
# ============================================================================

echo "=============================================="
echo "  Next Steps"
echo "=============================================="
echo ""
echo "1. Copy the environment variables above to your .env files"
echo "2. Add the secrets to GitHub repository settings"
echo "3. Update Azure Key Vault with the group IDs (production)"
echo "4. Verify groups in Azure Portal:"
echo "   https://portal.azure.com/#view/Microsoft_AAD_IAM/GroupsManagementMenuBlade"
echo ""

if [[ $FAILED_COUNT -gt 0 ]]; then
    log_error "Some groups failed to create. Check the errors above."
    exit 1
fi

log_success "Provisioning complete!"
exit 0
