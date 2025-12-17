#!/bin/bash
# =============================================================================
# Secret Generation Script for Flamoral Dating Platform
# =============================================================================
# This script generates cryptographically secure secrets for use in .env files
# Usage: ./generate-secrets.sh [--all] [--count N]
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
GENERATE_ALL=false
COUNT=1

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            GENERATE_ALL=true
            shift
            ;;
        --count)
            COUNT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--all] [--count N]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}Secret Generation for Flamoral Dating Platform${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Function to generate secret
generate_secret() {
    local length=${1:-64}
    openssl rand -base64 $((length * 3 / 4)) | tr -d "=+/" | cut -c1-$length
}

# Function to generate hex secret
generate_hex_secret() {
    local length=${1:-64}
    openssl rand -hex $((length / 2))
}

# Function to generate UUID
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        cat /proc/sys/kernel/random/uuid
    fi
}

# Function to display secret
display_secret() {
    local name=$1
    local secret=$2
    local description=$3

    echo -e "${GREEN}${name}${NC}"
    echo -e "${BLUE}${description}${NC}"
    echo -e "${YELLOW}${secret}${NC}"
    echo ""
}

if [ "$GENERATE_ALL" == "true" ]; then
    echo -e "${GREEN}Generating all required secrets...${NC}"
    echo ""

    # JWT Secrets
    echo -e "${BLUE}=== JWT Secrets ===${NC}"
    display_secret "JWT_SECRET" "$(generate_secret 64)" "Main JWT signing secret (64 chars)"
    display_secret "JWT_ACCESS_SECRET" "$(generate_secret 64)" "JWT access token secret (64 chars)"
    display_secret "JWT_REFRESH_SECRET" "$(generate_secret 64)" "JWT refresh token secret (64 chars)"

    # Service Authentication
    echo -e "${BLUE}=== Service Authentication ===${NC}"
    display_secret "SERVICE_API_KEY" "$(generate_secret 64)" "Service-to-service API key (64 chars)"
    display_secret "SESSION_SECRET" "$(generate_secret 32)" "Session encryption secret (32 chars)"

    # Database Passwords
    echo -e "${BLUE}=== Database Secrets ===${NC}"
    display_secret "DB_PASSWORD" "$(generate_secret 32)" "PostgreSQL database password (32 chars)"
    display_secret "MONGODB_PASSWORD" "$(generate_secret 32)" "MongoDB password (32 chars)"

    # Redis
    echo -e "${BLUE}=== Redis Secret ===${NC}"
    display_secret "REDIS_PASSWORD" "$(generate_secret 32)" "Redis password (32 chars)"

    # Encryption Keys
    echo -e "${BLUE}=== Encryption Keys ===${NC}"
    display_secret "ENCRYPTION_KEY" "$(generate_hex_secret 64)" "Data encryption key (64 chars hex)"
    display_secret "ENCRYPTION_IV" "$(generate_hex_secret 32)" "Encryption initialization vector (32 chars hex)"

    # API Keys
    echo -e "${BLUE}=== Generic API Keys ===${NC}"
    display_secret "API_KEY_1" "$(generate_secret 48)" "Generic API key 1 (48 chars)"
    display_secret "API_KEY_2" "$(generate_secret 48)" "Generic API key 2 (48 chars)"

    # Webhook Secrets
    echo -e "${BLUE}=== Webhook Secrets ===${NC}"
    display_secret "WEBHOOK_SECRET_1" "$(generate_secret 64)" "Webhook signing secret 1 (64 chars)"
    display_secret "WEBHOOK_SECRET_2" "$(generate_secret 64)" "Webhook signing secret 2 (64 chars)"

    # UUIDs for IDs
    echo -e "${BLUE}=== UUIDs ===${NC}"
    display_secret "UUID_1" "$(generate_uuid)" "UUID for unique identification"
    display_secret "UUID_2" "$(generate_uuid)" "UUID for unique identification"

else
    echo -e "${GREEN}Generating ${COUNT} secret(s)...${NC}"
    echo ""

    for i in $(seq 1 $COUNT); do
        secret=$(generate_secret 64)
        echo -e "${BLUE}Secret #${i}:${NC}"
        echo -e "${YELLOW}${secret}${NC}"
        echo ""
    done
fi

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${GREEN}Secret generation complete!${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT SECURITY NOTES:${NC}"
echo -e "1. Store these secrets in Azure Key Vault for staging/production"
echo -e "2. Never commit secrets to version control"
echo -e "3. Use different secrets for each environment"
echo -e "4. Rotate secrets regularly (every 90 days recommended)"
echo -e "5. Copy secrets immediately - they won't be shown again"
echo ""
echo -e "${BLUE}To generate specific length secrets:${NC}"
echo -e "  64 chars: openssl rand -base64 48 | tr -d \"=+/\" | cut -c1-64"
echo -e "  32 chars: openssl rand -base64 24 | tr -d \"=+/\" | cut -c1-32"
echo -e "  Hex:      openssl rand -hex 32"
echo ""
echo -e "${BLUE}To generate UUIDs:${NC}"
echo -e "  uuidgen | tr '[:upper:]' '[:lower:]'"
