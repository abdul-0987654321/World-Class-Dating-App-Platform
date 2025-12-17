#!/bin/bash

# Comprehensive TypeScript error checker for Flamoral codebase
# This script checks all TypeScript files across the entire project

set -e

echo "======================================"
echo "Flamoral TypeScript Error Check"
echo "======================================"
echo ""

ERRORS_FOUND=0

# Function to check TypeScript compilation
check_typescript() {
    local dir=$1
    local name=$2

    echo "----------------------------------------"
    echo "Checking: $name"
    echo "Directory: $dir"
    echo "----------------------------------------"

    if [ ! -d "$dir" ]; then
        echo "⚠️  Directory not found: $dir"
        echo ""
        return
    fi

    if [ ! -f "$dir/tsconfig.json" ]; then
        echo "⚠️  No tsconfig.json found in $dir"
        echo ""
        return
    fi

    cd "$dir"

    if npx tsc --noEmit 2>&1 | tee /tmp/tsc_output.log; then
        echo "✅ No TypeScript errors found"
    else
        echo "❌ TypeScript errors found!"
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
        echo ""
        echo "Error details:"
        cat /tmp/tsc_output.log | grep "error TS" | head -20
    fi

    echo ""
    cd - > /dev/null
}

# Base directory
BASE_DIR="C:/Users/citad/OneDrive/Documents/Dating/Flamoral"
cd "$BASE_DIR"

echo "Starting TypeScript checks across entire codebase..."
echo ""

# Check backend shared package
check_typescript "$BASE_DIR/backend/shared" "Backend Shared Package"

# Check backend services
echo "========================================="
echo "BACKEND SERVICES"
echo "========================================="
echo ""

check_typescript "$BASE_DIR/backend/services/auth-service" "Auth Service"
check_typescript "$BASE_DIR/backend/services/matching-service" "Matching Service"
check_typescript "$BASE_DIR/backend/services/messaging-service" "Messaging Service"
check_typescript "$BASE_DIR/backend/services/payment-service" "Payment Service"
check_typescript "$BASE_DIR/backend/services/notification-service" "Notification Service"
check_typescript "$BASE_DIR/backend/services/user-service" "User Service"
check_typescript "$BASE_DIR/backend/services/analytics-service" "Analytics Service"
check_typescript "$BASE_DIR/backend/services/advertising-service" "Advertising Service"
check_typescript "$BASE_DIR/backend/services/api-gateway" "API Gateway"
check_typescript "$BASE_DIR/backend/services/realtime-service" "Realtime Service"
check_typescript "$BASE_DIR/backend/services/media-service" "Media Service"
check_typescript "$BASE_DIR/backend/services/moderation-service" "Moderation Service"
check_typescript "$BASE_DIR/backend/services/admin-service" "Admin Service"
check_typescript "$BASE_DIR/backend/services/policy-service" "Policy Service"
check_typescript "$BASE_DIR/backend/services/automation-service" "Automation Service"
check_typescript "$BASE_DIR/backend/services/workflow-engine" "Workflow Engine"

# Check frontend apps
echo "========================================="
echo "FRONTEND APPS"
echo "========================================="
echo ""

check_typescript "$BASE_DIR/apps/web-app" "Web App"

# Check shared packages
echo "========================================="
echo "SHARED PACKAGES"
echo "========================================="
echo ""

check_typescript "$BASE_DIR/packages/shared/types" "Shared Types"
check_typescript "$BASE_DIR/packages/shared/utils" "Shared Utils"
check_typescript "$BASE_DIR/packages/shared/constants" "Shared Constants"
check_typescript "$BASE_DIR/packages/shared/validators" "Shared Validators"
check_typescript "$BASE_DIR/packages/shared/api-client" "Shared API Client"

# Summary
echo ""
echo "======================================"
echo "TypeScript Check Summary"
echo "======================================"
echo ""

if [ $ERRORS_FOUND -eq 0 ]; then
    echo "✅ All TypeScript checks passed!"
    echo ""
    exit 0
else
    echo "❌ Found errors in $ERRORS_FOUND package(s)"
    echo ""
    echo "Please review the errors above and fix them."
    exit 1
fi
