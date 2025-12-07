#!/bin/bash

# Azure DNS Zone Setup Script for flamoral.com
# This script creates an Azure DNS Zone and placeholder A records
# Author: Flamoral DevOps Team
# Date: 2025-12-07

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN_NAME="flamoral.com"
RESOURCE_GROUP="flamoral-dating-app-rg"
LOCATION="eastus"
PLACEHOLDER_IP="20.75.0.1"  # Placeholder IP - replace with actual Azure resource IP after deployment

# Function to print colored messages
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

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Function to check if Azure CLI is installed
check_azure_cli() {
    print_info "Checking if Azure CLI is installed..."
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    print_success "Azure CLI is installed"
}

# Function to check if logged into Azure
check_azure_login() {
    print_info "Checking Azure login status..."
    if ! az account show &> /dev/null; then
        print_error "Not logged into Azure. Please run 'az login' first"
        exit 1
    fi

    SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
    SUBSCRIPTION_ID=$(az account show --query id -o tsv)
    print_success "Logged into Azure"
    print_info "Subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"
}

# Function to create resource group if it doesn't exist
create_resource_group() {
    print_info "Checking if resource group '$RESOURCE_GROUP' exists..."

    if az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        print_success "Resource group '$RESOURCE_GROUP' already exists"
    else
        print_warning "Resource group '$RESOURCE_GROUP' does not exist. Creating it..."
        az group create \
            --name "$RESOURCE_GROUP" \
            --location "$LOCATION" \
            --output table
        print_success "Resource group '$RESOURCE_GROUP' created"
    fi
}

# Function to create DNS zone
create_dns_zone() {
    print_info "Checking if DNS zone '$DOMAIN_NAME' exists..."

    if az network dns zone show --resource-group "$RESOURCE_GROUP" --name "$DOMAIN_NAME" &> /dev/null; then
        print_success "DNS zone '$DOMAIN_NAME' already exists"
    else
        print_warning "DNS zone '$DOMAIN_NAME' does not exist. Creating it..."
        az network dns zone create \
            --resource-group "$RESOURCE_GROUP" \
            --name "$DOMAIN_NAME" \
            --output table
        print_success "DNS zone '$DOMAIN_NAME' created"
    fi
}

# Function to get and display nameservers
get_nameservers() {
    print_header "DNS NAMESERVERS"

    print_info "Retrieving nameservers for '$DOMAIN_NAME'..."

    NAMESERVERS=$(az network dns zone show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$DOMAIN_NAME" \
        --query "nameServers" \
        --output tsv)

    print_success "Nameservers retrieved successfully"
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}CONFIGURE THESE NAMESERVERS AT GODADDY${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    COUNTER=1
    while IFS= read -r ns; do
        echo -e "  ${YELLOW}Nameserver $COUNTER:${NC} $ns"
        ((COUNTER++))
    done <<< "$NAMESERVERS"

    echo ""
    echo -e "${YELLOW}INSTRUCTIONS:${NC}"
    echo "1. Go to GoDaddy DNS Management for flamoral.com"
    echo "2. Change nameservers to 'Custom'"
    echo "3. Enter the nameservers listed above"
    echo "4. Save changes"
    echo "5. Wait 24-48 hours for full DNS propagation"
    echo ""
}

# Function to create A record
create_a_record() {
    local RECORD_NAME=$1
    local IP_ADDRESS=$2

    print_info "Checking if A record '$RECORD_NAME' exists..."

    # For root domain, use @ symbol
    if [ "$RECORD_NAME" == "$DOMAIN_NAME" ]; then
        RECORD_SET="@"
    else
        # Extract subdomain (e.g., "www" from "www.flamoral.com")
        RECORD_SET="${RECORD_NAME%.$DOMAIN_NAME}"
    fi

    if az network dns record-set a show \
        --resource-group "$RESOURCE_GROUP" \
        --zone-name "$DOMAIN_NAME" \
        --name "$RECORD_SET" &> /dev/null; then

        print_warning "A record '$RECORD_NAME' already exists. Updating..."
        # Remove old record
        az network dns record-set a remove-record \
            --resource-group "$RESOURCE_GROUP" \
            --zone-name "$DOMAIN_NAME" \
            --record-set-name "$RECORD_SET" \
            --ipv4-address "$IP_ADDRESS" &> /dev/null || true
    fi

    # Create or update record
    az network dns record-set a add-record \
        --resource-group "$RESOURCE_GROUP" \
        --zone-name "$DOMAIN_NAME" \
        --record-set-name "$RECORD_SET" \
        --ipv4-address "$IP_ADDRESS" \
        --ttl 3600 \
        --output none

    print_success "A record created/updated: $RECORD_NAME -> $IP_ADDRESS"
}

# Function to create all DNS records
create_dns_records() {
    print_header "CREATING DNS A RECORDS"

    print_warning "Creating placeholder A records with IP: $PLACEHOLDER_IP"
    print_warning "You will need to update these with your actual Azure resource IPs after deployment"
    echo ""

    # Root domain
    create_a_record "$DOMAIN_NAME" "$PLACEHOLDER_IP"

    # WWW subdomain
    create_a_record "www.$DOMAIN_NAME" "$PLACEHOLDER_IP"

    # API subdomain
    create_a_record "api.$DOMAIN_NAME" "$PLACEHOLDER_IP"

    echo ""
    print_success "All DNS A records created successfully"
}

# Function to display DNS records
display_dns_records() {
    print_header "CURRENT DNS RECORDS"

    print_info "Listing all DNS records for '$DOMAIN_NAME'..."
    echo ""

    az network dns record-set a list \
        --resource-group "$RESOURCE_GROUP" \
        --zone-name "$DOMAIN_NAME" \
        --output table

    echo ""
}

# Function to provide next steps
show_next_steps() {
    print_header "NEXT STEPS"

    echo -e "${YELLOW}1. Configure Nameservers at GoDaddy${NC}"
    echo "   - Update nameservers as shown above"
    echo "   - Wait for DNS propagation (24-48 hours)"
    echo ""
    echo -e "${YELLOW}2. Deploy Azure Resources${NC}"
    echo "   - Deploy your AKS cluster and Application Gateway"
    echo "   - Get the public IP addresses of your resources"
    echo ""
    echo -e "${YELLOW}3. Update DNS A Records${NC}"
    echo "   - Replace placeholder IPs with actual resource IPs"
    echo "   - Use this command to update:"
    echo "     az network dns record-set a add-record \\"
    echo "       --resource-group $RESOURCE_GROUP \\"
    echo "       --zone-name $DOMAIN_NAME \\"
    echo "       --record-set-name <record-name> \\"
    echo "       --ipv4-address <actual-ip>"
    echo ""
    echo -e "${YELLOW}4. Verify DNS Propagation${NC}"
    echo "   - Run: ./scripts/verify-dns-propagation.sh"
    echo "   - This will check nameserver delegation and A record resolution"
    echo ""
    echo -e "${YELLOW}5. Configure SSL/TLS Certificates${NC}"
    echo "   - Set up Let's Encrypt with cert-manager in Kubernetes"
    echo "   - Configure HTTPS redirects in Application Gateway"
    echo ""
}

# Main execution
main() {
    print_header "AZURE DNS ZONE SETUP FOR FLAMORAL.COM"

    # Pre-flight checks
    check_azure_cli
    check_azure_login

    # Create resources
    create_resource_group
    create_dns_zone

    # Get nameservers
    get_nameservers

    # Create DNS records
    create_dns_records

    # Display records
    display_dns_records

    # Show next steps
    show_next_steps

    print_success "DNS zone setup completed successfully!"
}

# Run main function
main
