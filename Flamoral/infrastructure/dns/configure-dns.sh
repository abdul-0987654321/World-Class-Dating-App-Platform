#!/bin/bash
# =============================================================================
# Azure DNS Configuration Script for flamoral.com
# =============================================================================
# This script creates Azure DNS Zone and A records using Azure CLI
# =============================================================================

set -e

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-flamoral-prod-rg}"
DOMAIN_NAME="${DOMAIN_NAME:-flamoral.com}"
TARGET_IP="${TARGET_IP:-48.200.65.15}"
TTL="${TTL:-300}"
LOCATION="${LOCATION:-eastus}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}=============================================================================${NC}"
echo -e "${CYAN}Azure DNS Configuration for ${DOMAIN_NAME}${NC}"
echo -e "${CYAN}=============================================================================${NC}"
echo ""

# Check if Azure CLI is installed
echo -e "${YELLOW}Checking Azure CLI installation...${NC}"
if ! command -v az &> /dev/null; then
    echo -e "${RED}ERROR: Azure CLI is not installed${NC}"
    echo -e "${RED}Please install from: https://docs.microsoft.com/cli/azure/install-azure-cli${NC}"
    exit 1
fi

AZ_VERSION=$(az version --query '"azure-cli"' -o tsv)
echo -e "${GREEN}Azure CLI version: ${AZ_VERSION}${NC}"

# Login check
echo ""
echo -e "${YELLOW}Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Not logged in. Please login to Azure...${NC}"
    az login
fi

ACCOUNT_NAME=$(az account show --query user.name -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo -e "${GREEN}Logged in as: ${ACCOUNT_NAME}${NC}"
echo -e "${GREEN}Subscription: ${SUBSCRIPTION_NAME}${NC}"

# Check if resource group exists
echo ""
echo -e "${YELLOW}Checking resource group: ${RESOURCE_GROUP}...${NC}"
if ! az group exists --name "${RESOURCE_GROUP}" | grep -q "true"; then
    echo -e "${YELLOW}Resource group does not exist. Creating...${NC}"
    az group create \
        --name "${RESOURCE_GROUP}" \
        --location "${LOCATION}" \
        --tags Environment=production ManagedBy=script
    echo -e "${GREEN}Resource group created successfully${NC}"
else
    echo -e "${GREEN}Resource group exists${NC}"
fi

# Create DNS Zone
echo ""
echo -e "${YELLOW}Creating DNS Zone: ${DOMAIN_NAME}...${NC}"
if ! az network dns zone show \
    --name "${DOMAIN_NAME}" \
    --resource-group "${RESOURCE_GROUP}" &> /dev/null; then

    az network dns zone create \
        --name "${DOMAIN_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --tags Environment=production ManagedBy=script

    echo -e "${GREEN}DNS Zone created successfully${NC}"
else
    echo -e "${YELLOW}DNS Zone already exists${NC}"
fi

# Get name servers
echo ""
echo -e "${CYAN}DNS Zone Name Servers:${NC}"
NAME_SERVERS=$(az network dns zone show \
    --name "${DOMAIN_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --query "nameServers" -o tsv)

for NS in ${NAME_SERVERS}; do
    echo -e "  ${WHITE}- ${NS}${NC}"
done

echo ""
echo -e "${YELLOW}IMPORTANT: Update these name servers at your domain registrar!${NC}"
echo ""

# Function to create or update A record
create_a_record() {
    local RECORD_NAME=$1
    local IP=$2
    local DESCRIPTION=$3

    echo -e "${YELLOW}Configuring A record: ${DESCRIPTION}...${NC}"

    if ! az network dns record-set a show \
        --name "${RECORD_NAME}" \
        --zone-name "${DOMAIN_NAME}" \
        --resource-group "${RESOURCE_GROUP}" &> /dev/null; then

        # Create new record
        az network dns record-set a create \
            --name "${RECORD_NAME}" \
            --zone-name "${DOMAIN_NAME}" \
            --resource-group "${RESOURCE_GROUP}" \
            --ttl "${TTL}"

        az network dns record-set a add-record \
            --record-set-name "${RECORD_NAME}" \
            --zone-name "${DOMAIN_NAME}" \
            --resource-group "${RESOURCE_GROUP}" \
            --ipv4-address "${IP}"
    else
        # Update existing record
        az network dns record-set a update \
            --name "${RECORD_NAME}" \
            --zone-name "${DOMAIN_NAME}" \
            --resource-group "${RESOURCE_GROUP}" \
            --set aRecords[0].ipv4Address="${IP}" \
            --set ttl="${TTL}"
    fi

    echo -e "  ${GREEN}${DESCRIPTION} → ${IP} (TTL: ${TTL})${NC}"
}

# Create A Records
echo ""
echo -e "${CYAN}Creating A Records...${NC}"
create_a_record "@" "${TARGET_IP}" "${DOMAIN_NAME}"
create_a_record "www" "${TARGET_IP}" "www.${DOMAIN_NAME}"
create_a_record "api" "${TARGET_IP}" "api.${DOMAIN_NAME}"
create_a_record "admin" "${TARGET_IP}" "admin.${DOMAIN_NAME}"

# Create CAA records for Let's Encrypt
echo ""
echo -e "${YELLOW}Creating CAA records for Let's Encrypt...${NC}"

if ! az network dns record-set caa show \
    --name "@" \
    --zone-name "${DOMAIN_NAME}" \
    --resource-group "${RESOURCE_GROUP}" &> /dev/null; then

    # Create CAA record set
    az network dns record-set caa create \
        --name "@" \
        --zone-name "${DOMAIN_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --ttl 3600

    # Add issue record
    az network dns record-set caa add-record \
        --record-set-name "@" \
        --zone-name "${DOMAIN_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --flags 0 \
        --tag "issue" \
        --value "letsencrypt.org"

    # Add issuewild record
    az network dns record-set caa add-record \
        --record-set-name "@" \
        --zone-name "${DOMAIN_NAME}" \
        --resource-group "${RESOURCE_GROUP}" \
        --flags 0 \
        --tag "issuewild" \
        --value "letsencrypt.org"

    echo -e "${GREEN}CAA records created successfully${NC}"
else
    echo -e "${YELLOW}CAA records already exist${NC}"
fi

# Summary
echo ""
echo -e "${CYAN}=============================================================================${NC}"
echo -e "${GREEN}DNS Configuration Complete!${NC}"
echo -e "${CYAN}=============================================================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${WHITE}1. Update your domain registrar with the name servers listed above${NC}"
echo -e "${WHITE}2. Wait 24-48 hours for DNS propagation${NC}"
echo -e "${WHITE}3. Verify DNS resolution:${NC}"
echo -e "   ${WHITE}nslookup ${DOMAIN_NAME}${NC}"
echo -e "   ${WHITE}nslookup www.${DOMAIN_NAME}${NC}"
echo -e "   ${WHITE}nslookup api.${DOMAIN_NAME}${NC}"
echo -e "   ${WHITE}nslookup admin.${DOMAIN_NAME}${NC}"
echo ""

# Display current DNS records
echo -e "${CYAN}Current DNS Records:${NC}"
az network dns record-set a list \
    --zone-name "${DOMAIN_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --output table
echo ""
