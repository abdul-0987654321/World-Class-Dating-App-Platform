#!/bin/bash

# Routing Validation Script
# Validates all routing configurations and files

set -e

echo "=== Flamoral Frontend Routing Validation ==="
echo ""

WEB_APP_PATH="./apps/web-app"
ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if files exist
echo -e "${YELLOW}1. Checking required files...${NC}"

REQUIRED_FILES=(
    "$WEB_APP_PATH/src/App.tsx"
    "$WEB_APP_PATH/src/components/ProtectedRoute.tsx"
    "$WEB_APP_PATH/src/components/ErrorBoundary.tsx"
    "$WEB_APP_PATH/src/components/RouteGuard.tsx"
    "$WEB_APP_PATH/src/utils/routing.ts"
    "$WEB_APP_PATH/src/hooks/useAppNavigation.ts"
    "$WEB_APP_PATH/src/pages/NotFoundPage.tsx"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file (missing)"
        ((ERRORS++))
    fi
done

echo ""

# Check critical page exports
echo -e "${YELLOW}2. Checking page exports...${NC}"

CRITICAL_PAGES=(
    "$WEB_APP_PATH/src/pages/Discovery/DiscoveryPage.tsx"
    "$WEB_APP_PATH/src/pages/Matches/MatchesPage.tsx"
    "$WEB_APP_PATH/src/pages/Messages/MessagesPage.tsx"
    "$WEB_APP_PATH/src/pages/Profile/ProfilePage.tsx"
    "$WEB_APP_PATH/src/pages/Auth/LoginPage.tsx"
    "$WEB_APP_PATH/src/pages/Auth/SignupPage.tsx"
)

for page in "${CRITICAL_PAGES[@]}"; do
    if [ -f "$page" ]; then
        if grep -qE "export\s+(default|const\s+\w+Page)" "$page"; then
            echo -e "  ${GREEN}✓${NC} $(basename $page) has export"
        else
            echo -e "  ${YELLOW}⚠${NC} $(basename $page) export unclear"
            ((WARNINGS++))
        fi
    fi
done

echo ""

# Check Admin index exports
echo -e "${YELLOW}3. Checking Admin page index...${NC}"

ADMIN_INDEX="$WEB_APP_PATH/src/pages/Admin/index.ts"
if [ -f "$ADMIN_INDEX" ]; then
    ADMIN_EXPORTS=(
        "AdminDashboardPage"
        "AdminUsersPage"
        "AdminVerificationsPage"
        "AdminReportsPage"
        "AdminAnalyticsPage"
        "AdminModerationPage"
        "AdminSettingsPage"
    )

    for export in "${ADMIN_EXPORTS[@]}"; do
        if grep -q "$export" "$ADMIN_INDEX"; then
            echo -e "  ${GREEN}✓${NC} $export exported"
        else
            echo -e "  ${YELLOW}⚠${NC} $export not found"
            ((WARNINGS++))
        fi
    done
else
    echo -e "  ${RED}✗${NC} Admin index.ts missing"
    ((ERRORS++))
fi

echo ""

# Check dependencies
echo -e "${YELLOW}4. Checking dependencies...${NC}"

PACKAGE_JSON="$WEB_APP_PATH/package.json"
if [ -f "$PACKAGE_JSON" ]; then
    if grep -q '"react-router-dom"' "$PACKAGE_JSON"; then
        VERSION=$(grep '"react-router-dom"' "$PACKAGE_JSON" | sed 's/.*: "\([^"]*\)".*/\1/')
        echo -e "  ${GREEN}✓${NC} react-router-dom installed: $VERSION"
    else
        echo -e "  ${RED}✗${NC} react-router-dom not found"
        ((ERRORS++))
    fi

    if grep -q '"react"' "$PACKAGE_JSON"; then
        VERSION=$(grep '"react"' "$PACKAGE_JSON" | sed 's/.*: "\([^"]*\)".*/\1/')
        echo -e "  ${GREEN}✓${NC} react installed: $VERSION"
    else
        echo -e "  ${RED}✗${NC} react not found"
        ((ERRORS++))
    fi
else
    echo -e "  ${RED}✗${NC} package.json not found"
    ((ERRORS++))
fi

echo ""

# Check route configuration in App.tsx
echo -e "${YELLOW}5. Checking route configuration...${NC}"

APP_TSX="$WEB_APP_PATH/src/App.tsx"
if [ -f "$APP_TSX" ]; then
    ROUTING_COMPONENTS=(
        "BrowserRouter"
        "Routes"
        "Route"
        "ProtectedRoute"
        "ErrorBoundary"
        "RouteGuard"
        "usePreloadRoutes"
    )

    for component in "${ROUTING_COMPONENTS[@]}"; do
        if grep -q "$component" "$APP_TSX"; then
            echo -e "  ${GREEN}✓${NC} $component"
        else
            echo -e "  ${YELLOW}⚠${NC} $component not found"
            ((WARNINGS++))
        fi
    done
fi

echo ""

# Summary
echo -e "${CYAN}=== Validation Summary ===${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ No critical errors found!${NC}"
else
    echo -e "${RED}✗ Found $ERRORS error(s)${NC}"
fi

echo ""

if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ No warnings!${NC}"
else
    echo -e "${YELLOW}⚠ Found $WARNINGS warning(s)${NC}"
fi

echo ""

# Recommendations
echo -e "${CYAN}=== Next Steps ===${NC}"
echo ""
echo "1. Run TypeScript check:"
echo "   cd apps/web-app && npm run typecheck"
echo ""
echo "2. Run development server:"
echo "   cd apps/web-app && npm run dev"
echo ""
echo "3. Test routing manually:"
echo "   - Navigate to public routes without auth"
echo "   - Try accessing protected routes"
echo "   - Test admin routes"
echo "   - Test 404 page"
echo ""
echo "4. Review documentation:"
echo "   - FRONTEND_ROUTING_FIX_SUMMARY.md"
echo "   - ROUTING_QUICK_REFERENCE.md"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ Routing validation passed! Ready for testing.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation passed with warnings. Review before deployment.${NC}"
    exit 0
else
    echo -e "${RED}✗ Validation failed. Fix errors before proceeding.${NC}"
    exit 1
fi
