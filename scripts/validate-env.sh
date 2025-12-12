#!/bin/bash
# =============================================================================
# Environment Configuration Validation Script for Flamoral Dating Platform
# =============================================================================
# This script validates environment configuration files
# Usage: ./validate-env.sh <environment> [service]
# Example: ./validate-env.sh production user-service
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
SERVICE=${2:-all}
ERROR_COUNT=0
WARNING_COUNT=0

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}Environment Configuration Validation for Flamoral Dating Platform${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Service: ${SERVICE}${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Function to log error
log_error() {
    local message=$1
    echo -e "${RED}✗ ERROR: ${message}${NC}"
    ((ERROR_COUNT++))
}

# Function to log warning
log_warning() {
    local message=$1
    echo -e "${YELLOW}⚠ WARNING: ${message}${NC}"
    ((WARNING_COUNT++))
}

# Function to log success
log_success() {
    local message=$1
    echo -e "${GREEN}✓ ${message}${NC}"
}

# Function to log info
log_info() {
    local message=$1
    echo -e "${BLUE}ℹ ${message}${NC}"
}

# Function to check if variable is set
check_required_var() {
    local var_name=$1
    local var_value=$2
    local allow_empty=${3:-false}

    if [ -z "$var_value" ]; then
        log_error "Required variable ${var_name} is not set"
        return 1
    fi

    if [ "$allow_empty" == "false" ] && [ "$var_value" == "" ]; then
        log_error "Required variable ${var_name} is empty"
        return 1
    fi

    return 0
}

# Function to check for placeholder values
check_placeholder() {
    local var_name=$1
    local var_value=$2

    placeholders=(
        "your-"
        "change-this"
        "replace-with"
        "REPLACE"
        "CHANGE"
        "example"
        "test123"
        "password"
        "secret123"
        "***"
    )

    for placeholder in "${placeholders[@]}"; do
        if [[ "$var_value" == *"$placeholder"* ]]; then
            log_error "${var_name} contains placeholder value: ${placeholder}"
            return 1
        fi
    done

    return 0
}

# Function to validate URL format
validate_url() {
    local var_name=$1
    local url=$2

    if [[ ! "$url" =~ ^https?:// ]]; then
        log_error "${var_name} is not a valid URL: ${url}"
        return 1
    fi

    return 0
}

# Function to validate email format
validate_email() {
    local var_name=$1
    local email=$2

    if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        log_error "${var_name} is not a valid email: ${email}"
        return 1
    fi

    return 0
}

# Function to validate port number
validate_port() {
    local var_name=$1
    local port=$2

    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        log_error "${var_name} is not a valid port number: ${port}"
        return 1
    fi

    return 0
}

# Function to validate secret length
validate_secret_length() {
    local var_name=$1
    local secret=$2
    local min_length=${3:-32}

    if [ ${#secret} -lt $min_length ]; then
        log_error "${var_name} is too short (${#secret} chars, minimum ${min_length})"
        return 1
    fi

    return 0
}

# Function to check database connectivity
check_database_connection() {
    local db_host=$1
    local db_port=$2

    log_info "Testing database connectivity..."

    if command -v pg_isready &> /dev/null; then
        if pg_isready -h "$db_host" -p "$db_port" &> /dev/null; then
            log_success "Database is reachable"
        else
            log_warning "Cannot connect to database at ${db_host}:${db_port}"
        fi
    else
        log_info "pg_isready not available, skipping database connectivity test"
    fi
}

# Function to check redis connectivity
check_redis_connection() {
    local redis_host=$1
    local redis_port=$2

    log_info "Testing Redis connectivity..."

    if command -v redis-cli &> /dev/null; then
        if redis-cli -h "$redis_host" -p "$redis_port" ping &> /dev/null; then
            log_success "Redis is reachable"
        else
            log_warning "Cannot connect to Redis at ${redis_host}:${redis_port}"
        fi
    else
        log_info "redis-cli not available, skipping Redis connectivity test"
    fi
}

# Determine env file path
if [ "$SERVICE" == "all" ]; then
    ENV_FILE="infrastructure/config/.env.${ENVIRONMENT}"
else
    ENV_FILE="backend/services/${SERVICE}/.env.${ENVIRONMENT}"
fi

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    log_error "Environment file not found: ${ENV_FILE}"
    exit 1
fi

log_info "Validating environment file: ${ENV_FILE}"
echo ""

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# ============================================================================
# Validate Core Environment Settings
# ============================================================================
echo -e "${BLUE}[1/10] Validating Core Settings...${NC}"

check_required_var "NODE_ENV" "$NODE_ENV"
check_required_var "ENVIRONMENT" "$ENVIRONMENT"

if [ "$NODE_ENV" == "production" ] && [ "$DEBUG" == "true" ]; then
    log_warning "DEBUG is enabled in production environment"
fi

if [ "$NODE_ENV" == "production" ] && [ "$LOG_LEVEL" == "debug" ]; then
    log_warning "LOG_LEVEL is set to debug in production"
fi

# ============================================================================
# Validate Database Configuration
# ============================================================================
echo -e "${BLUE}[2/10] Validating Database Configuration...${NC}"

check_required_var "DB_HOST" "$DB_HOST"
check_required_var "DB_PORT" "$DB_PORT"
validate_port "DB_PORT" "$DB_PORT"
check_required_var "DB_NAME" "$DB_NAME"
check_required_var "DB_USER" "$DB_USER"

if [ "$ENVIRONMENT" != "development" ]; then
    check_required_var "DB_PASSWORD" "$DB_PASSWORD"
    check_placeholder "DB_PASSWORD" "$DB_PASSWORD"
    validate_secret_length "DB_PASSWORD" "$DB_PASSWORD" 12

    check_required_var "DATABASE_URL" "$DATABASE_URL"
    check_placeholder "DATABASE_URL" "$DATABASE_URL"

    if [ "$DB_SSL" != "true" ]; then
        log_warning "DB_SSL is not enabled in ${ENVIRONMENT} environment"
    fi
fi

# Test database connection
if [ "${CHECK_CONNECTIVITY:-false}" == "true" ]; then
    check_database_connection "$DB_HOST" "$DB_PORT"
fi

# ============================================================================
# Validate Redis Configuration
# ============================================================================
echo -e "${BLUE}[3/10] Validating Redis Configuration...${NC}"

check_required_var "REDIS_HOST" "$REDIS_HOST"
check_required_var "REDIS_PORT" "$REDIS_PORT"
validate_port "REDIS_PORT" "$REDIS_PORT"

if [ "$ENVIRONMENT" != "development" ]; then
    check_required_var "REDIS_PASSWORD" "$REDIS_PASSWORD"
    check_placeholder "REDIS_PASSWORD" "$REDIS_PASSWORD"

    if [ "$REDIS_TLS" != "true" ]; then
        log_warning "REDIS_TLS is not enabled in ${ENVIRONMENT} environment"
    fi
fi

# Test Redis connection
if [ "${CHECK_CONNECTIVITY:-false}" == "true" ]; then
    check_redis_connection "$REDIS_HOST" "$REDIS_PORT"
fi

# ============================================================================
# Validate JWT Configuration
# ============================================================================
echo -e "${BLUE}[4/10] Validating JWT Configuration...${NC}"

check_required_var "JWT_SECRET" "$JWT_SECRET"
check_placeholder "JWT_SECRET" "$JWT_SECRET"
validate_secret_length "JWT_SECRET" "$JWT_SECRET" 64

check_required_var "JWT_ACCESS_SECRET" "$JWT_ACCESS_SECRET"
check_placeholder "JWT_ACCESS_SECRET" "$JWT_ACCESS_SECRET"
validate_secret_length "JWT_ACCESS_SECRET" "$JWT_ACCESS_SECRET" 64

check_required_var "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET"
check_placeholder "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET"
validate_secret_length "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET" 64

# Check if secrets are different
if [ "$JWT_SECRET" == "$JWT_ACCESS_SECRET" ] || [ "$JWT_SECRET" == "$JWT_REFRESH_SECRET" ]; then
    log_error "JWT secrets should be different from each other"
fi

# ============================================================================
# Validate Service Authentication
# ============================================================================
echo -e "${BLUE}[5/10] Validating Service Authentication...${NC}"

check_required_var "SERVICE_API_KEY" "$SERVICE_API_KEY"
check_placeholder "SERVICE_API_KEY" "$SERVICE_API_KEY"
validate_secret_length "SERVICE_API_KEY" "$SERVICE_API_KEY" 64

check_required_var "SESSION_SECRET" "$SESSION_SECRET"
check_placeholder "SESSION_SECRET" "$SESSION_SECRET"
validate_secret_length "SESSION_SECRET" "$SESSION_SECRET" 32

# ============================================================================
# Validate External Services
# ============================================================================
echo -e "${BLUE}[6/10] Validating External Services...${NC}"

# Stripe
if [ "${FEATURE_PAYMENTS:-true}" == "true" ]; then
    check_required_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
    check_required_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"

    if [ "$ENVIRONMENT" == "production" ]; then
        if [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
            log_error "Production environment is using Stripe TEST key"
        fi
    else
        if [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
            log_warning "Non-production environment is using Stripe LIVE key"
        fi
    fi
fi

# SendGrid
if [ -n "$SENDGRID_API_KEY" ]; then
    check_placeholder "SENDGRID_API_KEY" "$SENDGRID_API_KEY"
    check_required_var "SENDGRID_FROM_EMAIL" "$SENDGRID_FROM_EMAIL"
    validate_email "SENDGRID_FROM_EMAIL" "$SENDGRID_FROM_EMAIL"
fi

# Twilio
if [ -n "$TWILIO_ACCOUNT_SID" ]; then
    check_required_var "TWILIO_AUTH_TOKEN" "$TWILIO_AUTH_TOKEN"
    check_placeholder "TWILIO_AUTH_TOKEN" "$TWILIO_AUTH_TOKEN"
fi

# ============================================================================
# Validate Azure Services
# ============================================================================
echo -e "${BLUE}[7/10] Validating Azure Services...${NC}"

if [ -n "$AZURE_STORAGE_ACCOUNT" ]; then
    check_required_var "AZURE_STORAGE_KEY" "$AZURE_STORAGE_KEY"
    check_placeholder "AZURE_STORAGE_KEY" "$AZURE_STORAGE_KEY"
    check_required_var "AZURE_STORAGE_CONNECTION_STRING" "$AZURE_STORAGE_CONNECTION_STRING"
fi

# ============================================================================
# Validate URLs
# ============================================================================
echo -e "${BLUE}[8/10] Validating URLs...${NC}"

if [ -n "$WEB_URL" ]; then
    validate_url "WEB_URL" "$WEB_URL"
fi

if [ -n "$API_URL" ]; then
    validate_url "API_URL" "$API_URL"
fi

# Check HTTPS in production
if [ "$ENVIRONMENT" == "production" ]; then
    if [[ "$WEB_URL" != https://* ]]; then
        log_error "WEB_URL should use HTTPS in production"
    fi
    if [[ "$API_URL" != https://* ]]; then
        log_error "API_URL should use HTTPS in production"
    fi
fi

# ============================================================================
# Validate Security Settings
# ============================================================================
echo -e "${BLUE}[9/10] Validating Security Settings...${NC}"

if [ "$ENVIRONMENT" == "production" ]; then
    # Check CORS
    if [[ "$CORS_ORIGIN" == *"localhost"* ]]; then
        log_error "CORS_ORIGIN contains localhost in production"
    fi

    # Check session security
    if [ "$SESSION_SECURE" != "true" ]; then
        log_error "SESSION_SECURE should be true in production"
    fi

    if [ "$SESSION_HTTP_ONLY" != "true" ]; then
        log_error "SESSION_HTTP_ONLY should be true in production"
    fi

    # Check HSTS
    if [ "${HSTS_MAX_AGE:-0}" -lt 31536000 ]; then
        log_warning "HSTS_MAX_AGE should be at least 31536000 (1 year) in production"
    fi

    # Check bcrypt rounds
    if [ "${BCRYPT_ROUNDS:-10}" -lt 12 ]; then
        log_warning "BCRYPT_ROUNDS should be at least 12 in production"
    fi
fi

# ============================================================================
# Validate Feature Flags
# ============================================================================
echo -e "${BLUE}[10/10] Validating Feature Flags...${NC}"

if [ "$ENVIRONMENT" == "production" ]; then
    if [ "${ENABLE_GRAPHQL_PLAYGROUND:-false}" == "true" ]; then
        log_error "ENABLE_GRAPHQL_PLAYGROUND should be false in production"
    fi

    if [ "${ENABLE_API_DOCS:-false}" == "true" ]; then
        log_warning "ENABLE_API_DOCS is enabled in production"
    fi

    if [ "${ENABLE_DEBUG_LOGGING:-false}" == "true" ]; then
        log_error "ENABLE_DEBUG_LOGGING should be false in production"
    fi

    if [ "${FEATURE_BETA_FEATURES:-false}" == "true" ]; then
        log_warning "FEATURE_BETA_FEATURES is enabled in production"
    fi
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}=====================================================================${NC}"

if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    echo -e "${GREEN}  Configuration is valid for ${ENVIRONMENT} environment${NC}"
    exit 0
elif [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation completed with warnings${NC}"
    echo -e "${YELLOW}  Errors: ${ERROR_COUNT}${NC}"
    echo -e "${YELLOW}  Warnings: ${WARNING_COUNT}${NC}"
    echo ""
    echo -e "${YELLOW}Review warnings before deploying to production${NC}"
    exit 0
else
    echo -e "${RED}✗ Validation failed${NC}"
    echo -e "${RED}  Errors: ${ERROR_COUNT}${NC}"
    echo -e "${YELLOW}  Warnings: ${WARNING_COUNT}${NC}"
    echo ""
    echo -e "${RED}Fix all errors before proceeding${NC}"
    exit 1
fi
