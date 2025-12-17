#!/bin/bash

################################################################################
# Azure Cost Export Setup Script
#
# This script configures Azure Cost Management export to storage account.
# Cost exports must be configured via Azure CLI or Portal (not available in TF).
#
# Usage:
#   ./setup-cost-export.sh [OPTIONS]
#
# Options:
#   -s, --subscription    Subscription ID
#   -r, --resource-group  Resource group name
#   -a, --storage-account Storage account name for exports
#   -c, --container       Container name (default: cost-exports)
#   -n, --export-name     Export name (default: daily-cost-export)
#   -f, --frequency       Export frequency: Daily|Weekly|Monthly (default: Daily)
#   -h, --help            Show this help message
#
# Prerequisites:
# - Azure CLI installed and logged in
# - Cost Management Contributor role
# - Storage account must exist
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
NC='\033[0m'

# Default values
SUBSCRIPTION_ID=""
RESOURCE_GROUP=""
STORAGE_ACCOUNT=""
CONTAINER_NAME="cost-exports"
EXPORT_NAME="daily-cost-export"
FREQUENCY="Daily"

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
Azure Cost Export Setup Script

Usage: $0 [OPTIONS]

Options:
  -s, --subscription ID      Subscription ID
  -r, --resource-group NAME  Resource group name
  -a, --storage-account NAME Storage account name for exports
  -c, --container NAME       Container name (default: cost-exports)
  -n, --export-name NAME     Export name (default: daily-cost-export)
  -f, --frequency FREQ       Export frequency: Daily|Weekly|Monthly (default: Daily)
  -h, --help                 Show this help message

Examples:
  $0 -s <sub-id> -r flamoral-prod-rg -a flamoralcostexpprod
  $0 -s <sub-id> -r flamoral-prod-rg -a storage123 -f Weekly

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
        -a|--storage-account)
            STORAGE_ACCOUNT="$2"
            shift 2
            ;;
        -c|--container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -n|--export-name)
            EXPORT_NAME="$2"
            shift 2
            ;;
        -f|--frequency)
            FREQUENCY="$2"
            shift 2
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

# Validate required parameters
if [[ -z "$SUBSCRIPTION_ID" ]]; then
    print_error "Subscription ID is required (-s)"
    show_usage
    exit 1
fi

if [[ -z "$RESOURCE_GROUP" ]]; then
    print_error "Resource group is required (-r)"
    show_usage
    exit 1
fi

if [[ -z "$STORAGE_ACCOUNT" ]]; then
    print_error "Storage account name is required (-a)"
    show_usage
    exit 1
fi

# Validate frequency
if [[ ! "$FREQUENCY" =~ ^(Daily|Weekly|Monthly)$ ]]; then
    print_error "Invalid frequency: $FREQUENCY. Must be Daily, Weekly, or Monthly"
    exit 1
fi

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

print_info "Setting subscription to: $SUBSCRIPTION_ID"
az account set --subscription "$SUBSCRIPTION_ID"

# Verify storage account exists
print_info "Verifying storage account: $STORAGE_ACCOUNT"
if ! az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    print_error "Storage account $STORAGE_ACCOUNT not found in resource group $RESOURCE_GROUP"
    exit 1
fi

print_success "Storage account verified"

# Get storage account details
STORAGE_ACCOUNT_ID=$(az storage account show \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query id -o tsv)

print_info "Storage Account ID: $STORAGE_ACCOUNT_ID"

# Verify container exists
print_info "Verifying container: $CONTAINER_NAME"
STORAGE_KEY=$(az storage account keys list \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "[0].value" -o tsv)

if ! az storage container exists \
    --name "$CONTAINER_NAME" \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" \
    --query "exists" -o tsv | grep -q "true"; then
    print_warning "Container $CONTAINER_NAME does not exist. Creating..."
    az storage container create \
        --name "$CONTAINER_NAME" \
        --account-name "$STORAGE_ACCOUNT" \
        --account-key "$STORAGE_KEY"
    print_success "Container created"
else
    print_success "Container verified"
fi

# Configure cost export
print_info "Creating cost export: $EXPORT_NAME"

# Determine recurrence pattern
case $FREQUENCY in
    Daily)
        RECURRENCE="Daily"
        RECURRENCE_PERIOD="Day"
        ;;
    Weekly)
        RECURRENCE="Weekly"
        RECURRENCE_PERIOD="Week"
        ;;
    Monthly)
        RECURRENCE="Monthly"
        RECURRENCE_PERIOD="Month"
        ;;
esac

# Get start and end dates
START_DATE=$(date -u +"%Y-%m-01")
END_DATE=$(date -u -d "+1 year" +"%Y-%m-01" 2>/dev/null || date -u -v+1y +"%Y-%m-01")

print_info "Export configuration:"
print_info "  Name: $EXPORT_NAME"
print_info "  Frequency: $FREQUENCY"
print_info "  Storage: $STORAGE_ACCOUNT/$CONTAINER_NAME"
print_info "  Period: $START_DATE to $END_DATE"

# Create export using Azure CLI
# Note: The costmanagement extension may need to be installed
if ! az extension show --name costmanagement &> /dev/null; then
    print_info "Installing Azure Cost Management extension..."
    az extension add --name costmanagement
fi

# Create the cost export
az costmanagement export create \
    --name "$EXPORT_NAME" \
    --type ActualCost \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --storage-account-id "$STORAGE_ACCOUNT_ID" \
    --storage-container "$CONTAINER_NAME" \
    --timeframe MonthToDate \
    --recurrence "$RECURRENCE" \
    --recurrence-period "$RECURRENCE_PERIOD" \
    --schedule-status Active \
    --format Csv

if [[ $? -eq 0 ]]; then
    print_success "Cost export created successfully!"
else
    print_error "Failed to create cost export"
    exit 1
fi

# Verify export was created
print_info "Verifying cost export..."
EXPORT_DETAILS=$(az costmanagement export show \
    --name "$EXPORT_NAME" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    -o json 2>/dev/null)

if [[ -n "$EXPORT_DETAILS" ]]; then
    print_success "Export verification successful"
    echo ""
    echo "Export Details:"
    echo "  Name: $(echo "$EXPORT_DETAILS" | jq -r '.name')"
    echo "  Status: $(echo "$EXPORT_DETAILS" | jq -r '.properties.schedule.status')"
    echo "  Recurrence: $(echo "$EXPORT_DETAILS" | jq -r '.properties.schedule.recurrence')"
    echo "  Format: $(echo "$EXPORT_DETAILS" | jq -r '.properties.format')"
    echo "  Storage: $STORAGE_ACCOUNT/$CONTAINER_NAME"
else
    print_warning "Could not verify export details"
fi

# Print next steps
echo ""
print_info "Next Steps:"
echo "  1. Wait 24-48 hours for first export to run"
echo "  2. Check storage container for export files:"
echo "     az storage blob list --account-name $STORAGE_ACCOUNT --container-name $CONTAINER_NAME --output table"
echo "  3. Download export data:"
echo "     az storage blob download --account-name $STORAGE_ACCOUNT --container-name $CONTAINER_NAME --name <blob-name> --file cost-data.csv"
echo "  4. Configure Power BI or other analytics tools to consume the data"
echo ""

print_success "Cost export setup complete!"

# Optional: Create a sample download script
DOWNLOAD_SCRIPT="download-cost-exports.sh"
cat > "$DOWNLOAD_SCRIPT" << 'EOFDOWNLOAD'
#!/bin/bash
# Download latest cost export

STORAGE_ACCOUNT="__STORAGE_ACCOUNT__"
CONTAINER="__CONTAINER__"

echo "Listing available cost exports..."
az storage blob list \
    --account-name "$STORAGE_ACCOUNT" \
    --container-name "$CONTAINER" \
    --output table

echo ""
echo "Download a specific export:"
echo "az storage blob download --account-name $STORAGE_ACCOUNT --container-name $CONTAINER --name <blob-name> --file cost-export.csv"
EOFDOWNLOAD

sed -i "s/__STORAGE_ACCOUNT__/$STORAGE_ACCOUNT/g" "$DOWNLOAD_SCRIPT"
sed -i "s/__CONTAINER__/$CONTAINER_NAME/g" "$DOWNLOAD_SCRIPT"
chmod +x "$DOWNLOAD_SCRIPT"

print_info "Created helper script: $DOWNLOAD_SCRIPT"
