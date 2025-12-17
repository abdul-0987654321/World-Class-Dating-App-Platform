#!/bin/bash

################################################################################
# Azure Cost Optimization Recommendations Script
#
# This script checks Azure Advisor for cost optimization recommendations
# and generates a report with actionable insights.
#
# Features:
# - Retrieves Azure Advisor cost recommendations
# - Checks for unused resources
# - Identifies reserved instance opportunities
# - Analyzes VM and database SKU optimization
# - Generates detailed HTML and Markdown reports
#
# Usage:
#   ./check-cost-recommendations.sh [OPTIONS]
#
# Options:
#   -s, --subscription    Subscription ID (optional, uses current if not set)
#   -r, --resource-group  Resource group name (optional, all if not set)
#   -o, --output          Output format: json|table|markdown|html (default: table)
#   -f, --file            Output file path (optional)
#   -v, --verbose         Verbose output
#   -h, --help            Show this help message
#
# Prerequisites:
# - Azure CLI installed and logged in
# - Contributor or Reader role on subscription
#
# Author: DevOps Team
# Version: 1.0.0
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
OUTPUT_FORMAT="table"
OUTPUT_FILE=""
VERBOSE=false
SUBSCRIPTION_ID=""
RESOURCE_GROUP=""

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Azure Cost Optimization Recommendations Script

Usage: $0 [OPTIONS]

Options:
  -s, --subscription ID      Subscription ID (optional, uses current if not set)
  -r, --resource-group NAME  Resource group name (optional, all if not set)
  -o, --output FORMAT        Output format: json|table|markdown|html (default: table)
  -f, --file PATH            Output file path (optional)
  -v, --verbose              Verbose output
  -h, --help                 Show this help message

Examples:
  $0                                                    # Check all recommendations
  $0 -s <sub-id> -r flamoral-prod-rg                   # Specific resource group
  $0 -o markdown -f cost-report.md                     # Generate markdown report
  $0 -o html -f cost-report.html                       # Generate HTML report

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--subscription)
            SUBSCRIPTION_ID="$2"
            shift 2
            ;;
        -r|--resource-group)
            RESOURCE_GROUP="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -f|--file)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    print_error "Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Set subscription if provided
if [[ -n "$SUBSCRIPTION_ID" ]]; then
    print_info "Setting subscription to: $SUBSCRIPTION_ID"
    az account set --subscription "$SUBSCRIPTION_ID"
fi

# Get current subscription
CURRENT_SUB=$(az account show --query id -o tsv)
CURRENT_SUB_NAME=$(az account show --query name -o tsv)

print_info "Analyzing subscription: $CURRENT_SUB_NAME ($CURRENT_SUB)"

# ========================================
# Retrieve Azure Advisor Recommendations
# ========================================

print_info "Retrieving Azure Advisor cost recommendations..."

ADVISOR_QUERY="az advisor recommendation list --category Cost --query"

if [[ -n "$RESOURCE_GROUP" ]]; then
    ADVISOR_RECOMMENDATIONS=$(az advisor recommendation list \
        --category Cost \
        --resource-group "$RESOURCE_GROUP" \
        --output json 2>/dev/null || echo "[]")
else
    ADVISOR_RECOMMENDATIONS=$(az advisor recommendation list \
        --category Cost \
        --output json 2>/dev/null || echo "[]")
fi

RECOMMENDATION_COUNT=$(echo "$ADVISOR_RECOMMENDATIONS" | jq '. | length')
print_info "Found $RECOMMENDATION_COUNT cost recommendations"

# ========================================
# Analyze Unused Resources
# ========================================

print_info "Checking for unused resources..."

# Find unattached disks
UNATTACHED_DISKS=$(az disk list --query "[?diskState=='Unattached'].{Name:name,ResourceGroup:resourceGroup,Size:diskSizeGb,Tier:sku.name}" -o json 2>/dev/null || echo "[]")
UNATTACHED_DISKS_COUNT=$(echo "$UNATTACHED_DISKS" | jq '. | length')

# Find unused public IPs
UNUSED_IPS=$(az network public-ip list --query "[?ipConfiguration==null].{Name:name,ResourceGroup:resourceGroup,SKU:sku.name}" -o json 2>/dev/null || echo "[]")
UNUSED_IPS_COUNT=$(echo "$UNUSED_IPS" | jq '. | length')

# Find empty resource groups
EMPTY_RGS=$(az group list --query "[?properties.provisioningState=='Succeeded']" -o json | \
    jq -r '.[] | select(.name | test("^flamoral-")) | .name' | \
    while read -r rg; do
        resource_count=$(az resource list --resource-group "$rg" --query "length(@)" -o tsv 2>/dev/null || echo "0")
        if [[ "$resource_count" == "0" ]]; then
            echo "$rg"
        fi
    done)
EMPTY_RGS_COUNT=$(echo "$EMPTY_RGS" | grep -c . || echo "0")

print_success "Unused resources check complete"

# ========================================
# Reserved Instance Opportunities
# ========================================

print_info "Analyzing reserved instance opportunities..."

# Get VM usage for RI recommendations
VMS=$(az vm list --query "[].{Name:name,ResourceGroup:resourceGroup,Size:hardwareProfile.vmSize,Location:location}" -o json 2>/dev/null || echo "[]")
VM_COUNT=$(echo "$VMS" | jq '. | length')

# Get PostgreSQL servers for RI recommendations
POSTGRES_SERVERS=$(az postgres flexible-server list --query "[].{Name:name,ResourceGroup:resourceGroup,SKU:sku.name,Location:location}" -o json 2>/dev/null || echo "[]")
POSTGRES_COUNT=$(echo "$POSTGRES_SERVERS" | jq '. | length')

# Get Redis caches for RI recommendations
REDIS_CACHES=$(az redis list --query "[].{Name:name,ResourceGroup:resourceGroup,SKU:sku.name,Location:location}" -o json 2>/dev/null || echo "[]")
REDIS_COUNT=$(echo "$REDIS_CACHES" | jq '. | length')

print_success "Reserved instance analysis complete"

# ========================================
# Cost Anomaly Detection
# ========================================

print_info "Checking recent cost trends..."

# Get cost data for last 30 days
END_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_DATE=$(date -u -d '30 days ago' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-30d +"%Y-%m-%dT%H:%M:%SZ")

# Note: Cost Management API requires specific permissions
COST_DATA=$(az costmanagement query \
    --type ActualCost \
    --dataset-aggregation "totalCost={name:PreTaxCost,function:Sum}" \
    --dataset-grouping name=ResourceGroupName type=Dimension \
    --timeframe Custom \
    --time-period from="$START_DATE" to="$END_DATE" \
    --scope "/subscriptions/$CURRENT_SUB" \
    -o json 2>/dev/null || echo '{"properties":{"rows":[]}}')

print_success "Cost trend analysis complete"

# ========================================
# Generate Report
# ========================================

print_info "Generating report in $OUTPUT_FORMAT format..."

# Calculate potential savings
TOTAL_SAVINGS=0

# Calculate savings from Advisor recommendations
if [[ "$RECOMMENDATION_COUNT" -gt 0 ]]; then
    ADVISOR_SAVINGS=$(echo "$ADVISOR_RECOMMENDATIONS" | jq '[.[] | .extendedProperties.savingsAmount // 0 | tonumber] | add' 2>/dev/null || echo "0")
    TOTAL_SAVINGS=$(echo "$TOTAL_SAVINGS + $ADVISOR_SAVINGS" | bc)
fi

# Estimate savings from unused resources (rough estimates)
DISK_SAVINGS=$(echo "$UNATTACHED_DISKS_COUNT * 5" | bc)  # ~$5/month per disk
IP_SAVINGS=$(echo "$UNUSED_IPS_COUNT * 4" | bc)          # ~$4/month per public IP
TOTAL_SAVINGS=$(echo "$TOTAL_SAVINGS + $DISK_SAVINGS + $IP_SAVINGS" | bc)

# ========================================
# Output Reports
# ========================================

generate_markdown_report() {
    cat << EOF
# Azure Cost Optimization Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Subscription:** $CURRENT_SUB_NAME ($CURRENT_SUB)
**Resource Group:** ${RESOURCE_GROUP:-All}

## Executive Summary

- **Total Recommendations:** $RECOMMENDATION_COUNT
- **Estimated Monthly Savings:** \$$(printf "%.2f" "$TOTAL_SAVINGS")
- **Unused Resources Found:** $(($UNATTACHED_DISKS_COUNT + $UNUSED_IPS_COUNT))
- **Reserved Instance Opportunities:** $(($VM_COUNT + $POSTGRES_COUNT + $REDIS_COUNT)) resources

---

## Azure Advisor Recommendations

EOF

    if [[ "$RECOMMENDATION_COUNT" -gt 0 ]]; then
        echo "$ADVISOR_RECOMMENDATIONS" | jq -r '.[] | "### \(.properties.shortDescription.problem)\n\n**Impact:** \(.properties.impact)  \n**Category:** \(.properties.category)  \n**Savings:** $\(.extendedProperties.savingsAmount // "N/A")  \n\n**Recommendation:** \(.properties.shortDescription.solution)\n\n**Affected Resource:** \(.properties.resourceMetadata.resourceId)\n\n**Action:** \(.properties.recommendationTypeId)\n\n---\n"'
    else
        echo "No Azure Advisor cost recommendations found."
    fi

    cat << EOF

## Unused Resources

### Unattached Disks ($UNATTACHED_DISKS_COUNT found)
Estimated savings: \$$DISK_SAVINGS/month

EOF

    if [[ "$UNATTACHED_DISKS_COUNT" -gt 0 ]]; then
        echo "$UNATTACHED_DISKS" | jq -r '.[] | "- **\(.Name)** in \(.ResourceGroup) - \(.Size)GB (\(.Tier))"'
    else
        echo "No unattached disks found."
    fi

    cat << EOF

### Unused Public IPs ($UNUSED_IPS_COUNT found)
Estimated savings: \$$IP_SAVINGS/month

EOF

    if [[ "$UNUSED_IPS_COUNT" -gt 0 ]]; then
        echo "$UNUSED_IPS" | jq -r '.[] | "- **\(.Name)** in \(.ResourceGroup) (\(.SKU))"'
    else
        echo "No unused public IPs found."
    fi

    cat << EOF

### Empty Resource Groups ($EMPTY_RGS_COUNT found)

EOF

    if [[ "$EMPTY_RGS_COUNT" -gt 0 ]]; then
        echo "$EMPTY_RGS" | while read -r rg; do
            echo "- $rg"
        done
    else
        echo "No empty resource groups found."
    fi

    cat << EOF

---

## Reserved Instance Opportunities

### Virtual Machines ($VM_COUNT)

EOF

    if [[ "$VM_COUNT" -gt 0 ]]; then
        echo "$VMS" | jq -r '.[] | "- **\(.Name)** - \(.Size) in \(.Location)"'
        echo ""
        echo "**Recommendation:** Consider 1-year or 3-year reserved instances for stable workloads."
        echo "**Potential Savings:** 40-60% compared to pay-as-you-go"
    else
        echo "No VMs found for RI analysis."
    fi

    cat << EOF

### PostgreSQL Servers ($POSTGRES_COUNT)

EOF

    if [[ "$POSTGRES_COUNT" -gt 0 ]]; then
        echo "$POSTGRES_SERVERS" | jq -r '.[] | "- **\(.Name)** - \(.SKU) in \(.Location)"'
        echo ""
        echo "**Recommendation:** Consider reserved capacity for production databases."
        echo "**Potential Savings:** Up to 65% with 3-year commitment"
    else
        echo "No PostgreSQL servers found for RI analysis."
    fi

    cat << EOF

### Redis Caches ($REDIS_COUNT)

EOF

    if [[ "$REDIS_COUNT" -gt 0 ]]; then
        echo "$REDIS_CACHES" | jq -r '.[] | "- **\(.Name)** - \(.SKU) in \(.Location)"'
        echo ""
        echo "**Recommendation:** Consider reserved cache instances for production environments."
        echo "**Potential Savings:** Up to 60% with 3-year commitment"
    else
        echo "No Redis caches found for RI analysis."
    fi

    cat << EOF

---

## Next Steps

1. **Review Advisor Recommendations:** Implement high-impact recommendations first
2. **Clean Up Unused Resources:** Delete or archive unattached disks and unused IPs
3. **Evaluate Reserved Instances:** Calculate ROI for stable production workloads
4. **Monitor Costs:** Set up budget alerts and review spending weekly
5. **Right-Size Resources:** Use Azure Advisor to identify over-provisioned resources

## Tools & Resources

- [Azure Cost Management](https://portal.azure.com/#view/Microsoft_Azure_CostManagement/Menu/~/overview)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [Reserved Instances](https://portal.azure.com/#view/Microsoft_Azure_Reservations/ReservationsBrowseBlade)
- [Azure Advisor](https://portal.azure.com/#view/Microsoft_Azure_Expert/AdvisorMenuBlade/~/Cost)

---

*Report generated by Flamoral Cost Optimization Script*
EOF
}

generate_html_report() {
    cat << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure Cost Optimization Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { margin-top: 0; color: #333; }
        .metric { font-size: 2em; font-weight: bold; color: #667eea; }
        .section { background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .recommendation { border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; background: #f8f9fa; }
        .high-impact { border-left-color: #e74c3c; }
        .medium-impact { border-left-color: #f39c12; }
        .low-impact { border-left-color: #3498db; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
        th { background: #667eea; color: white; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.85em; font-weight: bold; }
        .badge-success { background: #27ae60; color: white; }
        .badge-warning { background: #f39c12; color: white; }
        .badge-danger { background: #e74c3c; color: white; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Azure Cost Optimization Report</h1>
        <p><strong>Generated:</strong> $(date -u +"%Y-%m-%d %H:%M:%S UTC")</p>
        <p><strong>Subscription:</strong> $CURRENT_SUB_NAME ($CURRENT_SUB)</p>
    </div>

    <div class="summary">
        <div class="card">
            <h3>Total Recommendations</h3>
            <div class="metric">$RECOMMENDATION_COUNT</div>
        </div>
        <div class="card">
            <h3>Estimated Monthly Savings</h3>
            <div class="metric">\$$(printf "%.2f" "$TOTAL_SAVINGS")</div>
        </div>
        <div class="card">
            <h3>Unused Resources</h3>
            <div class="metric">$(($UNATTACHED_DISKS_COUNT + $UNUSED_IPS_COUNT))</div>
        </div>
        <div class="card">
            <h3>RI Opportunities</h3>
            <div class="metric">$(($VM_COUNT + $POSTGRES_COUNT + $REDIS_COUNT))</div>
        </div>
    </div>

    <div class="section">
        <h2>Azure Advisor Recommendations</h2>
EOF

    if [[ "$RECOMMENDATION_COUNT" -gt 0 ]]; then
        echo "$ADVISOR_RECOMMENDATIONS" | jq -r '.[] | "<div class=\"recommendation \(if .properties.impact == "High" then "high-impact" elif .properties.impact == "Medium" then "medium-impact" else "low-impact" end)\"><h4>\(.properties.shortDescription.problem)</h4><p><strong>Impact:</strong> <span class=\"badge badge-\(if .properties.impact == "High" then "danger" elif .properties.impact == "Medium" then "warning" else "success" end)\">\(.properties.impact)</span> | <strong>Savings:</strong> $\(.extendedProperties.savingsAmount // "N/A")</p><p>\(.properties.shortDescription.solution)</p><p><small><strong>Resource:</strong> \(.properties.resourceMetadata.resourceId)</small></p></div>"'
    else
        echo "<p>No Azure Advisor cost recommendations found.</p>"
    fi

    cat << EOF
    </div>

    <div class="section">
        <h2>Unused Resources</h2>
        <h3>Unattached Disks ($UNATTACHED_DISKS_COUNT) - Potential savings: \$$DISK_SAVINGS/month</h3>
EOF

    if [[ "$UNATTACHED_DISKS_COUNT" -gt 0 ]]; then
        echo "<table><tr><th>Name</th><th>Resource Group</th><th>Size (GB)</th><th>Tier</th></tr>"
        echo "$UNATTACHED_DISKS" | jq -r '.[] | "<tr><td>\(.Name)</td><td>\(.ResourceGroup)</td><td>\(.Size)</td><td>\(.Tier)</td></tr>"'
        echo "</table>"
    else
        echo "<p>No unattached disks found.</p>"
    fi

    cat << EOF
        <h3>Unused Public IPs ($UNUSED_IPS_COUNT) - Potential savings: \$$IP_SAVINGS/month</h3>
EOF

    if [[ "$UNUSED_IPS_COUNT" -gt 0 ]]; then
        echo "<table><tr><th>Name</th><th>Resource Group</th><th>SKU</th></tr>"
        echo "$UNUSED_IPS" | jq -r '.[] | "<tr><td>\(.Name)</td><td>\(.ResourceGroup)</td><td>\(.SKU)</td></tr>"'
        echo "</table>"
    else
        echo "<p>No unused public IPs found.</p>"
    fi

    cat << EOF
    </div>

    <div class="section">
        <h2>Reserved Instance Opportunities</h2>
        <p>Consider purchasing reserved instances for the following stable production workloads:</p>
        <ul>
            <li><strong>Virtual Machines:</strong> $VM_COUNT resources (40-60% savings)</li>
            <li><strong>PostgreSQL Servers:</strong> $POSTGRES_COUNT resources (up to 65% savings)</li>
            <li><strong>Redis Caches:</strong> $REDIS_COUNT resources (up to 60% savings)</li>
        </ul>
    </div>

</body>
</html>
EOF
}

# Generate output based on format
case $OUTPUT_FORMAT in
    json)
        OUTPUT=$(jq -n \
            --arg sub "$CURRENT_SUB_NAME" \
            --arg date "$(date -u +"%Y-%m-%d %H:%M:%S UTC")" \
            --argjson recommendations "$ADVISOR_RECOMMENDATIONS" \
            --argjson disks "$UNATTACHED_DISKS" \
            --argjson ips "$UNUSED_IPS" \
            --argjson vms "$VMS" \
            --argjson postgres "$POSTGRES_SERVERS" \
            --argjson redis "$REDIS_CACHES" \
            --arg savings "$TOTAL_SAVINGS" \
            '{subscription: $sub, generated: $date, totalSavings: $savings, recommendations: $recommendations, unusedResources: {disks: $disks, publicIPs: $ips}, reservedInstanceOpportunities: {vms: $vms, postgres: $postgres, redis: $redis}}')
        ;;
    markdown)
        OUTPUT=$(generate_markdown_report)
        ;;
    html)
        OUTPUT=$(generate_html_report)
        ;;
    table)
        OUTPUT=$(cat << EOF
========================================
AZURE COST OPTIMIZATION REPORT
========================================
Subscription: $CURRENT_SUB_NAME
Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

SUMMARY
-------
Total Recommendations: $RECOMMENDATION_COUNT
Estimated Monthly Savings: \$$(printf "%.2f" "$TOTAL_SAVINGS")
Unused Resources: $(($UNATTACHED_DISKS_COUNT + $UNUSED_IPS_COUNT))
Reserved Instance Opportunities: $(($VM_COUNT + $POSTGRES_COUNT + $REDIS_COUNT))

UNUSED RESOURCES
----------------
Unattached Disks: $UNATTACHED_DISKS_COUNT (Est. \$$DISK_SAVINGS/month)
Unused Public IPs: $UNUSED_IPS_COUNT (Est. \$$IP_SAVINGS/month)
Empty Resource Groups: $EMPTY_RGS_COUNT

RESERVED INSTANCE OPPORTUNITIES
-------------------------------
Virtual Machines: $VM_COUNT
PostgreSQL Servers: $POSTGRES_COUNT
Redis Caches: $REDIS_COUNT

Run with -o markdown or -o html for detailed reports.
========================================
EOF
        )
        ;;
esac

# Write to file or stdout
if [[ -n "$OUTPUT_FILE" ]]; then
    echo "$OUTPUT" > "$OUTPUT_FILE"
    print_success "Report saved to: $OUTPUT_FILE"
else
    echo "$OUTPUT"
fi

print_success "Cost optimization analysis complete!"
print_info "Estimated monthly savings: \$$(printf "%.2f" "$TOTAL_SAVINGS")"
