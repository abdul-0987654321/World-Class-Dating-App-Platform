#!/bin/bash
# =============================================================================
# Flamoral Production Environment Validation Script
# =============================================================================
# This script validates that all required environment variables are set
# for production deployment
#
# Usage: ./scripts/validate-env-production.sh [service-name]
# Example: ./scripts/validate-env-production.sh auth-service
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Service to validate (if provided)
SERVICE_NAME=${1:-"all"}

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Flamoral Production Environment Validation${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# =============================================================================
# Helper Functions
# =============================================================================

check_var() {
    local var_name=$1
    local var_value=$2
    local required=${3:-true}
    local min_length=${4:-0}

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -z "$var_value" ]; then
        if [ "$required" = true ]; then
            echo -e "${RED}✗ FAIL${NC} - $var_name is not set (REQUIRED)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        else
            echo -e "${YELLOW}⚠ WARN${NC} - $var_name is not set (OPTIONAL)"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            return 0
        fi
    fi

    # Check for placeholder values
    if [[ "$var_value" == *"INJECT FROM AZURE KEY VAULT"* ]] || \
       [[ "$var_value" == *"STORED_IN_AZURE_KEY_VAULT"* ]] || \
       [[ "$var_value" == "***" ]] || \
       [[ "$var_value" == *"your_"* ]] || \
       [[ "$var_value" == *"CHANGE_ME"* ]] || \
       [[ "$var_value" == *"xxx"* ]]; then
        echo -e "${RED}✗ FAIL${NC} - $var_name contains placeholder value: $var_value"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi

    # Check minimum length
    if [ $min_length -gt 0 ] && [ ${#var_value} -lt $min_length ]; then
        echo -e "${RED}✗ FAIL${NC} - $var_name is too short (minimum $min_length chars, got ${#var_value})"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi

    echo -e "${GREEN}✓ PASS${NC} - $var_name is set (${#var_value} chars)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
}

check_url() {
    local var_name=$1
    local var_value=$2
    local required=${3:-true}

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -z "$var_value" ]; then
        if [ "$required" = true ]; then
            echo -e "${RED}✗ FAIL${NC} - $var_name is not set (REQUIRED)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        else
            return 0
        fi
    fi

    # Check if URL starts with https:// for production
    if [[ ! "$var_value" =~ ^https?:// ]]; then
        echo -e "${RED}✗ FAIL${NC} - $var_name must be a valid URL: $var_value"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi

    # Warn if using http instead of https
    if [[ "$var_value" =~ ^http:// ]] && [[ ! "$var_value" =~ localhost ]]; then
        echo -e "${YELLOW}⚠ WARN${NC} - $var_name uses HTTP instead of HTTPS: $var_value"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    fi

    echo -e "${GREEN}✓ PASS${NC} - $var_name is a valid URL"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
}

# =============================================================================
# Load environment file based on service
# =============================================================================

if [ "$SERVICE_NAME" = "all" ]; then
    echo -e "${BLUE}Validating all services...${NC}"
    echo ""
else
    echo -e "${BLUE}Validating service: $SERVICE_NAME${NC}"
    echo ""

    ENV_FILE="backend/services/$SERVICE_NAME/.env.production"
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}ERROR: Environment file not found: $ENV_FILE${NC}"
        exit 1
    fi

    # Load the environment file
    set -a
    source "$ENV_FILE"
    set +a
fi

# =============================================================================
# Validate Common/Shared Variables
# =============================================================================

echo -e "${BLUE}--- Common Configuration ---${NC}"
check_var "NODE_ENV" "$NODE_ENV" true 0
check_var "PORT" "$PORT" true 0
check_var "LOG_LEVEL" "$LOG_LEVEL" true 0

# =============================================================================
# Validate Database Configuration
# =============================================================================

echo ""
echo -e "${BLUE}--- Database Configuration ---${NC}"
check_var "DB_HOST" "$DB_HOST" true 0
check_var "DB_PORT" "$DB_PORT" true 0
check_var "DB_NAME" "$DB_NAME" true 0
check_var "DB_USER" "$DB_USER" true 0
check_var "DB_PASSWORD" "$DB_PASSWORD" true 32
check_var "DATABASE_URL" "$DATABASE_URL" true 0

# =============================================================================
# Validate Redis Configuration
# =============================================================================

echo ""
echo -e "${BLUE}--- Redis Configuration ---${NC}"
check_var "REDIS_HOST" "$REDIS_HOST" true 0
check_var "REDIS_PORT" "$REDIS_PORT" true 0
check_var "REDIS_PASSWORD" "$REDIS_PASSWORD" true 16

# =============================================================================
# Validate JWT Configuration
# =============================================================================

echo ""
echo -e "${BLUE}--- JWT Configuration ---${NC}"
check_var "JWT_ACCESS_SECRET" "$JWT_ACCESS_SECRET" true 64
check_var "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET" true 64
check_var "JWT_ACCESS_EXPIRES_IN" "$JWT_ACCESS_EXPIRES_IN" true 0
check_var "JWT_REFRESH_EXPIRES_IN" "$JWT_REFRESH_EXPIRES_IN" true 0

# =============================================================================
# Validate Service-to-Service Authentication
# =============================================================================

echo ""
echo -e "${BLUE}--- Service-to-Service Authentication ---${NC}"
check_var "SERVICE_API_KEY" "$SERVICE_API_KEY" true 64

# =============================================================================
# Validate External Services (Service-Specific)
# =============================================================================

if [ "$SERVICE_NAME" = "all" ] || [ "$SERVICE_NAME" = "auth-service" ] || [ "$SERVICE_NAME" = "notification-service" ]; then
    echo ""
    echo -e "${BLUE}--- SendGrid Email Configuration ---${NC}"
    check_var "SENDGRID_API_KEY" "$SENDGRID_API_KEY" true 32
    check_var "SENDGRID_FROM_EMAIL" "$SENDGRID_FROM_EMAIL" true 0
fi

if [ "$SERVICE_NAME" = "all" ] || [ "$SERVICE_NAME" = "payment-service" ]; then
    echo ""
    echo -e "${BLUE}--- Stripe Payment Configuration ---${NC}"
    check_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" true 32
    check_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET" true 32

    # Check if using live keys
    if [[ "$STRIPE_SECRET_KEY" =~ ^sk_live ]]; then
        echo -e "${GREEN}✓ INFO${NC} - Using Stripe LIVE keys (production mode)"
    elif [[ "$STRIPE_SECRET_KEY" =~ ^sk_test ]]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Using Stripe TEST keys in production environment"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    fi
fi

if [ "$SERVICE_NAME" = "all" ] || [ "$SERVICE_NAME" = "media-service" ] || [ "$SERVICE_NAME" = "user-service" ]; then
    echo ""
    echo -e "${BLUE}--- Azure Storage Configuration ---${NC}"
    check_var "AZURE_STORAGE_ACCOUNT" "$AZURE_STORAGE_ACCOUNT" true 0
    check_var "AZURE_STORAGE_KEY" "$AZURE_STORAGE_KEY" true 32
    check_var "AZURE_STORAGE_CONNECTION_STRING" "$AZURE_STORAGE_CONNECTION_STRING" true 0
fi

if [ "$SERVICE_NAME" = "all" ] || [ "$SERVICE_NAME" = "moderation-service" ] || [ "$SERVICE_NAME" = "media-service" ]; then
    echo ""
    echo -e "${BLUE}--- Azure Cognitive Services ---${NC}"
    check_var "AZURE_CONTENT_MODERATOR_KEY" "$AZURE_CONTENT_MODERATOR_KEY" true 32
    check_var "AZURE_CONTENT_MODERATOR_ENDPOINT" "$AZURE_CONTENT_MODERATOR_ENDPOINT" true 0
fi

# =============================================================================
# Validate Monitoring Configuration
# =============================================================================

echo ""
echo -e "${BLUE}--- Monitoring & Observability ---${NC}"
check_var "SENTRY_DSN" "$SENTRY_DSN" true 0
check_var "APPLICATION_INSIGHTS_CONNECTION_STRING" "$APPLICATION_INSIGHTS_CONNECTION_STRING" false 0
check_var "APPLICATION_INSIGHTS_INSTRUMENTATION_KEY" "$APPLICATION_INSIGHTS_INSTRUMENTATION_KEY" false 0

# =============================================================================
# Validate CORS Configuration
# =============================================================================

echo ""
echo -e "${BLUE}--- CORS Configuration ---${NC}"
check_var "CORS_ORIGINS" "$CORS_ORIGINS" true 0

# Check if CORS allows localhost in production
if [[ "$CORS_ORIGINS" == *"localhost"* ]]; then
    echo -e "${YELLOW}⚠ WARN${NC} - CORS_ORIGINS includes localhost in production"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "Total Checks:    ${TOTAL_CHECKS}"
echo -e "${GREEN}Passed:          ${PASSED_CHECKS}${NC}"
echo -e "${RED}Failed:          ${FAILED_CHECKS}${NC}"
echo -e "${YELLOW}Warnings:        ${WARNING_CHECKS}${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    if [ $WARNING_CHECKS -eq 0 ]; then
        echo -e "${GREEN}✓ All validation checks passed!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ Validation passed with warnings. Review warnings before deploying.${NC}"
        exit 0
    fi
else
    echo -e "${RED}✗ Validation failed! Fix the errors above before deploying to production.${NC}"
    exit 1
fi
