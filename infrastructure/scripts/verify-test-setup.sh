#!/bin/bash

# Script to verify testing infrastructure setup
# This checks that all test components are properly configured

set -e

echo "======================================"
echo "Verifying Testing Infrastructure"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS_COUNT=0
FAILURE_COUNT=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        ((SUCCESS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        ((FAILURE_COUNT++))
        return 1
    fi
}

check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        ((SUCCESS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} Directory missing: $1"
        ((FAILURE_COUNT++))
        return 1
    fi
}

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} Command available: $1"
        ((SUCCESS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} Command not found: $1"
        ((FAILURE_COUNT++))
        return 1
    fi
}

echo "1. Checking required commands..."
echo "--------------------------------"
check_command "node"
check_command "npm"
check_command "docker"
check_command "docker-compose"
echo ""

echo "2. Checking Node.js version..."
echo "--------------------------------"
NODE_VERSION=$(node -v)
echo "Node version: $NODE_VERSION"
if [[ "$NODE_VERSION" =~ ^v20 ]] || [[ "$NODE_VERSION" =~ ^v[2-9][0-9] ]]; then
    echo -e "${GREEN}✓${NC} Node.js version is 20 or higher"
    ((SUCCESS_COUNT++))
else
    echo -e "${YELLOW}⚠${NC} Node.js version should be 20 or higher (current: $NODE_VERSION)"
fi
echo ""

echo "3. Checking Docker Compose test file..."
echo "--------------------------------"
check_file "docker-compose.test.yml"
echo ""

echo "4. Checking integration test files..."
echo "--------------------------------"
check_file "backend/tests/jest.config.integration.enhanced.js"
check_file "backend/tests/integration/global-setup.ts"
check_file "backend/tests/integration/global-teardown.ts"
check_directory "backend/tests/integration/helpers"
check_file "backend/tests/integration/helpers/api-client.ts"
check_file "backend/tests/integration/helpers/database.ts"
check_file "backend/tests/integration/helpers/fixtures.ts"
check_file "backend/tests/integration/helpers/test-container.ts"
check_file "backend/tests/integration/helpers/websocket-client.ts"
check_file "backend/tests/integration/README.md"
echo ""

echo "5. Checking E2E test files..."
echo "--------------------------------"
check_file "apps/web-app/e2e/auth.setup.ts"
check_file "apps/web-app/e2e/fixtures/test-helpers.ts"
check_file "apps/web-app/e2e/README.md"
check_directory "apps/web-app/e2e/examples"
echo ""

echo "6. Checking CI/CD pipeline files..."
echo "--------------------------------"
check_file "pipelines/templates/integration-tests.yml"
check_file ".github/workflows/integration-tests.yml"
echo ""

echo "7. Checking documentation..."
echo "--------------------------------"
check_file "TESTING_INFRASTRUCTURE.md"
check_file "TESTING_QUICK_START.md"
echo ""

echo "8. Checking package.json scripts..."
echo "--------------------------------"
if grep -q "test:integration" package.json; then
    echo -e "${GREEN}✓${NC} Found test:integration script"
    ((SUCCESS_COUNT++))
else
    echo -e "${RED}✗${NC} Missing test:integration script in package.json"
    ((FAILURE_COUNT++))
fi

if grep -q "test:e2e" package.json; then
    echo -e "${GREEN}✓${NC} Found test:e2e script"
    ((SUCCESS_COUNT++))
else
    echo -e "${RED}✗${NC} Missing test:e2e script in package.json"
    ((FAILURE_COUNT++))
fi

if grep -q "docker:test:up" package.json; then
    echo -e "${GREEN}✓${NC} Found docker:test:up script"
    ((SUCCESS_COUNT++))
else
    echo -e "${RED}✗${NC} Missing docker:test:up script in package.json"
    ((FAILURE_COUNT++))
fi
echo ""

echo "9. Checking dependencies..."
echo "--------------------------------"
if [ -f "node_modules/.bin/jest" ]; then
    echo -e "${GREEN}✓${NC} Jest installed"
    ((SUCCESS_COUNT++))
else
    echo -e "${YELLOW}⚠${NC} Jest not found - run: npm install"
fi

if [ -f "node_modules/.bin/playwright" ]; then
    echo -e "${GREEN}✓${NC} Playwright installed"
    ((SUCCESS_COUNT++))
else
    echo -e "${YELLOW}⚠${NC} Playwright not found - run: npm install"
fi
echo ""

echo "10. Testing Docker Compose configuration..."
echo "--------------------------------"
if docker-compose -f docker-compose.test.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} docker-compose.test.yml is valid"
    ((SUCCESS_COUNT++))
else
    echo -e "${RED}✗${NC} docker-compose.test.yml has errors"
    ((FAILURE_COUNT++))
fi
echo ""

# Summary
echo "======================================"
echo "Verification Summary"
echo "======================================"
echo -e "Successful checks: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "Failed checks: ${RED}$FAILURE_COUNT${NC}"
echo ""

if [ $FAILURE_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Install dependencies: npm install"
    echo "2. Install Playwright browsers: npx playwright install"
    echo "3. Start test environment: npm run docker:test:up"
    echo "4. Run integration tests: npm run test:integration"
    echo "5. Run E2E tests: npm run test:e2e"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    echo ""
    exit 1
fi
