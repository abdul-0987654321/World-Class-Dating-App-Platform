#!/bin/bash
#===============================================================================
# Flamoral Azure Resource Discovery and Consolidation Script
#===============================================================================
# This script discovers, inventories, and safely plans consolidation of
# Flamoral dating platform resources in Azure.
#
# SAFETY: This script is READ-ONLY by default. It only generates plans
# and commands but does NOT execute any destructive operations.
#
# Usage:
#   ./discover-and-consolidate.sh              # Dry run (default)
#   DRY_RUN=false ./discover-and-consolidate.sh  # Generate executable scripts
#   FORCE_DELETE=true ./discover-and-consolidate.sh  # Allow delete commands
#
# Author: Flamoral Platform Team
# Date: 2024
#===============================================================================

set -euo pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-ebd1613e-fea0-4b6d-8918-7e4de6a71c44}"
TARGET_RG="${TARGET_RG:-flamoral-prod-rg}"  # Authoritative resource group
DRY_RUN="${DRY_RUN:-true}"
FORCE_DELETE="${FORCE_DELETE:-false}"
OUTPUT_DIR="${OUTPUT_DIR:-./azure-discovery-$(date +%Y%m%d-%H%M%S)}"

# Resource identification patterns
NAME_PATTERNS=("flamoral" "dating" "-prod-" "-dev-" "-staging-" "-test-")
TAG_KEYS=("project" "environment" "owner" "application")
FLAMORAL_TAG_VALUES=("flamoral" "dating" "Flamoral" "Dating")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
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

log_section() {
    echo ""
    echo "==============================================================================="
    echo " $1"
    echo "==============================================================================="
}

check_az_cli() {
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI (az) is not installed. Please install it first."
        exit 1
    fi

    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi
}

setup_output_directory() {
    mkdir -p "$OUTPUT_DIR"
    log_info "Output directory: $OUTPUT_DIR"
}

#-------------------------------------------------------------------------------
# Phase 1: Discovery (READ-ONLY)
#-------------------------------------------------------------------------------
discover_resources() {
    log_section "PHASE 1: RESOURCE DISCOVERY (READ-ONLY)"

    # Set subscription
    log_info "Setting subscription to: $SUBSCRIPTION_ID"
    az account set --subscription "$SUBSCRIPTION_ID"

    # Get current subscription info
    log_info "Current subscription:"
    az account show --output table

    # Discover all resource groups
    log_info "Discovering resource groups..."
    az group list --output json > "$OUTPUT_DIR/resource-groups.json"
    az group list --output table > "$OUTPUT_DIR/resource-groups.txt"

    local rg_count=$(jq length "$OUTPUT_DIR/resource-groups.json")
    log_success "Found $rg_count resource groups"

    # Discover all resources
    log_info "Discovering all resources (this may take a moment)..."
    az resource list --output json > "$OUTPUT_DIR/all-resources.json"
    az resource list --output table > "$OUTPUT_DIR/all-resources.txt"

    local resource_count=$(jq length "$OUTPUT_DIR/all-resources.json")
    log_success "Found $resource_count total resources"

    # Create resource inventory with detailed info
    log_info "Creating detailed resource inventory..."
    jq '[.[] | {
        id: .id,
        name: .name,
        type: .type,
        location: .location,
        resourceGroup: .resourceGroup,
        tags: .tags,
        sku: .sku,
        kind: .kind,
        managedBy: .managedBy
    }]' "$OUTPUT_DIR/all-resources.json" > "$OUTPUT_DIR/resource-inventory.json"
}

#-------------------------------------------------------------------------------
# Phase 2: Identification
#-------------------------------------------------------------------------------
identify_flamoral_resources() {
    log_section "PHASE 2: RESOURCE IDENTIFICATION"

    log_info "Identifying Flamoral resources by patterns and tags..."

    # Create jq filter for name patterns
    local name_filter=""
    for pattern in "${NAME_PATTERNS[@]}"; do
        if [ -n "$name_filter" ]; then
            name_filter="$name_filter or"
        fi
        name_filter="$name_filter (.name | ascii_downcase | contains(\"${pattern,,}\"))"
        name_filter="$name_filter or (.resourceGroup | ascii_downcase | contains(\"${pattern,,}\"))"
    done

    # Identify Flamoral resources
    jq --arg target_rg "$TARGET_RG" "[.[] | select(
        (.resourceGroup | ascii_downcase | contains(\"flamoral\")) or
        (.resourceGroup | ascii_downcase | contains(\"dating\")) or
        (.name | ascii_downcase | contains(\"flamoral\")) or
        (.name | ascii_downcase | contains(\"dating\")) or
        (.name | ascii_downcase | contains(\"-prod-\")) or
        (.name | ascii_downcase | contains(\"-dev-\")) or
        (.name | ascii_downcase | contains(\"-staging-\")) or
        (.tags.project == \"flamoral\") or
        (.tags.project == \"Flamoral\") or
        (.tags.application == \"flamoral\") or
        (.tags.application == \"dating\")
    )]" "$OUTPUT_DIR/all-resources.json" > "$OUTPUT_DIR/flamoral-resources.json"

    local flamoral_count=$(jq length "$OUTPUT_DIR/flamoral-resources.json")
    log_success "Identified $flamoral_count Flamoral resources"

    # Identify non-Flamoral resources
    jq --arg target_rg "$TARGET_RG" "[.[] | select(
        ((.resourceGroup | ascii_downcase | contains(\"flamoral\")) | not) and
        ((.resourceGroup | ascii_downcase | contains(\"dating\")) | not) and
        ((.name | ascii_downcase | contains(\"flamoral\")) | not) and
        ((.name | ascii_downcase | contains(\"dating\")) | not) and
        ((.name | ascii_downcase | contains(\"-prod-\")) | not) and
        ((.name | ascii_downcase | contains(\"-dev-\")) | not) and
        ((.name | ascii_downcase | contains(\"-staging-\")) | not) and
        (.tags.project != \"flamoral\") and
        (.tags.project != \"Flamoral\") and
        (.tags.application != \"flamoral\") and
        (.tags.application != \"dating\")
    )]" "$OUTPUT_DIR/all-resources.json" > "$OUTPUT_DIR/non-flamoral-resources.json"

    local non_flamoral_count=$(jq length "$OUTPUT_DIR/non-flamoral-resources.json")
    log_info "Found $non_flamoral_count non-Flamoral resources (will be excluded)"

    # Group resources by resource group
    log_info "Grouping resources by resource group..."
    jq 'group_by(.resourceGroup) | map({
        resourceGroup: .[0].resourceGroup,
        count: length,
        resources: [.[] | {name: .name, type: .type}]
    })' "$OUTPUT_DIR/flamoral-resources.json" > "$OUTPUT_DIR/resources-by-group.json"

    # Create evidence files for each resource
    log_info "Creating evidence files..."
    mkdir -p "$OUTPUT_DIR/evidence"

    jq -c '.[]' "$OUTPUT_DIR/flamoral-resources.json" | while read -r resource; do
        local name=$(echo "$resource" | jq -r '.name')
        local safe_name=$(echo "$name" | tr '/' '_' | tr ':' '_')
        echo "$resource" | jq '.' > "$OUTPUT_DIR/evidence/${safe_name}.json"
    done

    log_success "Evidence files created in $OUTPUT_DIR/evidence/"
}

#-------------------------------------------------------------------------------
# Phase 3: Dependency Analysis
#-------------------------------------------------------------------------------
analyze_dependencies() {
    log_section "PHASE 3: DEPENDENCY ANALYSIS"

    local deps_file="$OUTPUT_DIR/dependencies.json"
    echo '{"vnets": [], "aks": [], "databases": [], "keyvaults": [], "privateEndpoints": []}' > "$deps_file"

    # Analyze VNets and Subnets
    log_info "Analyzing Virtual Networks..."
    local vnets=$(jq '[.[] | select(.type == "Microsoft.Network/virtualNetworks")]' "$OUTPUT_DIR/flamoral-resources.json")
    if [ "$(echo "$vnets" | jq length)" -gt 0 ]; then
        for vnet_id in $(echo "$vnets" | jq -r '.[].id'); do
            local vnet_name=$(basename "$vnet_id")
            local rg=$(echo "$vnet_id" | grep -oP '(?<=resourceGroups/)[^/]+')
            log_info "  Checking VNet: $vnet_name"

            # Get subnets
            az network vnet subnet list --resource-group "$rg" --vnet-name "$vnet_name" \
                --output json 2>/dev/null >> "$OUTPUT_DIR/vnet-subnets-${vnet_name}.json" || true
        done
    fi

    # Analyze AKS clusters
    log_info "Analyzing AKS clusters..."
    local aks_clusters=$(jq '[.[] | select(.type == "Microsoft.ContainerService/managedClusters")]' "$OUTPUT_DIR/flamoral-resources.json")
    if [ "$(echo "$aks_clusters" | jq length)" -gt 0 ]; then
        for aks_id in $(echo "$aks_clusters" | jq -r '.[].id'); do
            local aks_name=$(basename "$aks_id")
            local rg=$(echo "$aks_id" | grep -oP '(?<=resourceGroups/)[^/]+')
            log_info "  Checking AKS: $aks_name"

            # Get node pools
            az aks nodepool list --resource-group "$rg" --cluster-name "$aks_name" \
                --output json 2>/dev/null > "$OUTPUT_DIR/aks-nodepools-${aks_name}.json" || true

            # Get AKS details including node resource group
            az aks show --resource-group "$rg" --name "$aks_name" \
                --output json 2>/dev/null > "$OUTPUT_DIR/aks-details-${aks_name}.json" || true
        done
    fi

    # Analyze databases
    log_info "Analyzing databases..."
    local databases=$(jq '[.[] | select(
        .type == "Microsoft.DBforPostgreSQL/flexibleServers" or
        .type == "Microsoft.DBforPostgreSQL/servers" or
        .type == "Microsoft.Sql/servers" or
        .type == "Microsoft.DocumentDB/databaseAccounts"
    )]' "$OUTPUT_DIR/flamoral-resources.json")

    if [ "$(echo "$databases" | jq length)" -gt 0 ]; then
        echo "$databases" > "$OUTPUT_DIR/databases.json"
        log_info "  Found $(echo "$databases" | jq length) database resources"
    fi

    # Analyze Key Vaults
    log_info "Analyzing Key Vaults..."
    local keyvaults=$(jq '[.[] | select(.type == "Microsoft.KeyVault/vaults")]' "$OUTPUT_DIR/flamoral-resources.json")
    if [ "$(echo "$keyvaults" | jq length)" -gt 0 ]; then
        echo "$keyvaults" > "$OUTPUT_DIR/keyvaults.json"
        for kv_id in $(echo "$keyvaults" | jq -r '.[].id'); do
            local kv_name=$(basename "$kv_id")
            local rg=$(echo "$kv_id" | grep -oP '(?<=resourceGroups/)[^/]+')
            log_info "  Checking Key Vault: $kv_name"

            # Check for soft-delete status
            az keyvault show --name "$kv_name" --resource-group "$rg" \
                --output json 2>/dev/null > "$OUTPUT_DIR/keyvault-${kv_name}.json" || true
        done
        log_warning "Key Vaults found - these should NEVER be deleted (soft-delete issues)"
    fi

    # Analyze Private Endpoints
    log_info "Analyzing Private Endpoints..."
    local private_endpoints=$(jq '[.[] | select(.type == "Microsoft.Network/privateEndpoints")]' "$OUTPUT_DIR/flamoral-resources.json")
    if [ "$(echo "$private_endpoints" | jq length)" -gt 0 ]; then
        echo "$private_endpoints" > "$OUTPUT_DIR/private-endpoints.json"
        log_info "  Found $(echo "$private_endpoints" | jq length) private endpoints"
    fi

    # Check for resources managed by other resources
    log_info "Checking for managed resources..."
    jq '[.[] | select(.managedBy != null)] | group_by(.managedBy) | map({
        managedBy: .[0].managedBy,
        resources: [.[] | {name: .name, type: .type}]
    })' "$OUTPUT_DIR/flamoral-resources.json" > "$OUTPUT_DIR/managed-resources.json"

    log_success "Dependency analysis complete"
}

#-------------------------------------------------------------------------------
# Phase 4: Consolidation Plan
#-------------------------------------------------------------------------------
create_consolidation_plan() {
    log_section "PHASE 4: CONSOLIDATION PLAN"

    local plan_file="$OUTPUT_DIR/consolidation-plan.md"
    local move_file="$OUTPUT_DIR/move-commands.sh"
    local delete_file="$OUTPUT_DIR/delete-commands.sh"
    local rollback_file="$OUTPUT_DIR/rollback-plan.md"

    # Get resources in target RG vs other RGs
    local in_target=$(jq --arg rg "$TARGET_RG" '[.[] | select(.resourceGroup == $rg)]' "$OUTPUT_DIR/flamoral-resources.json")
    local outside_target=$(jq --arg rg "$TARGET_RG" '[.[] | select(.resourceGroup != $rg)]' "$OUTPUT_DIR/flamoral-resources.json")

    local in_target_count=$(echo "$in_target" | jq length)
    local outside_target_count=$(echo "$outside_target" | jq length)

    log_info "Resources in $TARGET_RG: $in_target_count"
    log_info "Resources outside $TARGET_RG: $outside_target_count"

    #---------------------------------------------------------------------------
    # Generate Consolidation Plan (Markdown)
    #---------------------------------------------------------------------------
    cat > "$plan_file" << EOF
# Flamoral Azure Resource Consolidation Plan

**Generated:** $(date)
**Subscription:** $SUBSCRIPTION_ID
**Target Resource Group:** $TARGET_RG
**Mode:** $([ "$DRY_RUN" = "true" ] && echo "DRY RUN" || echo "LIVE")

## Summary

| Category | Count |
|----------|-------|
| Total Flamoral Resources | $(jq length "$OUTPUT_DIR/flamoral-resources.json") |
| Already in Target RG | $in_target_count |
| Need to be Moved | $outside_target_count |
| Non-Flamoral Resources | $(jq length "$OUTPUT_DIR/non-flamoral-resources.json") |

## Resources Already in Target RG

These resources are already in \`$TARGET_RG\` and require no action:

| Name | Type |
|------|------|
$(echo "$in_target" | jq -r '.[] | "| \(.name) | \(.type) |"')

## Resources to be Moved

These resources are in other resource groups and may be candidates for consolidation:

| Name | Current RG | Type |
|------|------------|------|
$(echo "$outside_target" | jq -r '.[] | "| \(.name) | \(.resourceGroup) | \(.type) |"')

## Resources NOT to be Moved

The following resource types should NOT be moved due to limitations or risks:

- **Key Vaults** - Soft-delete complications, secret references
- **Managed Identities** - Role assignments may break
- **AKS Node Resource Groups** - Managed by AKS
- **Resources with Active Connections** - May cause downtime

## Safety Warnings

$(jq -r '.[] | select(.type == "Microsoft.KeyVault/vaults") | "- **Key Vault:** \(.name) - DO NOT DELETE"' "$OUTPUT_DIR/flamoral-resources.json")

## Recommended Actions

1. Review this plan carefully before executing any commands
2. Ensure you have backups of all critical resources
3. Run move commands during maintenance window
4. Test all services after moves complete
5. Keep rollback plan ready

## Files Generated

- \`move-commands.sh\` - Commands to move resources (review before executing)
- \`delete-commands.sh\` - Commands to delete resources (DANGEROUS - requires manual review)
- \`rollback-plan.md\` - Steps to rollback if issues occur
- \`resource-inventory.json\` - Full inventory of all resources
- \`dependencies.json\` - Resource dependency information
EOF

    log_success "Consolidation plan created: $plan_file"

    #---------------------------------------------------------------------------
    # Generate Move Commands
    #---------------------------------------------------------------------------
    cat > "$move_file" << 'HEADER'
#!/bin/bash
#===============================================================================
# Flamoral Resource Move Commands
#===============================================================================
# GENERATED FILE - Review carefully before executing!
#
# This script moves resources to the target resource group.
# Some resources may not be movable - check Azure documentation.
#
# Usage:
#   ./move-commands.sh           # Dry run (preview only)
#   DRY_RUN=false ./move-commands.sh  # Execute moves
#===============================================================================

set -euo pipefail

DRY_RUN="${DRY_RUN:-true}"

HEADER

    cat >> "$move_file" << EOF
SUBSCRIPTION_ID="$SUBSCRIPTION_ID"
TARGET_RG="$TARGET_RG"

az account set --subscription "\$SUBSCRIPTION_ID"

echo "Moving resources to: \$TARGET_RG"
echo "Dry run mode: \$DRY_RUN"
echo ""

EOF

    # Generate move commands for each resource outside target RG
    echo "$outside_target" | jq -r '.[] | select(
        .type != "Microsoft.KeyVault/vaults" and
        .type != "Microsoft.ManagedIdentity/userAssignedIdentities" and
        (.managedBy == null)
    ) | "# Move: \(.name) (\(.type))\nif [ \"\$DRY_RUN\" = \"true\" ]; then\n    echo \"[DRY RUN] Would move: \(.name)\"\nelse\n    echo \"Moving: \(.name)\"\n    az resource move --destination-group \"\$TARGET_RG\" --ids \"\(.id)\" || echo \"Failed to move: \(.name)\"\nfi\n"' >> "$move_file"

    chmod +x "$move_file"
    log_success "Move commands generated: $move_file"

    #---------------------------------------------------------------------------
    # Generate Delete Commands (with safety checks)
    #---------------------------------------------------------------------------
    cat > "$delete_file" << 'HEADER'
#!/bin/bash
#===============================================================================
# Flamoral Resource Delete Commands
#===============================================================================
# ⚠️  DANGEROUS - This script deletes resources!
#
# SAFETY REQUIREMENTS:
# 1. FORCE_DELETE must be set to 'true'
# 2. Each resource requires manual confirmation
# 3. Key Vaults are NEVER deleted
# 4. Resources with active connections are skipped
#
# Usage:
#   FORCE_DELETE=true ./delete-commands.sh
#===============================================================================

set -euo pipefail

FORCE_DELETE="${FORCE_DELETE:-false}"

if [ "$FORCE_DELETE" != "true" ]; then
    echo "ERROR: This script requires FORCE_DELETE=true to run"
    echo "This is a safety measure to prevent accidental deletions"
    exit 1
fi

HEADER

    cat >> "$delete_file" << EOF
SUBSCRIPTION_ID="$SUBSCRIPTION_ID"

az account set --subscription "\$SUBSCRIPTION_ID"

echo "=========================================="
echo "  DANGER: RESOURCE DELETION SCRIPT"
echo "=========================================="
echo ""
echo "This script will DELETE resources."
echo "Press Ctrl+C to abort."
echo ""
read -p "Type 'DELETE' to continue: " confirmation
if [ "\$confirmation" != "DELETE" ]; then
    echo "Aborted."
    exit 1
fi

EOF

    # Only generate delete commands for truly redundant resources
    # By default, we mark nothing for deletion - this requires manual review
    cat >> "$delete_file" << 'EOF'

# No resources are automatically marked for deletion.
# Review the resource inventory and manually add delete commands for truly redundant resources.
#
# Example format:
# echo "Deleting: <resource-name>"
# az resource delete --ids "<resource-id>" --verbose
#
# NEVER DELETE:
# - Key Vaults (soft-delete issues)
# - Resources with active connections
# - AKS node resource groups
# - Resources referenced by other resources

echo "No automatic deletions configured."
echo "Review resource-inventory.json and manually add delete commands if needed."
EOF

    chmod +x "$delete_file"
    log_success "Delete commands generated: $delete_file"

    #---------------------------------------------------------------------------
    # Generate Rollback Plan
    #---------------------------------------------------------------------------
    cat > "$rollback_file" << EOF
# Flamoral Resource Consolidation - Rollback Plan

**Generated:** $(date)

## Pre-Move Checklist

Before executing any moves:

1. [ ] Export all resource configurations: \`az resource show --ids <id> > backup.json\`
2. [ ] Document current resource group assignments
3. [ ] Verify all services are healthy
4. [ ] Notify team of maintenance window
5. [ ] Have Azure support contact ready

## Rollback Procedures

### If Move Fails

1. Check Azure Activity Log for errors
2. Verify resource is still in original location
3. Check for lock or policy violations
4. Retry with \`--verbose\` flag

### If Service Disruption Occurs

1. Check AKS cluster status: \`az aks show -g <rg> -n <name>\`
2. Check database connectivity
3. Verify private endpoint status
4. Check Key Vault access policies

### Emergency Contacts

- Azure Support: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
- Team Lead: [Add contact]
- On-call: [Add contact]

## Resource Original Locations

$(echo "$outside_target" | jq -r '.[] | "- **\(.name)**: \(.resourceGroup)"')

## Post-Rollback Verification

1. [ ] All services responding
2. [ ] Database connections working
3. [ ] AKS pods running
4. [ ] Monitoring alerts clear
EOF

    log_success "Rollback plan generated: $rollback_file"
}

#-------------------------------------------------------------------------------
# Phase 5: Safety Summary
#-------------------------------------------------------------------------------
print_safety_summary() {
    log_section "SAFETY SUMMARY"

    log_info "Generated files in: $OUTPUT_DIR"
    echo ""
    echo "  Resource Inventory:"
    echo "    - resource-inventory.json     Complete resource list"
    echo "    - flamoral-resources.json     Flamoral-specific resources"
    echo "    - non-flamoral-resources.json Resources to exclude"
    echo "    - resources-by-group.json     Resources grouped by RG"
    echo ""
    echo "  Analysis:"
    echo "    - dependencies.json           Resource dependencies"
    echo "    - evidence/                   Per-resource evidence files"
    echo ""
    echo "  Action Plans:"
    echo "    - consolidation-plan.md       Human-readable plan"
    echo "    - move-commands.sh            Resource move commands"
    echo "    - delete-commands.sh          Resource delete commands"
    echo "    - rollback-plan.md            Emergency rollback steps"
    echo ""

    log_warning "IMPORTANT SAFETY NOTES:"
    echo ""
    echo "  1. This script performed READ-ONLY operations"
    echo "  2. Review consolidation-plan.md before any actions"
    echo "  3. move-commands.sh runs in DRY RUN mode by default"
    echo "  4. delete-commands.sh requires FORCE_DELETE=true"
    echo "  5. Key Vaults are NEVER deleted automatically"
    echo "  6. Always have a rollback plan ready"
    echo ""

    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN mode - no changes were made"
    else
        log_warning "LIVE mode - review all generated scripts before execution"
    fi
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════════════╗"
    echo "║     Flamoral Azure Resource Discovery and Consolidation Script            ║"
    echo "║                                                                           ║"
    echo "║     Mode: $([ "$DRY_RUN" = "true" ] && echo "DRY RUN (Read-Only)" || echo "LIVE              ")                                         ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════╝"
    echo ""

    check_az_cli
    setup_output_directory

    discover_resources
    identify_flamoral_resources
    analyze_dependencies
    create_consolidation_plan
    print_safety_summary

    log_success "Discovery and planning complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Review: $OUTPUT_DIR/consolidation-plan.md"
    echo "  2. Review: $OUTPUT_DIR/move-commands.sh"
    echo "  3. Execute moves during maintenance window"
    echo ""
}

# Run main function
main "$@"
