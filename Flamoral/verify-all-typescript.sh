#!/bin/bash

# Verify all TypeScript builds across Flamoral codebase
# This script attempts to build all TypeScript projects and reports results

set +e  # Don't exit on error - we want to see all results

echo "======================================"
echo "Flamoral TypeScript Build Verification"
echo "======================================"
echo ""

BASE_DIR="C:/Users/citad/OneDrive/Documents/Dating/Flamoral"
cd "$BASE_DIR"

TOTAL=0
SUCCESS=0
FAILED=0
SKIPPED=0

# Function to build and check
check_build() {
    local dir=$1
    local name=$2

    TOTAL=$((TOTAL + 1))

    echo "----------------------------------------"
    echo "[$TOTAL] $name"
    echo "----------------------------------------"

    if [ ! -d "$dir" ]; then
        echo "⚠️  SKIPPED: Directory not found"
        SKIPPED=$((SKIPPED + 1))
        echo ""
        return
    fi

    if [ ! -f "$dir/package.json" ]; then
        echo "⚠️  SKIPPED: No package.json found"
        SKIPPED=$((SKIPPED + 1))
        echo ""
        return
    fi

    cd "$dir"

    # Check if build script exists
    if ! grep -q '"build"' package.json; then
        echo "⚠️  SKIPPED: No build script defined"
        SKIPPED=$((SKIPPED + 1))
        echo ""
        cd "$BASE_DIR"
        return
    fi

    # Try to build
    if npm run build > /dev/null 2>&1; then
        echo "✅ SUCCESS: Built successfully"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "❌ FAILED: Build errors found"
        echo ""
        echo "Running build again to show errors:"
        npm run build 2>&1 | grep -E "error TS|Error:" | head -10
        FAILED=$((FAILED + 1))
    fi

    echo ""
    cd "$BASE_DIR"
}

echo "Starting verification of all TypeScript projects..."
echo ""

# Backend Shared
echo "========================================="
echo "BACKEND SHARED PACKAGES"
echo "========================================="
echo ""

check_build "$BASE_DIR/backend/shared" "Backend Shared Package"

# Backend Services
echo "========================================="
echo "BACKEND SERVICES"
echo "========================================="
echo ""

check_build "$BASE_DIR/backend/services/admin-service" "Admin Service"
check_build "$BASE_DIR/backend/services/advertising-service" "Advertising Service"
check_build "$BASE_DIR/backend/services/analytics-service" "Analytics Service"
check_build "$BASE_DIR/backend/services/api-gateway" "API Gateway"
check_build "$BASE_DIR/backend/services/auth-service" "Auth Service"
check_build "$BASE_DIR/backend/services/automation-service" "Automation Service"
check_build "$BASE_DIR/backend/services/matching-service" "Matching Service"
check_build "$BASE_DIR/backend/services/media-service" "Media Service"
check_build "$BASE_DIR/backend/services/messaging-service" "Messaging Service"
check_build "$BASE_DIR/backend/services/moderation-service" "Moderation Service"
check_build "$BASE_DIR/backend/services/notification-service" "Notification Service"
check_build "$BASE_DIR/backend/services/payment-service" "Payment Service"
check_build "$BASE_DIR/backend/services/policy-service" "Policy Service"
check_build "$BASE_DIR/backend/services/realtime-service" "Realtime Service"
check_build "$BASE_DIR/backend/services/user-service" "User Service"
check_build "$BASE_DIR/backend/services/workflow-engine" "Workflow Engine"

# Frontend Apps
echo "========================================="
echo "FRONTEND APPS"
echo "========================================="
echo ""

check_build "$BASE_DIR/apps/web-app" "Web App"
check_build "$BASE_DIR/apps/mobile-app" "Mobile App"

# Shared Packages
echo "========================================="
echo "SHARED PACKAGES"
echo "========================================="
echo ""

check_build "$BASE_DIR/packages/shared/types" "Shared Types"
check_build "$BASE_DIR/packages/shared/utils" "Shared Utils"
check_build "$BASE_DIR/packages/shared/constants" "Shared Constants"
check_build "$BASE_DIR/packages/shared/validators" "Shared Validators"
check_build "$BASE_DIR/packages/shared/api-client" "Shared API Client"

# Summary
echo "========================================="
echo "VERIFICATION SUMMARY"
echo "========================================="
echo ""
echo "Total projects checked: $TOTAL"
echo "✅ Successful builds:   $SUCCESS"
echo "❌ Failed builds:       $FAILED"
echo "⚠️  Skipped:            $SKIPPED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All TypeScript projects compiled successfully!"
    echo ""
    exit 0
else
    echo "⚠️  Some projects failed to compile. Review the errors above."
    echo ""
    echo "Common fixes:"
    echo "  1. Run: cd backend/shared && npm run build"
    echo "  2. Run: cd backend/services/payment-service && npm install"
    echo "  3. Run the fix script: bash fix-all-typescript-errors.sh"
    echo ""
    exit 1
fi
