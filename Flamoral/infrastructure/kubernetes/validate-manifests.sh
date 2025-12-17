#!/bin/bash
#
# Kubernetes Manifests Validation Script
# Flamoral Dating Platform
#
# This script validates all Kubernetes manifests for syntax errors and consistency
#

set -e

echo "========================================"
echo "Flamoral Kubernetes Manifests Validator"
echo "========================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "Step 1: Validating YAML Syntax"
echo "--------------------------------"

# Find all YAML files
YAML_FILES=$(find . -name "*.yaml" -o -name "*.yml" | grep -v node_modules | grep -v ".git")

for file in $YAML_FILES; do
    if command -v yamllint &> /dev/null; then
        if yamllint -d relaxed "$file" > /dev/null 2>&1; then
            print_success "YAML syntax valid: $file"
        else
            print_error "YAML syntax error: $file"
        fi
    else
        print_warning "yamllint not installed, skipping syntax check for $file"
    fi
done

echo ""
echo "Step 2: Validating Kubernetes Schema"
echo "-------------------------------------"

if command -v kubectl &> /dev/null; then
    for file in $YAML_FILES; do
        if kubectl apply --dry-run=client -f "$file" > /dev/null 2>&1; then
            print_success "K8s schema valid: $file"
        else
            print_error "K8s schema error: $file"
            kubectl apply --dry-run=client -f "$file" 2>&1 | head -3
        fi
    done
else
    print_warning "kubectl not installed, skipping K8s validation"
fi

echo ""
echo "Step 3: Checking Namespace Consistency"
echo "---------------------------------------"

# Check for old namespace references
OLD_NAMESPACES=("dating-app" "flamoral" "dating-app-staging" "dating-app-dev")
for ns in "${OLD_NAMESPACES[@]}"; do
    if grep -r "namespace: $ns$" production/ base/ 2>/dev/null; then
        print_error "Found old namespace reference: $ns (should be flamoral-prod, flamoral-staging, or flamoral-dev)"
    fi
done

# Check for correct namespace usage
CORRECT_PROD=$(grep -r "namespace: flamoral-prod" production/ base/ 2>/dev/null | wc -l)
if [ "$CORRECT_PROD" -gt 0 ]; then
    print_success "Found $CORRECT_PROD production namespace references"
else
    print_error "No flamoral-prod namespace references found"
fi

echo ""
echo "Step 4: Validating Service References"
echo "--------------------------------------"

# Expected services
EXPECTED_SERVICES=(
    "api-gateway:4000"
    "auth-service:3001"
    "user-service:3002"
    "messaging-service:3003"
    "payment-service:3005"
    "media-service:3006"
    "analytics-service:3007"
    "moderation-service:3008"
    "matching-service:3009"
    "advertising-service:3011"
    "notification-service:3012"
    "admin-service:3013"
    "automation-service:3014"
    "workflow-engine:3015"
    "policy-service:3016"
    "realtime-service:8081"
)

for service in "${EXPECTED_SERVICES[@]}"; do
    SERVICE_NAME=$(echo "$service" | cut -d: -f1)
    SERVICE_PORT=$(echo "$service" | cut -d: -f2)

    if grep -r "name: $SERVICE_NAME" production/services-all.yaml > /dev/null 2>&1; then
        if grep -A 5 "name: $SERVICE_NAME" production/services-all.yaml | grep "port: $SERVICE_PORT" > /dev/null 2>&1; then
            print_success "Service defined correctly: $SERVICE_NAME on port $SERVICE_PORT"
        else
            print_error "Service $SERVICE_NAME port mismatch (expected $SERVICE_PORT)"
        fi
    else
        print_error "Service not found: $SERVICE_NAME"
    fi
done

echo ""
echo "Step 5: Validating ConfigMap Completeness"
echo "------------------------------------------"

# Required environment variables
REQUIRED_VARS=(
    "NODE_ENV"
    "DATABASE_URL"
    "REDIS_URL"
    "JWT_SECRET"
    "API_GATEWAY_PORT"
    "AUTH_SERVICE_URL"
    "USER_SERVICE_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "$var" base/configmap.yaml || grep -q "$var" base/secrets.yaml; then
        print_success "Environment variable defined: $var"
    else
        print_error "Missing environment variable: $var"
    fi
done

echo ""
echo "Step 6: Checking Ingress Configuration"
echo "---------------------------------------"

# Expected hosts
EXPECTED_HOSTS=(
    "flamoral.com"
    "www.flamoral.com"
    "api.flamoral.com"
    "admin.flamoral.com"
    "ws.flamoral.com"
    "media.flamoral.com"
)

for host in "${EXPECTED_HOSTS[@]}"; do
    if grep -q "host: $host" base/ingress.yaml ingress/ingress-nginx.yaml; then
        print_success "Ingress host configured: $host"
    else
        print_error "Missing ingress host: $host"
    fi
done

echo ""
echo "Step 7: Validating Secret References"
echo "-------------------------------------"

# Check External Secrets configuration
if [ -f "secrets/external-secrets-operator.yaml" ]; then
    print_success "External Secrets Operator configuration found"

    # Check for Azure Key Vault references
    if grep -q "azurekv" secrets/external-secrets-operator.yaml; then
        print_success "Azure Key Vault integration configured"
    else
        print_error "Azure Key Vault integration missing"
    fi
else
    print_error "External Secrets Operator configuration not found"
fi

echo ""
echo "Step 8: Checking Resource Limits"
echo "---------------------------------"

# Check if deployments have resource limits
DEPLOYMENTS=$(find production/deployments -name "*.yaml" -type f)
for deployment in $DEPLOYMENTS; do
    if grep -q "resources:" "$deployment"; then
        if grep -A 5 "resources:" "$deployment" | grep -q "limits:"; then
            print_success "Resource limits defined: $(basename $deployment)"
        else
            print_warning "No resource limits in: $(basename $deployment)"
        fi
    else
        print_error "No resources section in: $(basename $deployment)"
    fi
done

echo ""
echo "Step 9: Validating Health Checks"
echo "---------------------------------"

for deployment in $DEPLOYMENTS; do
    if grep -q "readinessProbe:" "$deployment" && grep -q "livenessProbe:" "$deployment"; then
        print_success "Health checks configured: $(basename $deployment)"
    else
        print_warning "Missing health checks: $(basename $deployment)"
    fi
done

echo ""
echo "Step 10: Checking Security Context"
echo "-----------------------------------"

for deployment in $DEPLOYMENTS; do
    if grep -q "securityContext:" "$deployment"; then
        if grep -A 10 "securityContext:" "$deployment" | grep -q "readOnlyRootFilesystem: true"; then
            print_success "Read-only filesystem enabled: $(basename $deployment)"
        else
            print_warning "Read-only filesystem not set: $(basename $deployment)"
        fi
    else
        print_error "No security context in: $(basename $deployment)"
    fi
done

echo ""
echo "========================================"
echo "Validation Summary"
echo "========================================"
echo ""
echo -e "${GREEN}Successes: $(grep -c '✓' /tmp/validation.log 2>/dev/null || echo 'N/A')${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All critical validations passed!${NC}"
    exit 0
else
    echo -e "${RED}Validation failed with $ERRORS error(s)${NC}"
    exit 1
fi
