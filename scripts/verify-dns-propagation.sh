#!/bin/bash

# DNS Propagation Verification Script for flamoral.com
# This script checks DNS configuration, nameserver delegation, and A record resolution
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
SUBDOMAINS=("www" "api")

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

# Function to check if required tools are installed
check_requirements() {
    print_info "Checking required tools..."

    local MISSING_TOOLS=()

    # Check for dig
    if ! command -v dig &> /dev/null; then
        MISSING_TOOLS+=("dig (install bind-utils or dnsutils)")
    fi

    # Check for nslookup
    if ! command -v nslookup &> /dev/null; then
        MISSING_TOOLS+=("nslookup (install bind-utils or dnsutils)")
    fi

    # Check for Azure CLI
    if ! command -v az &> /dev/null; then
        MISSING_TOOLS+=("az (Azure CLI)")
    fi

    if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
        print_error "Missing required tools:"
        for tool in "${MISSING_TOOLS[@]}"; do
            echo "  - $tool"
        done
        exit 1
    fi

    print_success "All required tools are installed"
}

# Function to check Azure login
check_azure_login() {
    print_info "Checking Azure login status..."
    if ! az account show &> /dev/null; then
        print_error "Not logged into Azure. Please run 'az login' first"
        exit 1
    fi
    print_success "Logged into Azure"
}

# Function to get Azure nameservers
get_azure_nameservers() {
    print_info "Retrieving nameservers from Azure DNS Zone..."

    if ! az network dns zone show --resource-group "$RESOURCE_GROUP" --name "$DOMAIN_NAME" &> /dev/null; then
        print_error "DNS zone '$DOMAIN_NAME' not found in Azure. Please run setup-azure-dns.sh first"
        exit 1
    fi

    AZURE_NAMESERVERS=$(az network dns zone show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$DOMAIN_NAME" \
        --query "nameServers" \
        --output tsv)

    print_success "Azure nameservers retrieved"
}

# Function to check nameserver delegation
check_nameserver_delegation() {
    print_header "NAMESERVER DELEGATION CHECK"

    print_info "Checking nameservers configured at domain registrar..."
    echo ""

    # Get current nameservers using dig
    CURRENT_NS=$(dig +short NS "$DOMAIN_NAME" | sort)

    if [ -z "$CURRENT_NS" ]; then
        print_error "No nameservers found for $DOMAIN_NAME"
        print_warning "DNS may not be configured yet or propagation hasn't started"
        echo ""
        echo -e "${YELLOW}Expected Azure Nameservers:${NC}"
        while IFS= read -r ns; do
            echo "  - $ns"
        done <<< "$AZURE_NAMESERVERS"
        return 1
    fi

    echo -e "${BLUE}Current Nameservers (from DNS):${NC}"
    while IFS= read -r ns; do
        echo "  - $ns"
    done <<< "$CURRENT_NS"

    echo ""
    echo -e "${BLUE}Expected Azure Nameservers:${NC}"
    AZURE_NS_ARRAY=()
    while IFS= read -r ns; do
        echo "  - $ns"
        AZURE_NS_ARRAY+=("$ns")
    done <<< "$AZURE_NAMESERVERS"

    echo ""

    # Check if nameservers match
    local ALL_MATCH=true
    for expected_ns in "${AZURE_NS_ARRAY[@]}"; do
        # Remove trailing dot for comparison
        expected_ns_clean="${expected_ns%.}"
        if echo "$CURRENT_NS" | grep -q "$expected_ns_clean"; then
            print_success "Nameserver $expected_ns is correctly configured"
        else
            print_error "Nameserver $expected_ns is NOT configured"
            ALL_MATCH=false
        fi
    done

    echo ""

    if [ "$ALL_MATCH" = true ]; then
        print_success "All Azure nameservers are correctly delegated!"
        return 0
    else
        print_error "Nameserver delegation is incomplete or incorrect"
        print_warning "Please update nameservers at GoDaddy to match Azure nameservers"
        return 1
    fi
}

# Function to check A record resolution
check_a_record() {
    local HOSTNAME=$1

    print_info "Checking A record for: $HOSTNAME"

    # Try to resolve using dig
    local IP=$(dig +short A "$HOSTNAME" | head -n1)

    if [ -z "$IP" ]; then
        print_error "No A record found for $HOSTNAME"
        return 1
    fi

    # Check if it's a valid IP address
    if [[ $IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        print_success "$HOSTNAME -> $IP"
        return 0
    else
        print_error "Invalid IP address returned: $IP"
        return 1
    fi
}

# Function to check all A records
check_all_a_records() {
    print_header "A RECORD RESOLUTION CHECK"

    echo ""

    local ALL_RESOLVED=true

    # Check root domain
    if ! check_a_record "$DOMAIN_NAME"; then
        ALL_RESOLVED=false
    fi

    # Check subdomains
    for subdomain in "${SUBDOMAINS[@]}"; do
        if ! check_a_record "$subdomain.$DOMAIN_NAME"; then
            ALL_RESOLVED=false
        fi
    done

    echo ""

    if [ "$ALL_RESOLVED" = true ]; then
        print_success "All A records are resolving correctly!"
        return 0
    else
        print_warning "Some A records are not resolving yet"
        print_info "This is normal if DNS was recently configured"
        print_info "DNS propagation can take 24-48 hours"
        return 1
    fi
}

# Function to check DNS propagation status globally
check_global_propagation() {
    print_header "GLOBAL DNS PROPAGATION CHECK"

    print_info "Checking DNS resolution from multiple public DNS servers..."
    echo ""

    # Public DNS servers to check
    declare -A DNS_SERVERS=(
        ["Google"]="8.8.8.8"
        ["Cloudflare"]="1.1.1.1"
        ["Quad9"]="9.9.9.9"
        ["OpenDNS"]="208.67.222.222"
    )

    local PROPAGATED_COUNT=0
    local TOTAL_SERVERS=${#DNS_SERVERS[@]}

    for server_name in "${!DNS_SERVERS[@]}"; do
        local server_ip="${DNS_SERVERS[$server_name]}"
        print_info "Querying $server_name ($server_ip)..."

        local result=$(dig @"$server_ip" +short A "$DOMAIN_NAME" 2>/dev/null | head -n1)

        if [ -n "$result" ] && [[ $result =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            print_success "  Resolved: $result"
            ((PROPAGATED_COUNT++))
        else
            print_warning "  Not yet propagated"
        fi
    done

    echo ""
    echo -e "${BLUE}Propagation Status: ${NC}$PROPAGATED_COUNT/$TOTAL_SERVERS servers"

    if [ $PROPAGATED_COUNT -eq $TOTAL_SERVERS ]; then
        print_success "DNS is fully propagated globally!"
        return 0
    elif [ $PROPAGATED_COUNT -gt 0 ]; then
        print_warning "DNS is partially propagated (this is normal)"
        print_info "Wait a few more hours for full global propagation"
        return 1
    else
        print_error "DNS has not propagated yet"
        print_info "If you just configured nameservers, wait 24-48 hours"
        return 1
    fi
}

# Function to check Azure DNS zone records
check_azure_records() {
    print_header "AZURE DNS ZONE RECORDS"

    print_info "Retrieving records from Azure DNS Zone..."
    echo ""

    az network dns record-set a list \
        --resource-group "$RESOURCE_GROUP" \
        --zone-name "$DOMAIN_NAME" \
        --output table

    echo ""
}

# Function to perform reverse DNS lookup
check_reverse_dns() {
    print_header "REVERSE DNS CHECK"

    print_info "Performing reverse DNS lookups..."
    echo ""

    # Get IP for root domain
    local ROOT_IP=$(dig +short A "$DOMAIN_NAME" | head -n1)

    if [ -n "$ROOT_IP" ] && [[ $ROOT_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        print_info "Reverse lookup for $ROOT_IP:"
        local PTR=$(dig +short -x "$ROOT_IP" 2>/dev/null)
        if [ -n "$PTR" ]; then
            echo "  $PTR"
        else
            print_warning "  No PTR record found (this is usually OK for web hosting)"
        fi
    fi

    echo ""
}

# Function to test HTTP/HTTPS connectivity
check_web_connectivity() {
    print_header "WEB CONNECTIVITY CHECK"

    print_info "Testing HTTP/HTTPS connectivity..."
    echo ""

    local URLS=(
        "http://$DOMAIN_NAME"
        "https://$DOMAIN_NAME"
        "http://www.$DOMAIN_NAME"
        "https://www.$DOMAIN_NAME"
        "https://api.$DOMAIN_NAME"
    )

    for url in "${URLS[@]}"; do
        print_info "Testing: $url"
        if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" &>/dev/null; then
            local http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url")
            if [ "$http_code" != "000" ]; then
                print_success "  HTTP $http_code"
            else
                print_warning "  Connection timeout or refused (server may not be running)"
            fi
        else
            print_warning "  Connection failed (this is normal if servers aren't deployed yet)"
        fi
    done

    echo ""
    print_info "If connections are failing, ensure your Azure resources are deployed and running"
}

# Function to generate summary report
generate_summary() {
    print_header "VERIFICATION SUMMARY"

    echo -e "${BLUE}Domain:${NC} $DOMAIN_NAME"
    echo -e "${BLUE}Resource Group:${NC} $RESOURCE_GROUP"
    echo ""

    if [ "$NS_DELEGATION_OK" = true ]; then
        echo -e "${GREEN}✓${NC} Nameserver delegation is correct"
    else
        echo -e "${RED}✗${NC} Nameserver delegation needs attention"
    fi

    if [ "$A_RECORDS_OK" = true ]; then
        echo -e "${GREEN}✓${NC} A records are resolving"
    else
        echo -e "${YELLOW}!${NC} A records are not fully resolved"
    fi

    if [ "$PROPAGATION_OK" = true ]; then
        echo -e "${GREEN}✓${NC} DNS is propagated globally"
    else
        echo -e "${YELLOW}!${NC} DNS propagation is in progress"
    fi

    echo ""

    if [ "$NS_DELEGATION_OK" = true ] && [ "$A_RECORDS_OK" = true ] && [ "$PROPAGATION_OK" = true ]; then
        print_success "DNS is fully configured and propagated!"
        echo ""
        echo -e "${GREEN}Next steps:${NC}"
        echo "  - Deploy your application to Azure"
        echo "  - Configure SSL/TLS certificates"
        echo "  - Update A records with actual resource IPs"
    else
        print_warning "DNS configuration is incomplete or still propagating"
        echo ""
        echo -e "${YELLOW}Recommended actions:${NC}"
        if [ "$NS_DELEGATION_OK" != true ]; then
            echo "  - Update nameservers at GoDaddy"
        fi
        echo "  - Wait for DNS propagation (24-48 hours)"
        echo "  - Run this script again to verify"
    fi

    echo ""
}

# Main execution
main() {
    print_header "DNS PROPAGATION VERIFICATION FOR FLAMORAL.COM"

    # Pre-flight checks
    check_requirements
    check_azure_login

    # Get Azure nameservers
    get_azure_nameservers

    # Check Azure records
    check_azure_records

    # Perform checks
    NS_DELEGATION_OK=false
    A_RECORDS_OK=false
    PROPAGATION_OK=false

    if check_nameserver_delegation; then
        NS_DELEGATION_OK=true
    fi

    if check_all_a_records; then
        A_RECORDS_OK=true
    fi

    if check_global_propagation; then
        PROPAGATION_OK=true
    fi

    # Additional checks
    check_reverse_dns
    check_web_connectivity

    # Generate summary
    generate_summary

    print_success "Verification completed!"
}

# Run main function
main
